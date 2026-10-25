"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Project,
  Task,
  User,
  Notification,
  BoardColumn,
  RealtimeEvent,
  TaskPriority,
  ActivityLog,
  WorkspaceRole,
} from "@/lib/types";
import { ProjectRole } from "@/lib/rbac/permissions";
import { Navbar } from "@/components/layout/navbar";
import { FilterBar, FilterState } from "@/components/views/filter-bar";
import { KanbanBoard } from "@/components/board/kanban-board";
import { ListView } from "@/components/views/list-view";
import { CalendarView } from "@/components/views/calendar-view";
import { ActivityLogView } from "@/components/activity/activity-log";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { CommandPalette } from "@/components/search/command-palette";
import { useRealtimeSubscription } from "@/lib/realtime/client";
import { Label } from "@/lib/types";

export function ProjectClientView({
  project,
  initialTasks,
  currentUser,
  effectiveAccess,
  workspaceMembers = [],
  notifications,
  activities,
}: {
  project: Project;
  initialTasks: Task[];
  currentUser: User;
  effectiveAccess?: {
    accessLevel: "MANAGE" | "WRITE" | "READ";
    projectRole: ProjectRole;
    workspaceRole: WorkspaceRole;
    workspaceId: string;
  };
  workspaceMembers?: { user: User; role: string; id: string; userId: string }[];
  notifications: Notification[];
  activities: ActivityLog[];
}) {
  const router = useRouter();
  const isReadOnlyMode = effectiveAccess
    ? effectiveAccess.accessLevel === "READ"
    : !currentUser.role || currentUser.role === "VIEWER";
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [columns] = useState<BoardColumn[]>(project.columns || []);
  const [currentView, setCurrentView] = useState<"board" | "list" | "calendar" | "activity">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
  const taskDetailsCache = useRef<Map<string, Task>>(new Map());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load task details on-demand when opening modal
  const handleOpenTaskDetail = useCallback(async (task: Task) => {
    // If task already has complete details loaded, display it immediately
    if (task.comments && task.attachments && task.description !== undefined) {
      setSelectedTask(task);
      return;
    }

    const cached = taskDetailsCache.current.get(task.id);
    if (cached && cached.comments && cached.attachments) {
      setSelectedTask(cached);
      return;
    }

    // Open modal immediately with available lightweight summary (0ms perceived lag)
    setSelectedTask(task);
    setIsLoadingTaskDetails(true);

    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      if (res.ok) {
        const fullTask: Task = await res.json();
        taskDetailsCache.current.set(task.id, fullTask);
        setSelectedTask((current) => {
          if (current && current.id === task.id) {
            return fullTask;
          }
          return current;
        });
      }
    } catch (err) {
      console.error("[Task Details Fetch Error]:", err);
    } finally {
      setIsLoadingTaskDetails(false);
    }
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assigneeId: null,
    priority: null,
    labelId: null,
  });

  // Real-time updates subscription
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "task:created": {
        setTasks((prev) => {
          if (prev.some((t) => t.id === event.payload.task.id)) return prev;
          return [...prev, event.payload.task];
        });
        break;
      }
      case "task:updated": {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== event.payload.task.id) return t;
            if (t.updatedAt && event.payload.task.updatedAt) {
              if (new Date(t.updatedAt).getTime() > new Date(event.payload.task.updatedAt).getTime()) {
                return t;
              }
            }
            return event.payload.task;
          })
        );
        setSelectedTask((prev) =>
          prev && prev.id === event.payload.task.id ? event.payload.task : prev
        );
        break;
      }
      case "task:moved": {
        const { taskId, destColumnId, newPosition } = event.payload;
        setTasks((prev) => {
          const task = prev.find((t) => t.id === taskId);
          if (!task) return prev;

          const updated = prev.map((t) => {
            if (t.id === taskId) {
              return { ...t, columnId: destColumnId, position: newPosition };
            }
            return t;
          });
          return updated;
        });
        break;
      }
      case "task:deleted": {
        setTasks((prev) => prev.filter((t) => t.id !== event.payload.taskId));
        setSelectedTask((prev) =>
          prev && prev.id === event.payload.taskId ? null : prev
        );
        break;
      }
      case "comment:created": {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === event.payload.taskId) {
              const existing = t.comments || [];
              if (existing.some((c) => c.id === event.payload.comment.id)) return t;
              return { ...t, comments: [...existing, event.payload.comment] };
            }
            return t;
          })
        );
        setSelectedTask((prev) => {
          if (prev && prev.id === event.payload.taskId) {
            const existing = prev.comments || [];
            if (existing.some((c) => c.id === event.payload.comment.id)) return prev;
            return { ...prev, comments: [...existing, event.payload.comment] };
          }
          return prev;
        });
        break;
      }
      case "project:deleted": {
        if (event.payload.projectId === project.id) {
          router.push("/workspaces");
          router.refresh();
        }
        break;
      }
    }
  }, [project.id, router]);

  const { isConnected, transport } = useRealtimeSubscription(
    `project-${project.id}`,
    handleRealtimeEvent
  );

  // Centralized optimistic mutation helper with automatic rollback
  const mutateTask = useCallback(
    async (
      optimisticUpdate: (prev: Task[]) => Task[],
      apiCall: () => Promise<Response>,
      onSuccess?: (data: unknown) => void
    ) => {
      const prevTasks = [...tasks];
      const prevSelected = selectedTask;

      setTasks(optimisticUpdate);

      try {
        const res = await apiCall();
        if (!res.ok) {
          // Revert optimistic changes on non-OK response (400, 401, 403, 404, 500)
          setTasks(prevTasks);
          setSelectedTask(prevSelected);
          const errData = await res.json().catch(() => ({}));
          console.error("[Mutation Error]:", errData.error || res.statusText);
          return false;
        }

        const data = await res.json().catch(() => null);
        if (onSuccess) onSuccess(data);
        return true;
      } catch (err) {
        // Revert on network exception
        setTasks(prevTasks);
        setSelectedTask(prevSelected);
        console.error("[Mutation Network Error]:", err);
        return false;
      }
    },
    [tasks, selectedTask]
  );

  // Optimistic Card Move with central rollback
  const handleTaskMove = async (taskId: string, destColumnId: string, newPosition: number) => {
    await mutateTask(
      (prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, columnId: destColumnId, position: newPosition } : t
        ),
      () =>
        fetch(`/api/tasks/${taskId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destColumnId, newPosition }),
        })
    );
  };

  // Update Task with central rollback
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    await mutateTask(
      (prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      () =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }),
      (data) => {
        const updatedTask = data as Task | null;
        if (updatedTask && updatedTask.id) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(updatedTask);
          }
        }
      }
    );
  };

  // Create Task
  const handleCreateTask = async (data: {
    columnId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    assigneeIds: string[];
    labelIds: string[];
    dueDate?: string | null;
  }) => {
    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projectId: project.id,
        }),
      });
      if (res.ok) {
        const newTask = await res.json();
        // Client deduplication
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [...prev, newTask];
        });
      } else {
        console.error("[Create Task Error]:", res.statusText);
      }
    } catch (err) {
      console.error("[Create Task Network Error]:", err);
    }
  };

  // Quick Add task from Column bottom
  const handleQuickAdd = async (columnId: string, title: string) => {
    await handleCreateTask({
      columnId,
      title,
      description: "",
      priority: "MEDIUM",
      assigneeIds: [currentUser.id],
      labelIds: [],
    });
  };

  // Delete Task with central rollback
  const handleDeleteTask = async (taskId: string) => {
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
    taskDetailsCache.current.delete(taskId);

    await mutateTask(
      (prev) => prev.filter((t) => t.id !== taskId),
      () => fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    );
  };

  // Comments
  const handleAddComment = async (taskId: string, content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const comment = await res.json();
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            const existing = t.comments || [];
            if (existing.some((c) => c.id === comment.id)) return t;
            return {
              ...t,
              comments: [...existing, comment],
              _count: {
                ...t._count,
                comments: (t._count?.comments || existing.length) + 1,
              },
            };
          })
        );
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) => {
            if (!prev) return null;
            const existing = prev.comments || [];
            if (existing.some((c) => c.id === comment.id)) return prev;
            const updated = { ...prev, comments: [...existing, comment] };
            taskDetailsCache.current.set(taskId, updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("[Add Comment Error]:", err);
    }
  };

  // Checklists with central rollback
  const handleToggleChecklistItem = async (taskId: string, checklistId: string, itemId: string) => {
    await mutateTask(
      (prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const newChecklists = (t.checklists || []).map((c) => {
            if (c.id !== checklistId) return c;
            return {
              ...c,
              items: (c.items || []).map((item) =>
                item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
              ),
            };
          });
          return { ...t, checklists: newChecklists };
        }),
      () =>
        fetch(`/api/tasks/${taskId}/checklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle", checklistId, itemId }),
        })
    );
  };

  const handleAddChecklistItem = async (taskId: string, checklistId: string, content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", checklistId, content }),
      });
      if (res.ok) {
        const { task: updated } = await res.json();
        if (updated) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          taskDetailsCache.current.set(taskId, updated);
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(updated);
          }
        }
      }
    } catch (err) {
      console.error("[Add Checklist Item Error]:", err);
    }
  };

  // Attachments
  const handleAddAttachment = async (
    taskId: string,
    fileOrData: File | FormData | { name: string; fileUrl: string; fileType: string; fileSize: number }
  ) => {
    try {
      let res: Response;
      if (fileOrData instanceof File) {
        const formData = new FormData();
        formData.append("file", fileOrData);
        res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: formData,
        });
      } else if (fileOrData instanceof FormData) {
        res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: fileOrData,
        });
      } else {
        res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fileOrData),
        });
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to upload image attachment");
      }

      if (result.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? result.task : t)));
        taskDetailsCache.current.set(taskId, result.task);
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(result.task);
        }
      }
    } catch (err) {
      console.error("[Add Attachment Error]:", err);
      throw err;
    }
  };

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete attachment");
      }
      if (result.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? result.task : t)));
        taskDetailsCache.current.set(taskId, result.task);
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(result.task);
        }
      }
    } catch (err) {
      console.error("[Delete Attachment Error]:", err);
      throw err;
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          task.title.toLowerCase().includes(q) ||
          task.taskKey.toLowerCase().includes(q) ||
          (task.description && task.description.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Priority
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Assignee
      if (
        filters.assigneeId &&
        !task.assignees?.some((a) => a.user.id === filters.assigneeId)
      ) {
        return false;
      }

      // Label
      if (
        filters.labelId &&
        !task.labels?.some((l) => l.label.id === filters.labelId)
      ) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  const projectUsers: User[] = useMemo(() => {
    const userMap = new Map<string, User>();
    if (currentUser?.id) userMap.set(currentUser.id, currentUser);
    if (project.lead) userMap.set(project.lead.id, project.lead);
    tasks.forEach((t) => {
      if (t.reporter) userMap.set(t.reporter.id, t.reporter);
      t.assignees?.forEach((a) => {
        if (a.user) userMap.set(a.user.id, a.user);
      });
    });
    return Array.from(userMap.values());
  }, [project, tasks, currentUser]);

  const projectLabels: Label[] = useMemo(() => {
    const labelMap = new Map<string, Label>();
    tasks.forEach((t) => {
      t.labels?.forEach((l) => {
        if (l.label) labelMap.set(l.label.id, l.label);
      });
    });
    if (labelMap.size > 0) return Array.from(labelMap.values());
    return [
      { id: "lbl-1", workspaceId: project.workspaceId, name: "Backend", color: "#6366f1" },
      { id: "lbl-2", workspaceId: project.workspaceId, name: "Frontend", color: "#06b6d4" },
      { id: "lbl-3", workspaceId: project.workspaceId, name: "DevOps", color: "#10b981" },
      { id: "lbl-4", workspaceId: project.workspaceId, name: "Bug", color: "#ef4444" },
      { id: "lbl-5", workspaceId: project.workspaceId, name: "Feature", color: "#8b5cf6" },
      { id: "lbl-6", workspaceId: project.workspaceId, name: "Security", color: "#f59e0b" },
    ];
  }, [tasks, project.workspaceId]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        project={project}
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenCreateTask={() => setIsCreateOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        notifications={notifications}
        isRealtimeConnected={isConnected}
        realtimeTransport={transport}
        effectiveAccess={effectiveAccess}
        workspaceMembers={workspaceMembers}
      />

      {/* Filter Bar (for Board, List, Calendar views) */}
      {currentView !== "activity" && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          users={projectUsers}
          labels={projectLabels}
          totalTasks={tasks.length}
          filteredCount={filteredTasks.length}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === "board" && (
          <KanbanBoard
            columns={columns}
            tasks={filteredTasks}
            currentUser={currentUser}
            onTaskClick={(t) => setSelectedTask(t)}
            onTaskMove={handleTaskMove}
            onQuickAdd={handleQuickAdd}
            readOnly={isReadOnlyMode}
          />
        )}

        {currentView === "list" && (
          <ListView
            columns={columns}
            tasks={filteredTasks}
            currentUser={currentUser}
            onTaskClick={(t) => setSelectedTask(t)}
            onUpdateTask={handleUpdateTask}
            readOnly={isReadOnlyMode}
          />
        )}

        {currentView === "calendar" && (
          <CalendarView
            tasks={filteredTasks}
            onTaskClick={(t) => setSelectedTask(t)}
          />
        )}

        {currentView === "activity" && (
          <ActivityLogView
            activities={activities}
            onTaskClick={(taskId) => {
              const target = tasks.find((t) => t.id === taskId);
              if (target) setSelectedTask(target);
            }}
          />
        )}
      </main>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        columns={columns}
        currentUser={currentUser}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddComment={handleAddComment}
        onToggleChecklistItem={handleToggleChecklistItem}
        onAddChecklistItem={handleAddChecklistItem}
        onAddAttachment={handleAddAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        users={projectUsers}
        labels={projectLabels}
        readOnly={isReadOnlyMode}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        columns={columns}
        currentUser={currentUser}
        onClose={() => setIsCreateOpen(false)}
        onCreateTask={handleCreateTask}
        users={projectUsers}
        labels={projectLabels}
      />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        tasks={tasks}
        project={project}
        onSelectTask={(t) => setSelectedTask(t)}
        onSelectView={setCurrentView}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

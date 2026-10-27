"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  workspaceLabels = [],
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
  workspaceLabels?: Label[];
  notifications: Notification[];
  activities: ActivityLog[];
}) {
  const router = useRouter();
  const isReadOnlyMode = effectiveAccess
    ? effectiveAccess.accessLevel === "READ"
    : !currentUser.role || currentUser.role === "VIEWER";
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const knownTaskColumns = useRef(new Map(initialTasks.map((task) => [task.id, task.columnId])));
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(
      (project.columns || []).map((column) => [
        column.id,
        column._count?.tasks ?? column.tasks.length,
      ])
    )
  );
  const [searchState, setSearchState] = useState<{
    query: string;
    tasks: Task[];
    error: boolean;
  } | null>(null);
  const [columns] = useState<BoardColumn[]>(project.columns || []);
  const [currentView, setCurrentView] = useState<"board" | "list" | "calendar" | "activity">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const taskDetailsCache = useRef<Map<string, Task>>(new Map());
  const [tasksByColumnHasMore, setTasksByColumnHasMore] = useState<Record<string, boolean>>(
    () => Object.fromEntries(
      (project.columns || []).map((column) => [
        column.id,
        (column._count?.tasks ?? column.tasks.length) > column.tasks.length,
      ])
    )
  );
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(() => new Set());
  const loadingColumnsRef = useRef(new Set<string>());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const updateTaskCount = useCallback((columnId: string, delta: number) => {
    setTaskCounts((previous) => ({
      ...previous,
      [columnId]: Math.max(0, (previous[columnId] ?? 0) + delta),
    }));
  }, []);

  // Load task details on-demand when opening modal
  const handleOpenTaskDetail = useCallback(async (task: Task) => {
    knownTaskColumns.current.set(task.id, task.columnId);
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
    setLoadingTaskId(task.id);

    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      if (!res.ok) {
        throw new Error(`Task details request failed (${res.status})`);
      }
      const fullTask: Task = await res.json();
      taskDetailsCache.current.set(task.id, fullTask);
      setTasks((previous) => previous.map((existing) => existing.id === fullTask.id ? fullTask : existing));
      setSelectedTask((current) => current?.id === task.id ? fullTask : current);
    } catch (err) {
      console.error("[Task Details Fetch Error]:", err);
    } finally {
      setLoadingTaskId((current) => current === task.id ? null : current);
    }
  }, []);

  const loadMoreTasks = useCallback(async (columnId: string) => {
    if (loadingColumnsRef.current.has(columnId) || !tasksByColumnHasMore[columnId]) return;
    loadingColumnsRef.current.add(columnId);
    setLoadingColumns(new Set(loadingColumnsRef.current));

    try {
      const loadedInColumn = tasks
        .filter((task) => task.columnId === columnId)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
      const lastTask = loadedInColumn[loadedInColumn.length - 1];
      const query = new URLSearchParams({ projectId: project.id, columnId });
      if (lastTask) {
        query.set("afterPosition", String(lastTask.position));
        query.set("afterId", lastTask.id);
      }

      const response = await fetch(`/api/tasks?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Loading project tasks failed (${response.status})`);
      }
      const page: { tasks: Task[]; hasMore: boolean } = await response.json();
      for (const task of page.tasks) {
        knownTaskColumns.current.set(task.id, task.columnId);
      }
      setTasks((previous) => {
        const existingIds = new Set(previous.map((task) => task.id));
        return [...previous, ...page.tasks.filter((task) => !existingIds.has(task.id))];
      });
      setTasksByColumnHasMore((previous) => ({ ...previous, [columnId]: page.hasMore }));
    } catch (error) {
      console.error("[Task Page Fetch Error]:", error);
    } finally {
      loadingColumnsRef.current.delete(columnId);
      setLoadingColumns(new Set(loadingColumnsRef.current));
    }
  }, [project.id, tasks, tasksByColumnHasMore]);

  const loadMoreTasksForCurrentView = useCallback(async () => {
    await Promise.all(
      Object.entries(tasksByColumnHasMore)
        .filter(([, hasMore]) => hasMore)
        .map(([columnId]) => loadMoreTasks(columnId))
    );
  }, [loadMoreTasks, tasksByColumnHasMore]);

  const searchProjectTasks = useCallback(async (searchTerm: string): Promise<Task[]> => {
    const query = new URLSearchParams({
      projectId: project.id,
      search: searchTerm,
    });
    const response = await fetch(`/api/tasks?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Task search failed (${response.status})`);
    }
    const result: { tasks: Task[] } = await response.json();
    return result.tasks;
  }, [project.id]);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assigneeId: null,
    priority: null,
    labelId: null,
  });

  useEffect(() => {
    const searchTerm = filters.search.trim();
    if (!searchTerm) return;

    let isCurrent = true;
    searchProjectTasks(searchTerm)
      .then((results) => {
        if (isCurrent) {
          for (const task of results) {
            knownTaskColumns.current.set(task.id, task.columnId);
          }
          setSearchState({ query: searchTerm, tasks: results, error: false });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          console.error("[Task Search Error]:", error);
          setSearchState({ query: searchTerm, tasks: [], error: true });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [filters.search, searchProjectTasks]);

  // Real-time updates subscription
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "task:created": {
        if (!knownTaskColumns.current.has(event.payload.task.id)) {
          knownTaskColumns.current.set(event.payload.task.id, event.payload.task.columnId);
          updateTaskCount(event.payload.task.columnId, 1);
        }
        setTasks((prev) => {
          if (prev.some((t) => t.id === event.payload.task.id)) return prev;
          return [...prev, event.payload.task];
        });
        break;
      }
      case "task:updated": {
        taskDetailsCache.current.set(event.payload.task.id, event.payload.task);
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
        const sourceColumnId = knownTaskColumns.current.get(taskId);
        if (sourceColumnId && sourceColumnId !== destColumnId) {
          knownTaskColumns.current.set(taskId, destColumnId);
          updateTaskCount(sourceColumnId, -1);
          updateTaskCount(destColumnId, 1);
        }
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
        const deletedColumnId = knownTaskColumns.current.get(event.payload.taskId);
        if (deletedColumnId) {
          knownTaskColumns.current.delete(event.payload.taskId);
          updateTaskCount(deletedColumnId, -1);
        }
        taskDetailsCache.current.delete(event.payload.taskId);
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
  }, [project.id, router, updateTaskCount]);

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
        }),
      (data) => {
        const result = data as { task?: Task } | null;
        if (!result?.task) return;
        const movedTask = result.task;
        const sourceColumnId = knownTaskColumns.current.get(taskId);
        if (sourceColumnId && sourceColumnId !== movedTask.columnId) {
          knownTaskColumns.current.set(taskId, movedTask.columnId);
          updateTaskCount(sourceColumnId, -1);
          updateTaskCount(movedTask.columnId, 1);
        }
        taskDetailsCache.current.delete(taskId);
        setTasks((previous) => previous.map((task) => task.id === taskId ? movedTask : task));
      }
    );
  };

  // Update Task with central rollback
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    const { assignees, labels, ...taskFields } = updates;
    const requestUpdates = {
      ...taskFields,
      ...(assignees !== undefined ? { assigneeIds: assignees.map(({ user }) => user.id) } : {}),
      ...(labels !== undefined ? { labelIds: labels.map(({ label }) => label.id) } : {}),
    };

    await mutateTask(
      (prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      () =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestUpdates),
        }),
      (data) => {
        const updatedTask = data as Task | null;
        if (updatedTask && updatedTask.id) {
          taskDetailsCache.current.set(updatedTask.id, updatedTask);
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
        if (!knownTaskColumns.current.has(newTask.id)) {
          knownTaskColumns.current.set(newTask.id, newTask.columnId);
          updateTaskCount(newTask.columnId, 1);
        }
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

    const deletedColumnId = knownTaskColumns.current.get(taskId);
    await mutateTask(
      (prev) => prev.filter((t) => t.id !== taskId),
      () => fetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
      () => {
        if (!deletedColumnId) return;
        knownTaskColumns.current.delete(taskId);
        updateTaskCount(deletedColumnId, -1);
      }
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
    const allTasks = new Map(tasks.map((task) => [task.id, task]));
    const searchTerm = filters.search.trim();
    if (searchTerm && searchState?.query === searchTerm) {
      for (const task of searchState.tasks) allTasks.set(task.id, task);
    }

    return Array.from(allTasks.values()).filter((task) => {
      // Search
      if (filters.search) {
        const q = searchTerm.toLowerCase();
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
  }, [tasks, searchState, filters]);

  const projectUsers: User[] = useMemo(() => {
    const userMap = new Map<string, User>();
    if (currentUser?.id) userMap.set(currentUser.id, currentUser);
    workspaceMembers.forEach((member) => userMap.set(member.user.id, member.user));
    if (project.lead) userMap.set(project.lead.id, project.lead);
    tasks.forEach((t) => {
      if (t.reporter) userMap.set(t.reporter.id, t.reporter);
      t.assignees?.forEach((a) => {
        if (a.user) userMap.set(a.user.id, a.user);
      });
    });
    return Array.from(userMap.values());
  }, [project, tasks, currentUser, workspaceMembers]);

  const projectLabels: Label[] = useMemo(() => {
    if (workspaceLabels.length > 0) return workspaceLabels;
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
  }, [tasks, project.workspaceId, workspaceLabels]);

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
          totalTasks={project._count?.tasks ?? tasks.length}
          filteredCount={filteredTasks.length}
          searchError={
            searchState?.query === filters.search.trim() && searchState.error
              ? "Task search is temporarily unavailable."
              : undefined
          }
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === "board" && (
          <KanbanBoard
            columns={columns}
            tasks={filteredTasks}
            tasksByColumnHasMore={tasksByColumnHasMore}
            taskCounts={taskCounts}
            loadingColumns={loadingColumns}
            onLoadMore={loadMoreTasks}
            currentUser={currentUser}
            onTaskClick={handleOpenTaskDetail}
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
            onTaskClick={handleOpenTaskDetail}
            onUpdateTask={handleUpdateTask}
            readOnly={isReadOnlyMode}
          />
        )}

        {currentView === "calendar" && (
          <CalendarView
            tasks={filteredTasks}
            onTaskClick={handleOpenTaskDetail}
          />
        )}

        {currentView === "activity" && (
          <ActivityLogView
            activities={activities}
            onTaskClick={(taskId) => {
              const target = tasks.find((t) => t.id === taskId);
              if (target) handleOpenTaskDetail(target);
            }}
          />
        )}
        {currentView !== "board" && currentView !== "activity" &&
          Object.values(tasksByColumnHasMore).some(Boolean) && (
            <div className="flex justify-center border-t border-slate-200 dark:border-slate-800 p-3">
              <button
                type="button"
                onClick={loadMoreTasksForCurrentView}
                disabled={loadingColumns.size > 0}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                {loadingColumns.size > 0 ? "Loading tasks..." : "Load more tasks"}
              </button>
            </div>
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
        isLoadingDetails={Boolean(selectedTask && loadingTaskId === selectedTask.id)}
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
        onSearchTasks={searchProjectTasks}
        onSelectTask={handleOpenTaskDetail}
        onSelectView={setCurrentView}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

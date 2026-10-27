"use client";

import { useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { BoardColumn as ColumnType, Task, User, WorkspaceRole } from "@/lib/types";
import { BoardColumn } from "./board-column";
import { isReadOnly } from "@/lib/rbac/permissions";

export function KanbanBoard({
  columns,
  tasks,
  taskCounts,
  tasksByColumnHasMore,
  loadingColumns,
  onLoadMore,
  currentUser,
  onTaskClick,
  onTaskMove,
  onQuickAdd,
  readOnly: readOnlyProp,
}: {
  columns: ColumnType[];
  tasks: Task[];
  taskCounts?: Record<string, number>;
  tasksByColumnHasMore?: Record<string, boolean>;
  loadingColumns?: Set<string>;
  onLoadMore?: (columnId: string) => void;
  currentUser: User;
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, destColumnId: string, newPosition: number) => Promise<void>;
  onQuickAdd: (columnId: string, title: string) => Promise<void>;
  readOnly?: boolean;
}) {
  // Fail closed: if readOnly prop is passed use it; otherwise check workspace role
  const readOnly =
    readOnlyProp !== undefined
      ? readOnlyProp
      : !currentUser.role || isReadOnly(currentUser.role as WorkspaceRole);

  const handleDragEnd = async (result: DropResult) => {
    if (readOnly) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    await onTaskMove(draggableId, destination.droppableId, destination.index);
  };

  // Memoize column grouping and sorting
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }
    for (const task of tasks) {
      const list = map.get(task.columnId);
      if (list) {
        list.push(task);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [columns, tasks]);

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-slate-50/50 dark:bg-slate-950">
      {readOnly && (
        <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex items-center justify-between">
          <span>You are viewing this board in <strong>Read-Only Mode</strong>. Only assigned project contributors, squad members, and workspace admins can add or move cards.</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex items-start gap-4 min-h-[calc(100vh-180px)] pb-8">
          {columns.map((column) => {
            const columnTasks = tasksByColumn.get(column.id) || [];

            return (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                taskCount={taskCounts?.[column.id]}
                hasMoreTasks={tasksByColumnHasMore?.[column.id]}
                isLoadingMore={loadingColumns?.has(column.id)}
                onLoadMore={() => onLoadMore?.(column.id)}
                isDragDisabled={readOnly}
                onTaskClick={onTaskClick}
                onQuickAdd={onQuickAdd}
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Task } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/utils";

export function CalendarView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const priorityColors = {
    URGENT: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    HIGH: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
    MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    LOW: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  };

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  // Memoize task grouping by day to eliminate 31x redundant iterations and timezone bugs
  const tasksByDay = useMemo(() => {
    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();
    const map = new Map<number, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = parseLocalDate(t.dueDate);
      if (d && d.getFullYear() === curYear && d.getMonth() === curMonth) {
        const day = d.getDate();
        const list = map.get(day) || [];
        list.push(t);
        map.set(day, list);
      }
    }
    return map;
  }, [tasks, currentDate]);

  return (
    <div className="flex-1 flex flex-col p-6 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {monthName}
          </h3>
          <Button variant="outline" size="sm" onClick={resetToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 text-center text-xs font-semibold text-slate-400 py-2.5 bg-slate-50 dark:bg-slate-800/40">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {/* Empty cells for leading days */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 bg-slate-50/30 dark:bg-slate-950/20 min-h-[110px]" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const isToday = isCurrentMonth && now.getDate() === dayNumber;
            const dayTasks = tasksByDay.get(dayNumber) || [];

            return (
              <div
                key={`day-${dayNumber}`}
                className={`p-2 min-h-[110px] flex flex-col justify-between transition-colors ${
                  isToday ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                    </span>
                  )}
                </div>

                {/* Day Tasks List */}
                <div className="space-y-1 overflow-y-auto max-h-[85px] pr-1">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={`text-[10px] p-1.5 rounded-lg border truncate font-medium cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs ${
                        priorityColors[t.priority] || priorityColors.MEDIUM
                      }`}
                    >
                      <span className="font-mono text-[9px] opacity-75 mr-1">
                        {t.taskKey}
                      </span>
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

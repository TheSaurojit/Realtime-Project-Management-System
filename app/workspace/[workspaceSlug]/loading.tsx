export default function WorkspaceLoading() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-900 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-32 bg-indigo-200 dark:bg-indigo-950/60 rounded-xl" />
        </div>
      </div>

      {/* Board columns skeleton */}
      <div className="flex-1 flex items-start gap-4 pt-6 overflow-hidden">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="w-80 shrink-0 h-[600px] bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="h-24 bg-white dark:bg-slate-950 rounded-xl p-3 shadow-xs space-y-2"
              >
                <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-slate-900 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-900 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

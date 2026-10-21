"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Workspace Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        An error occurred while loading this workspace view. You can try refreshing the component or return to your workspaces.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/workspaces")}>
          Back to Workspaces
        </Button>
        <Button size="sm" onClick={() => reset()}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

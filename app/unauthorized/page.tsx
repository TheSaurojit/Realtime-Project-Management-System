import Link from "next/link";
import { ShieldAlert, ArrowLeft, ArrowRight, Home } from "lucide-react";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; user?: string }>;
}) {
  const { workspace, user } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            HTTP 403 • Access Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            Workspace Access Denied
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {user ? (
              <>
                You are currently signed in as <strong>{user}</strong>, but your account is not an authorized member of workspace{" "}
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  /{workspace || "unknown"}
                </span>
                .
              </>
            ) : (
              <>You do not have sufficient permissions to view or collaborate in this workspace.</>
            )}
          </p>
        </div>

        {/* Info Box */}
        <div className="text-left bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            Why am I seeing this?
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>Your account has not been invited to this workspace.</li>
            <li>Your membership in this workspace may have been revoked.</li>
            <li>The workspace slug in the URL might be misspelled.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Link
            href="/workspaces"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 group"
          >
            <span>Go to Your Workspaces</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Switch Account
            </Link>

            <Link
              href="/"
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <Home className="w-3.5 h-3.5" /> Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

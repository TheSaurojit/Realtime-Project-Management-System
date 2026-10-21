"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Users2,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const errorParam = searchParams.get("error") || "";
  const invitedEmail = searchParams.get("invitedEmail") || "";
  const currentEmail = searchParams.get("currentEmail") || "";
  const workspaceName = searchParams.get("workspaceName") || "Workspace";
  const role = searchParams.get("role") || "MEMBER";
  const inviterName = searchParams.get("inviterName") || "A workspace admin";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(errorParam);

  const handleAccept = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Successfully accepted, navigate to workspace
      router.push(`/workspace/${data.workspace.slug}`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to accept invitation.");
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    }
    const loginUrl = `/login?redirect=${encodeURIComponent(`/api/workspace/invite?token=${token}`)}&email=${encodeURIComponent(invitedEmail)}`;
    router.push(loginUrl);
  };

  // If there's an error and no token to accept
  if (errorMessage && (!token || !currentEmail)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Invitation Notice
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
              Unable to Join Workspace
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="text-left bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">What can I do?</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>If you already accepted, you can go straight to your dashboard.</li>
              <li>If the link expired, ask the workspace owner to re-send the invite.</li>
              <li>Make sure you are logged in with the email address that received the invite.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/workspaces"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 group"
            >
              <span>Go to Your Workspaces</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/login"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Sign In with Different Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Account mismatch or pending acceptance screen
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Users2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            Workspace Invitation
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            Join {workspaceName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>{inviterName}</strong> invited you to join as a{" "}
            <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase">
              {role}
            </span>
            .
          </p>
        </div>

        {/* Email Mismatch Notice */}
        {invitedEmail && currentEmail && invitedEmail.toLowerCase() !== currentEmail.toLowerCase() && (
          <div className="text-left bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-2 text-amber-800 dark:text-amber-200">
            <p className="font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Different Account Detected
            </p>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300 leading-relaxed">
              This invitation was addressed to <strong>{invitedEmail}</strong>, but you are currently signed in as <strong>{currentEmail}</strong>.
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              You can accept and join using your current account, or switch to the intended email.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={isLoading || !token}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Joining Workspace...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>
                  {currentEmail && invitedEmail && currentEmail.toLowerCase() !== invitedEmail.toLowerCase()
                    ? `Accept as ${currentEmail}`
                    : "Accept Invitation & Join"}
                </span>
              </>
            )}
          </Button>

          {invitedEmail && currentEmail && invitedEmail.toLowerCase() !== currentEmail.toLowerCase() && (
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Switch to {invitedEmail}</span>
            </button>
          )}

          <Link
            href="/workspaces"
            className="block text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors"
          >
            Decline or return to my workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}

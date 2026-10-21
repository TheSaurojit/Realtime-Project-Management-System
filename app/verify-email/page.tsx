"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get("token");
  const statusParam = searchParams.get("status");
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");
  const redirectParam = searchParams.get("redirect") || "/workspaces";

  const [state, setState] = useState<"loading" | "success" | "error" | "pending">(
    tokenParam ? "loading" : statusParam === "success" ? "success" : errorParam ? "error" : "pending"
  );
  const [errorMessage, setErrorMessage] = useState<string>(errorParam || "");
  const [resendEmail, setResendEmail] = useState<string>(emailParam || "");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      // Automatic token verification
      fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenParam }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            setState("success");
            setTimeout(() => {
              router.push(data.redirectUrl || redirectParam);
              router.refresh();
            }, 1800);
          } else {
            setState("error");
            setErrorMessage(data.error || "Failed to verify email.");
          }
        })
        .catch(() => {
          setState("error");
          setErrorMessage("Network error occurred during verification.");
        });
    } else if (statusParam === "success") {
      const timer = setTimeout(() => {
        router.push(redirectParam);
        router.refresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tokenParam, statusParam, redirectParam, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || "A fresh verification link has been sent to your email.");
      } else {
        setErrorMessage(data.error || "Failed to resend verification email.");
      }
    } catch {
      setErrorMessage("Network error occurred while resending email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            SyncBoard
          </span>
        </Link>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          {state === "loading" && (
            <div className="space-y-4 py-6">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Verifying your email...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please wait while we validate your verification token and set up your workspace session.
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4 py-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Email Verified Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your email address has been verified. You now have full access to your collaborative workspaces and projects.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => router.push(redirectParam)}
                  className="w-full"
                  size="md"
                >
                  Enter Workspace Now <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-5 py-4 animate-in fade-in">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Verification Failed
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                {errorMessage || "The verification link is invalid, has already been used, or has expired."}
              </p>

              {/* Resend Form */}
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Request a new verification link:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  size="sm"
                  isLoading={isResending}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Resend Verification Link
                </Button>
              </form>

              {resendMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  {resendMessage}
                </p>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  ← Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {state === "pending" && (
            <div className="space-y-5 py-4 animate-in fade-in">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Check Your Email
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                We&apos;ve sent a verification link to{" "}
                {emailParam ? (
                  <strong className="text-slate-900 dark:text-white">{emailParam}</strong>
                ) : (
                  "your registered email address"
                )}
                . Please click the link inside to verify your account and activate your workspace.
              </p>

              <form onSubmit={handleResend} className="space-y-3 pt-3 text-left">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Didn&apos;t receive the email?
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email to resend"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  size="sm"
                  isLoading={isResending}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Resend Verification Email
                </Button>
              </form>

              {resendMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  {resendMessage}
                </p>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  ← Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Layers, Eye, EyeOff, Shield, Lock, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { WorkspaceRole } from "@/lib/types";
import { ROLE_COLORS } from "@/lib/rbac/permissions";

const DEMO_USERS: {
  id: string;
  email: string;
  name: string;
  role: WorkspaceRole;
}[] = [
    {
      id: "user-1",
      email: "alex@acme.io",
      name: "Alex Rivera",
      role: "OWNER",
    },
    {
      id: "user-2",
      email: "sarah@acme.io",
      name: "Sarah Chen",
      role: "ADMIN",
    },
    {
      id: "user-3",
      email: "marcus@acme.io",
      name: "Marcus Vance",
      role: "MEMBER",
    },
    {
      id: "user-4",
      email: "elena@acme.io",
      name: "Elena Rostova",
      role: "VIEWER",
    },
  ];

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerificationRequired(false);
    setIsLoading(true);

    const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
    const payload = mode === "signin"
      ? { email: email.trim(), password, redirect: redirectParam }
      : { name: name.trim(), email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.emailVerificationRequired) {
          setIsVerificationRequired(true);
          setUnverifiedEmail(data.email || email.trim());
        }
        setError(data.error || "Authentication failed. Please try again.");
        return;
      }

      // If signup requires verification, route to the verification landing page
      if (data.emailVerificationRequired) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email || email.trim())}`);
        return;
      }

      router.push(data.redirectUrl || redirectParam || "/workspaces");
      router.refresh();
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setIsVerificationRequired(false);
    setEmail(demoEmail);
    setPassword("password123");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123", redirect: redirectParam }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Demo login failed.");
        return;
      }

      router.push(data.redirectUrl || redirectParam || "/workspaces");
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            SyncBoard
          </span>
        </Link>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {mode === "signin" ? "Sign in to your account" : "Create your workspace account"}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {mode === "signin"
            ? "Enter your credentials or use a 1-click test persona below"
            : "Get started with your collaborative project workspace in seconds"}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === "signin"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === "signup"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsVerificationRequired(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold ml-2"
                >
                  ×
                </button>
              </div>
              {isVerificationRequired && (
                <div className="pt-1 border-t border-rose-200/60 dark:border-rose-800/60">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    Click here to resend verification email →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Jordan Lee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="md"
              isLoading={isLoading}
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {/* 1-Click Quick Demo Login Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> 1-Click Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400">pw: password123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickDemoLogin(user.email)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition-all cursor-pointer group"
                >
                  <Avatar user={user} size="xs" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                      {user.name.split(" ")[0]}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1 py-0.1 rounded border ${ROLE_COLORS[user.role || "VIEWER"]
                        }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}


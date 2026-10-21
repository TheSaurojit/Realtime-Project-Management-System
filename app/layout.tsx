import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncBoard Realtime | Team Project Management Platform",
  description: "A Jira & Trello style workspace for high-velocity teams to plan, track, and collaborate in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

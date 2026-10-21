import { notFound, redirect } from "next/navigation";
import { getWorkspaceSidebarData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  // Use lightweight query that only fetches sidebar essentials instead of the entire task tree
  const workspace = await getWorkspaceSidebarData(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const isMember =
    workspace.ownerId === currentUser.id ||
    Boolean(workspace.members?.some((m) => m.userId === currentUser.id));

  if (!isMember) {
    redirect(
      `/unauthorized?workspace=${encodeURIComponent(workspaceSlug)}&user=${encodeURIComponent(
        currentUser.name || currentUser.email
      )}`
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar workspace={workspace} currentUser={currentUser} />

      {/* Main workspace content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { getWorkspaceSidebarData, getActivityLogs } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ActivityLogView } from "@/components/activity/activity-log";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canViewActivityLog } from "@/lib/rbac/permissions";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceSidebarData(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Only OWNER and ADMIN are permitted to access workspace activity audit log
  const access = await requireWorkspaceAccess(currentUser.id, workspace.id);
  if (!access || !canViewActivityLog(access.role)) {
    if (workspace.projects && workspace.projects.length > 0) {
      redirect(`/workspace/${workspaceSlug}/project/${workspace.projects[0].key}`);
    }
    redirect(`/workspaces`);
  }

  // Strictly scoped to the current workspace
  const activities = await getActivityLogs({ workspaceId: workspace.id, limit: 100 });

  return <ActivityLogView activities={activities} />;
}


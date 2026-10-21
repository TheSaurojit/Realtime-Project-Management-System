import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { WorkspaceSettingsView } from "@/components/settings/workspace-settings";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageMembers } from "@/lib/rbac/permissions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Only OWNER and ADMIN are permitted to access workspace settings
  const access = await requireWorkspaceAccess(currentUser.id, workspace.id);
  if (!access || !canManageMembers(access.role)) {
    redirect(`/workspaces`);
  }

  return (
    <WorkspaceSettingsView
      workspace={workspace}
      currentUser={currentUser}
    />
  );
}

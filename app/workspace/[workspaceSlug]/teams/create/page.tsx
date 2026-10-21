import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageTeams } from "@/lib/rbac/permissions";
import { CreateTeamView } from "@/components/teams/create-team-view";

export default async function CreateTeamPage({
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

  // Only OWNER and ADMIN can create teams and assign members
  const access = await requireWorkspaceAccess(currentUser.id, workspace.id);
  if (!access || !canManageTeams(access.role)) {
    redirect(
      workspace.projects && workspace.projects.length > 0
        ? `/workspace/${workspaceSlug}/project/${workspace.projects[0].key}`
        : `/workspaces`
    );
  }

  return <CreateTeamView workspace={workspace} currentUser={currentUser} />;
}

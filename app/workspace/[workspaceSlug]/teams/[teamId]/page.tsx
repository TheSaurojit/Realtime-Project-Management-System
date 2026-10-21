import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug, getTeamById } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageTeams } from "@/lib/rbac/permissions";
import { TeamDetailView } from "@/components/teams/team-detail-view";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
}) {
  const { workspaceSlug, teamId } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const access = await requireWorkspaceAccess(currentUser.id, workspace.id);
  if (!access) {
    redirect("/workspaces");
  }

  const team = await getTeamById(teamId, workspace.id);
  if (!team) {
    notFound();
  }

  const canManage = canManageTeams(access.role);

  return (
    <TeamDetailView
      key={team.id}
      team={team as unknown as Parameters<typeof TeamDetailView>[0]["team"]}
      workspace={workspace}
      currentUser={currentUser}
      canManage={canManage}
    />
  );
}

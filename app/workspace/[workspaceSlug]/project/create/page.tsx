import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canCreateProject } from "@/lib/rbac/permissions";
import { CreateProjectView } from "@/components/project/create-project-view";

export default async function CreateProjectPage({
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

  // Enforce RBAC: OWNER, ADMIN, MEMBER can create projects
  const access = await requireWorkspaceAccess(currentUser.id, workspace.id);
  if (!access || !canCreateProject(access.role)) {
    redirect(
      workspace.projects && workspace.projects.length > 0
        ? `/workspace/${workspaceSlug}/project/${workspace.projects[0].key}`
        : `/workspaces`
    );
  }

  return <CreateProjectView workspace={workspace} currentUser={currentUser} />;
}

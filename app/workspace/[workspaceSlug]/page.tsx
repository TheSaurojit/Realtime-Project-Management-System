import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export default async function WorkspaceRootPage({
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

  // If there are projects, navigate to the first project board
  if (workspace.projects && workspace.projects.length > 0) {
    redirect(`/workspace/${workspace.slug}/project/${workspace.projects[0].key}`);
  }

  // Otherwise direct user to create their first project
  redirect(`/workspace/${workspace.slug}/project/create`);
}

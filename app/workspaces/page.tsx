import { getCurrentUser } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/db";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspaces(currentUser.id);

  return (
    <WorkspacesList
      initialWorkspaces={workspaces}
      initialUser={currentUser}
    />
  );
}

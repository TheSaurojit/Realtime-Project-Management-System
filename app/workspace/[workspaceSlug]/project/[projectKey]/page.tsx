import { notFound, redirect } from "next/navigation";
import { getProjectByKey, getActivityLogs, getNotifications } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEffectiveProjectAccess } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";
import { ProjectClientView } from "@/components/project/project-client-view";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const project = await getProjectByKey(workspaceSlug, projectKey);

  if (!project) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Resolve user's effective project access level
  const effectiveAccess = await getEffectiveProjectAccess(currentUser.id, project.id);
  if (!effectiveAccess) {
    redirect("/workspaces");
  }

  // Parallel fetches via Promise.all
  const [activities, notifications, workspace] = await Promise.all([
    getActivityLogs({ projectId: project.id, limit: 50 }),
    getNotifications(currentUser.id),
    prisma.workspace.findUnique({
      where: { id: project.workspaceId },
      select: {
        members: {
          include: { user: true },
        },
      },
    }),
  ]);

  // Flatten all tasks from columns
  const initialTasks = project.columns.flatMap((c) => c.tasks || []);

  return (
    <ProjectClientView
      key={project.id}
      project={project}
      initialTasks={initialTasks}
      currentUser={currentUser}
      effectiveAccess={effectiveAccess}
      workspaceMembers={(workspace?.members || []) as unknown as Parameters<typeof ProjectClientView>[0]["workspaceMembers"]}
      notifications={notifications}
      activities={activities}
    />
  );
}

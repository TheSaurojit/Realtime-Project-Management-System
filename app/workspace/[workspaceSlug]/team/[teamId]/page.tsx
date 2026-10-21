import { redirect } from "next/navigation";

export default async function TeamDetailRedirect({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
}) {
  const { workspaceSlug, teamId } = await params;
  redirect(`/workspace/${workspaceSlug}/teams/${teamId}`);
}

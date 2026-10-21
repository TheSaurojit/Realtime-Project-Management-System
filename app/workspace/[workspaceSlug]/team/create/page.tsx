import { redirect } from "next/navigation";

export default async function TeamCreateRedirect({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  redirect(`/workspace/${workspaceSlug}/teams/create`);
}

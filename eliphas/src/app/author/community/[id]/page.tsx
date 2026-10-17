import { redirect } from "next/navigation";

/** The post editor now lives with the post, for readers and authors alike. */
export default async function OldEditPostPage({ params }: PageProps<"/author/community/[id]">) {
  redirect(`/community/${(await params).id}/edit`);
}

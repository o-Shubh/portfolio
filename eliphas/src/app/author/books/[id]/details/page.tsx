import type { Metadata } from "next";
import { getOwnBookOr404 } from "@/lib/author-books";
import { isEditable } from "@/lib/publishing";
import { createAdminClient } from "@/lib/supabase/admin";
import { DetailsForm } from "./DetailsForm";

export const metadata: Metadata = { title: "Book details" };

export default async function DetailsPage({ params }: PageProps<"/author/books/[id]/details">) {
  const { id } = await params;
  const { book, profile } = await getOwnBookOr404(id);
  // The author's other books, to mark this as another format or edition of the same work
  const { data: others } = await createAdminClient()
    .from("books")
    .select("id, title, binding, work_id")
    .eq("author_id", profile.id)
    .neq("id", book.id)
    .order("created_at");
  return <DetailsForm book={book} disabled={!isEditable(book)} others={others ?? []} />;
}

import { redirect } from "next/navigation";
import { getOwnBookOr404 } from "@/lib/author-books";
import { isEditable } from "@/lib/publishing";

export default async function BookIndex({ params }: PageProps<"/author/books/[id]">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  redirect(`/author/books/${id}/${isEditable(book) ? "details" : "submit"}`);
}

import type { Metadata } from "next";
import { getOwnBookOr404 } from "@/lib/author-books";
import { isEditable } from "@/lib/publishing";
import { DetailsForm } from "./DetailsForm";

export const metadata: Metadata = { title: "Book details" };

export default async function DetailsPage({ params }: PageProps<"/author/books/[id]/details">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  return <DetailsForm book={book} disabled={!isEditable(book)} />;
}

import type { Metadata } from "next";
import { getOwnBookOr404 } from "@/lib/author-books";
import { isEditable } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { PrintForm } from "./PrintForm";

export const metadata: Metadata = { title: "Print and price" };

export default async function PrintPage({ params }: PageProps<"/author/books/[id]/print">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const { rates, fees } = await getPricingSettings();

  return (
    <PrintForm
      bookId={book.id}
      rates={rates}
      fees={fees}
      disabled={!isEditable(book)}
      pdfSize={
        book.manuscript_width_in && book.manuscript_height_in
          ? { w: Number(book.manuscript_width_in), h: Number(book.manuscript_height_in) }
          : null
      }
      initial={{
        page_count: book.page_count ?? NaN,
        trim_size: book.trim_size,
        binding: book.binding,
        interior: book.interior,
        paper: book.paper,
        cover_finish: book.cover_finish,
        mrp: book.mrp === null ? "" : Number(book.mrp),
      }}
    />
  );
}

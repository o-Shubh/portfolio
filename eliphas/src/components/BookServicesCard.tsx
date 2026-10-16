import { loadBookServices } from "@/lib/book-services";
import { BookAddOns } from "./BookAddOns";

/** Server wrapper: loads the service catalogue and this book's requests for the add-ons card. */
export async function BookServicesCard({ bookId, authorId }: { bookId: string; authorId: string }) {
  const { options, requests } = await loadBookServices(bookId, authorId);
  if (!options.length) return null;
  return <BookAddOns bookId={bookId} options={options} requests={requests} />;
}

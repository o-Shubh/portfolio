import "server-only";
import { formatPaise } from "@/lib/commission";
import type { PrintRates } from "@/lib/pricing";
import type { Book } from "@/lib/publishing";
import { OPEN_SERVICE_STATUSES, SERVICE_STATUS, type ServiceStatus } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

/** Service requirements we already know from the book, so the author doesn't type them again. */
export function bookRequirements(book: Book, rates: PrintRates, authorName: string | null): Record<string, string> {
  const reqs: Record<string, string> = {
    title: book.title,
    author_name: book.author_name || authorName || "",
    language: book.language,
    genre: book.genre ?? "",
    trim_size: rates.trim_sizes[book.trim_size]?.label ?? book.trim_size,
    page_count: book.page_count ? String(book.page_count) : "",
    paper: rates.paper[book.paper]?.label ?? book.paper,
    blurb: book.description ?? "",
  };
  return Object.fromEntries(Object.entries(reqs).filter(([, v]) => v.trim() !== ""));
}

export type AddOnOption = { code: string; name: string; price: string; scope: string; deliverables: string[] };
export type BookServiceRequest = { id: string; code: string; name: string; status: ServiceStatus; statusLabel: string; open: boolean };

/** The current services an author can add for a book, and what's already been requested for it. */
export async function loadBookServices(bookId: string, authorId: string) {
  const admin = createAdminClient();
  const [{ data: catalog }, { data: orders }] = await Promise.all([
    admin.from("current_service_catalog").select("*").eq("active", true).order("sort"),
    admin
      .from("service_orders")
      .select("id, status, service_catalog(code, name)")
      .eq("book_id", bookId)
      .eq("author_id", authorId)
      .eq("kind", "service")
      .order("created_at", { ascending: false }),
  ]);
  const options: AddOnOption[] = (catalog ?? []).map((c) => ({
    code: c.code!,
    name: c.name!,
    price:
      c.pricing === "fixed"
        ? `${formatPaise(c.price_paise!)} + GST`
        : `${formatPaise(c.min_paise!)}–${formatPaise(c.max_paise!)} + GST, quoted after review`,
    scope: c.scope ?? "",
    deliverables: c.deliverables ?? [],
  }));
  const requests: BookServiceRequest[] = (orders ?? []).map((o) => ({
    id: o.id,
    code: o.service_catalog?.code ?? "",
    name: o.service_catalog?.name ?? "Service",
    status: o.status,
    statusLabel: SERVICE_STATUS[o.status].label,
    open: OPEN_SERVICE_STATUSES.includes(o.status),
  }));
  return { options, requests };
}

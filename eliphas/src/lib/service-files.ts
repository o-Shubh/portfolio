import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Files on a service order with short-lived download links. Call only after checking access. */
export async function serviceFilesWithLinks(orderId: string) {
  const admin = createAdminClient();
  const { data: files } = await admin.from("service_files").select("*").eq("service_order_id", orderId).order("created_at");
  if (!files?.length) return [];
  const { data: links } = await admin.storage.from("service-files").createSignedUrls(files.map((f) => f.path), 900);
  return files.map((f, i) => ({ ...f, url: links?.[i]?.signedUrl ?? null }));
}

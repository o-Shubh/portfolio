"use client";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type UploadResult = { ok: true } | { error: string };

/**
 * Uploads a file to Supabase Storage with progress (the JS client has no progress events).
 * Same endpoint, headers and permissions as supabase.storage.upload(..., { upsert: true }).
 */
export async function uploadWithProgress(bucket: string, path: string, file: File, onProgress: (fraction: number) => void): Promise<UploadResult> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Your login has expired. Log in again, then retry." };
  const url = `${supabaseUrl()}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", supabasePublishableKey());
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "max-age=60");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      let message = "";
      try {
        message = String(JSON.parse(xhr.responseText).message ?? "");
      } catch {}
      const m = message.toLowerCase();
      if (m.includes("row-level security") || xhr.status === 403) resolve({ error: "This book is locked for editing, so the file can't be replaced." });
      else if (xhr.status === 413 || m.includes("size")) resolve({ error: "The file is too large for upload." });
      else if (m.includes("mime") || m.includes("type")) resolve({ error: "This file type isn't accepted here." });
      else resolve({ error: `Upload failed${message ? `: ${message}` : ""}. Please try again.` });
    };
    xhr.onerror = () => resolve({ error: "The upload stopped because the connection dropped. Check your internet and try again." });
    xhr.ontimeout = () => resolve({ error: "The upload took too long. Check your internet and try again." });
    xhr.send(file);
  });
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPES: Record<string, string[]> = {
  documents: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.oasis.opendocument.text",
    "text/plain",
    "application/zip",
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
  images: ["image/png", "image/jpeg", "image/webp"],
};

/**
 * Uploads a file straight to a private storage bucket (access rules decide who may), then
 * calls `onUploaded` on the server to record it. Checks type and size before uploading.
 */
export function PrivateUpload({
  bucket,
  folder,
  accept = "documents",
  maxMb = 50,
  label,
  onUploaded,
}: {
  bucket: string;
  folder: string;
  accept?: keyof typeof TYPES;
  maxMb?: number;
  label: string;
  onUploaded: (f: { path: string; fileName: string; size: number }) => Promise<{ error?: string; ok?: string }>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = `up-${folder.replace(/\W/g, "-")}`;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    if (!TYPES[accept].includes(file.type)) return setMsg({ error: "This file type isn't allowed. Use PDF, Word, plain text, ZIP or an image." });
    if (file.size > maxMb * 1024 * 1024) return setMsg({ error: `Files must be ${maxMb} MB or smaller.` });
    setBusy(true);
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${folder}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setBusy(false);
      return setMsg({ error: "Upload failed. You may not have access, or the file is too large." });
    }
    const res = await onUploaded({ path, fileName: file.name, size: file.size });
    setBusy(false);
    setMsg(res);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        onChange={onChange}
        disabled={busy}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:font-medium"
        accept={TYPES[accept].join(",")}
      />
      {busy && <p className="text-sm text-muted">Uploading…</p>}
      {msg?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {msg.error}
        </p>
      )}
      {msg?.ok && <p className="text-sm text-success">{msg.ok}</p>}
    </div>
  );
}

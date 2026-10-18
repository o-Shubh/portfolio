"use client";
/* eslint-disable @next/next/no-img-element -- local preview of the chosen image */

import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { composePost, publishComposed } from "@/app/actions/posts";
import { useGate } from "@/components/articles/useGate";
import { offlineSafe, useUnsavedWarning } from "@/lib/use-form-action";

const LIMIT = 3000;

/** Write a post: text, an optional image (with a description) and, for verified authors, one of their books. */
export function Composer({ name, books }: { name: string | null; books: { id: string; title: string }[] }) {
  const router = useRouter();
  const gate = useGate();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [book, setBook] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  useUnsavedWarning(Boolean(body.trim()) && !pending);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  function pick(f: File | undefined) {
    setMsg(null);
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setMsg({ error: "Use a JPEG, PNG or WebP image." });
    if (f.size > 5 * 1024 * 1024) return setMsg({ error: `This image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` });
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setMsg({ error: "Write something first." });
    if (file && !alt.trim()) return setMsg({ error: "Describe the image for readers using screen readers." });
    setMsg(null);
    start(async () => {
      const res = await offlineSafe(composePost({ body, relatedBookId: book || undefined, publish: !file }));
      const g = gate(res, "post");
      if (g || !("ok" in res)) return setMsg({ error: g ?? undefined });
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch(`/api/posts/${res.id}/image`, { method: "POST", body: fd }).catch(() => null);
        if (!up?.ok) {
          const j = up ? await up.json().catch(() => ({})) : {};
          return setMsg({ error: `${j.error ?? "The image didn't upload."} Your post is saved as a draft; open it from your profile to finish.` });
        }
        const pub = await offlineSafe(publishComposed(res.id, alt));
        if (!("ok" in pub)) return setMsg({ error: pub.error });
      }
      setBody("");
      setFile(null);
      setPreview(null);
      setAlt("");
      setBook("");
      setMsg({ ok: "Posted." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line" aria-label="New post" data-testid="composer">
      <label htmlFor="composer-body" className="sr-only">
        What&apos;s on your mind{name ? `, ${name.split(" ")[0]}` : ""}?
      </label>
      <textarea
        id="composer-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={LIMIT}
        rows={3}
        placeholder={`What are you reading or writing${name ? `, ${name.split(" ")[0]}` : ""}?`}
        className="field resize-y py-3"
      />
      {preview && (
        <div className="mt-3 space-y-2">
          <div className="relative w-fit">
            <img src={preview} alt="" className="max-h-56 rounded-[var(--radius-control)] ring-1 ring-line" />
            <button type="button" onClick={() => { setFile(null); setPreview(null); setAlt(""); }} className="absolute top-1 right-1 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove image">
              <X className="h-5 w-5" />
            </button>
          </div>
          <label htmlFor="composer-alt" className="label">
            Describe the image
          </label>
          <input id="composer-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className="field" />
        </div>
      )}
      {books.length > 0 && (
        <div className="mt-3">
          <label htmlFor="composer-book" className="label">
            Link one of your books (optional)
          </label>
          <select id="composer-book" value={book} onChange={(e) => setBook(e.target.value)} className="field">
            <option value="">None</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="btn-quiet cursor-pointer" aria-label="Add an image">
          <ImagePlus className="h-5 w-5" aria-hidden /> <span className="hidden sm:inline">Image</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <span className={`ml-auto text-xs tabular-nums ${body.length > LIMIT - 100 ? "text-danger" : "text-muted"}`}>
          {body.length}/{LIMIT}
        </span>
        <button type="submit" className="btn-primary" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      <p aria-live="polite" className={`mt-2 text-sm ${msg?.error ? "font-medium text-danger" : "text-success"}`}>
        {msg?.error ?? msg?.ok}
      </p>
    </form>
  );
}

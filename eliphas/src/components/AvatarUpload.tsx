"use client";
/* eslint-disable @next/next/no-img-element -- preview of the stored photo */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthorAvatar } from "./AuthorAvatar";

/** Upload or remove your profile photo. Shown on your articles, author page and comments. */
export function AvatarUpload({ name, path, url }: { name: string | null; path: string | null; url: string | null }) {
  const router = useRouter();
  const [src, setSrc] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Use a JPEG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return setError("Images can be up to 5 MB.");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: "No connection. Try again." };
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? "Upload failed. Try again.");
    setSrc(json.url);
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setSrc(null);
      router.refresh();
    }
  }

  return (
    <section className="card" aria-labelledby="photo-h">
      <h2 id="photo-h" className="text-lg">
        Profile photo
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {src ? <img src={src} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/40" data-testid="avatar-preview" /> : <AuthorAvatar name={name} path={path} size="lg" />}
        <div className="space-y-1">
          <label className="btn-ghost min-h-10 cursor-pointer px-4 text-sm">
            {busy ? "Uploading…" : src ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          </label>
          {src && (
            <button type="button" className="ml-3 text-sm font-medium text-muted underline" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
          <p className="text-xs text-muted">JPEG, PNG or WebP, up to 5 MB. Cropped square; we remove location and camera details.</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

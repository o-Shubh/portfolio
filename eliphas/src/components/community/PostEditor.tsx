"use client";
/* eslint-disable @next/next/no-img-element -- preview of the uploaded image */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, savePost, unpublishPost } from "@/app/actions/posts";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

type Book = { id: string; title: string };

export function PostEditor({
  id,
  status,
  moderated,
  initial,
  imageUrl,
  books,
  canLinkBook = false,
  publicPath,
}: {
  id: string;
  status: "draft" | "published";
  moderated: string | null;
  initial: { body: string; image_alt: string; related_book_id: string };
  imageUrl: string | null;
  books: Book[];
  canLinkBook?: boolean;
  publicPath: string;
}) {
  const router = useRouter();
  const [state, onSubmit, pending, { onChange }] = useFormAction(savePost.bind(null, id), { warnUnsaved: true });
  const [body, setBody] = useState(initial.body);
  const [image, setImage] = useState(imageUrl);
  const [imgError, setImgError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<null | "delete" | "unpublish">(null);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | undefined>();

  async function upload(file: File) {
    setImgError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setImgError("Use a JPEG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return setImgError(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/posts/${id}/image`, { method: "POST", body: fd }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: "The upload stopped because the connection dropped. Try again." };
    setUploading(false);
    if (!res?.ok) return setImgError(json.error ?? "Upload failed. Try again.");
    setImage(json.url);
  }
  async function removeImage() {
    const res = await fetch(`/api/posts/${id}/image`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setImage(null);
    else setImgError("Couldn't remove the image. Try again.");
  }

  const live = status === "published";
  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_260px]">
      <form onSubmit={onSubmit} onChange={onChange} className="space-y-5">
        {moderated && (
          <p role="note" className="notice bg-danger/10 ring-danger/25">
            Our team has {moderated === "removed" ? "removed" : "hidden"} this post. Contact support to discuss it.
          </p>
        )}
        <div>
          <div className="flex items-end justify-between">
            <label htmlFor="p-body" className="label">
              Post
            </label>
            <span className={`mb-1.5 text-xs mono ${body.length > 2900 ? "text-danger" : "text-muted"}`}>{body.length}/3000</span>
          </div>
          <textarea id="p-body" name="body" rows={7} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} className="field py-3" placeholder="What would you like to tell your readers?" />
        </div>

        <fieldset className="space-y-3">
          <legend className="label">Image (optional)</legend>
          {image ? (
            <div className="space-y-3">
              <img src={image} alt="" className="max-h-72 rounded-[var(--radius-control)] ring-1 ring-line" />
              <div>
                <label htmlFor="p-alt" className="label">
                  Describe the image
                </label>
                <input id="p-alt" name="image_alt" defaultValue={initial.image_alt} maxLength={200} className="field" />
                <p className="hint">For readers using screen readers. Required to publish.</p>
              </div>
              <button type="button" onClick={removeImage} className="min-h-11 text-sm font-medium text-danger underline">
                Remove image
              </button>
            </div>
          ) : (
            <label className="btn-ghost w-fit cursor-pointer">
              {uploading ? "Uploading…" : "Add an image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
            </label>
          )}
          {!image && <input type="hidden" name="image_alt" value="" />}
          <p className="hint">JPEG, PNG or WebP, up to 5 MB. We remove location and camera details.</p>
          {imgError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {imgError}
            </p>
          )}
        </fieldset>

        {canLinkBook ? (
          <div>
            <label htmlFor="p-book" className="label">
              Related book (optional)
            </label>
            <select id="p-book" name="related_book_id" defaultValue={initial.related_book_id} className="field">
              <option value="">None</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            {books.length === 0 && <p className="hint">Only your published books can be linked.</p>}
          </div>
        ) : (
          <input type="hidden" name="related_book_id" value="" />
        )}

        <div className="flex flex-wrap gap-3">
          {live ? (
            <button type="submit" name="intent" value="save" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          ) : (
            <>
              <button type="submit" name="intent" value="publish" className="btn-primary" disabled={pending || Boolean(moderated) || !body.trim()}>
                {pending ? "Working…" : "Publish"}
              </button>
              <button type="submit" name="intent" value="save" className="btn-ghost" disabled={pending}>
                Save draft
              </button>
            </>
          )}
        </div>
        {!live && !body.trim() && <p className="text-sm text-muted">Write something to publish.</p>}
        <FormMessage state={state} />
      </form>

      <aside className="space-y-3 text-sm">
        <p>
          <span className="font-semibold">Status:</span> {live ? "Published" : "Draft"}
        </p>
        {live && (
          <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-accent-fg hover:underline">
            View public post
          </a>
        )}
        {live &&
          (confirm === "unpublish" ? (
            <div className="space-y-2 rounded-[var(--radius-control)] bg-surface-2 p-3">
              <p>Move this post back to drafts? It disappears from feeds. Publishing again won&apos;t notify followers again.</p>
              <div className="flex gap-2">
                <button type="button" className="btn-primary min-h-10 px-3 text-sm" disabled={busy} onClick={() => start(async () => { const r = await offlineSafe(unpublishPost(id)); setMsg(r); setConfirm(null); router.refresh(); })}>
                  Unpublish
                </button>
                <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-ghost w-full" onClick={() => setConfirm("unpublish")}>
              Unpublish…
            </button>
          ))}
        {confirm === "delete" ? (
          <div className="space-y-2 rounded-[var(--radius-control)] bg-danger/10 p-3">
            <p>Delete this post for good, with its likes and comments?</p>
            <div className="flex gap-2">
              <button type="button" className="btn-danger min-h-10 px-3 text-sm" disabled={busy} onClick={() => start(async () => { const r = await offlineSafe(deletePost(id)); if (r && "error" in r) setMsg(r); })}>
                Delete
              </button>
              <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setConfirm(null)}>
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="min-h-11 text-sm font-medium text-danger underline" onClick={() => setConfirm("delete")}>
            Delete post…
          </button>
        )}
        <FormMessage state={msg} />
      </aside>
    </div>
  );
}

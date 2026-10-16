"use client";

/* eslint-disable @next/next/no-img-element -- cover preview from our own storage */
import { Bold, Eye, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pencil, Quote } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { deleteArticle, publishArticle, saveArticle, unpublishArticle, type ArticleInput } from "@/app/actions/articles";
import { ArticleBody } from "@/components/ArticleBody";
import { LIMITS, parseArticle, publishProblems, readingMinutes, TOPICS, wordCount } from "@/lib/article-format";

type Status = "draft" | "published" | "unpublished";
type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string };

export function ArticleEditor({
  id,
  initial,
  status: initialStatus,
  path: initialPath,
  coverUrl: initialCover,
  books,
  moderated,
  moderationReason,
}: {
  id: string;
  initial: ArticleInput;
  status: Status;
  path: string;
  coverUrl: string | null;
  books: { id: string; title: string }[];
  moderated: string | null;
  moderationReason?: string | null;
}) {
  const [f, setF] = useState<ArticleInput>(initial);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [path, setPath] = useState(initialPath);
  const [cover, setCover] = useState<string | null>(initialCover);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<null | "publish" | "unpublish" | "delete">(null);
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const body = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(f);
  useEffect(() => {
    latest.current = f;
  }, [f]);
  const backupKey = `eip-article-${id}`;
  const live = status === "published";

  // A local copy in this browser, so nothing typed is lost if saving fails or the tab closes.
  // On load, offer to restore it when it differs from what the server has.
  const [restoreHandled, setRestoreHandled] = useState(false);
  const backupOnLoad = useRef<boolean | null>(null); // checked once, before any typing
  const hasBackup = useSyncExternalStore(
    () => () => {},
    () => {
      if (backupOnLoad.current === null) {
        try {
          const raw = localStorage.getItem(backupKey);
          backupOnLoad.current = Boolean(raw && JSON.stringify((JSON.parse(raw) as { input: ArticleInput }).input) !== JSON.stringify(initial));
        } catch {
          backupOnLoad.current = false;
        }
      }
      return backupOnLoad.current;
    },
    () => false,
  );
  const offerRestore = hasBackup && !restoreHandled;

  const update = (patch: Partial<ArticleInput>) => {
    setF((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(backupKey, JSON.stringify({ input: next, at: new Date().getTime() }));
      } catch {}
      return next;
    });
    setDirty(true);
  };

  const doSave = useCallback(async () => {
    setSave({ kind: "saving" });
    let res: Awaited<ReturnType<typeof saveArticle>>;
    try {
      res = await saveArticle(id, latest.current);
    } catch {
      // Offline or the server didn't answer: the text stays here and in this browser's backup
      res = { error: "No connection." };
    }
    if ("error" in res) {
      setSave({ kind: "error", message: res.error });
      return false;
    }
    setPath(res.path);
    setSave({ kind: "saved", at: res.savedAt });
    setDirty(false);
    try {
      localStorage.removeItem(backupKey);
    } catch {}
    return true;
  }, [id, backupKey]);

  // Autosave drafts two seconds after typing stops. A published article is only saved when the author says so.
  useEffect(() => {
    if (!dirty || live || save.kind === "saving") return;
    const t = setTimeout(() => void doSave(), 2000);
    return () => clearTimeout(t);
  }, [f, dirty, live, save.kind, doSave]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Toolbar: wraps the selection or prefixes the current lines
  const format = (kind: "b" | "i" | "h2" | "h3" | "quote" | "ul" | "ol" | "link") => {
    const ta = body.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    let next = value;
    let cursor = e;
    if (kind === "b" || kind === "i") {
      const mark = kind === "b" ? "**" : "*";
      const text = sel || (kind === "b" ? "bold text" : "italic text");
      next = value.slice(0, s) + mark + text + mark + value.slice(e);
      cursor = s + mark.length + text.length + mark.length;
    } else if (kind === "link") {
      const text = sel || "link text";
      next = value.slice(0, s) + `[${text}](https://)` + value.slice(e);
      cursor = s + text.length + 11;
    } else {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const lineEnd = value.indexOf("\n", e) === -1 ? value.length : value.indexOf("\n", e);
      const prefix = { h2: "## ", h3: "### ", quote: "> ", ul: "- ", ol: "1. " }[kind];
      const lines = value
        .slice(lineStart, lineEnd)
        .split("\n")
        .map((l, i) => (kind === "ol" ? `${i + 1}. ` : prefix) + l.replace(/^(#{1,3}\s+|>\s?|[-*]\s+|\d+[.)]\s+)/, ""));
      const block = lines.join("\n");
      next = value.slice(0, lineStart) + block + value.slice(lineEnd);
      cursor = lineStart + block.length;
    }
    update({ body_md: next.slice(0, LIMITS.body) });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const uploadCover = async (file: File) => {
    setCoverError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setCoverError("Use a JPEG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return setCoverError("Images can be up to 5 MB.");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/articles/${id}/cover`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({ error: "Upload failed. Try again." }));
    if (!res.ok) return setCoverError(json.error ?? "Upload failed. Try again.");
    setCover(json.url);
  };
  const removeCover = async () => {
    const res = await fetch(`/api/articles/${id}/cover`, { method: "DELETE" });
    if (res.ok) {
      setCover(null);
      update({ cover_alt: "" });
    }
  };

  const blocks = parseArticle(f.body_md);
  const words = wordCount(blocks);
  const problems = publishProblems(
    { ...f, topic: f.topic || null, tags: [], cover_path: cover, cover_alt: f.cover_alt },
    f.rights,
  );

  const run = (fn: () => Promise<void>) => startBusy(fn);
  const onPublish = () =>
    run(async () => {
      const res = await publishArticle(id, latest.current).catch(() => ({ error: "No connection. Try again." }) as const);
      if ("error" in res) return setMessage({ error: res.error });
      setStatus("published");
      setPath(res.path);
      setDirty(false);
      setConfirm(null);
      setSave({ kind: "saved", at: res.savedAt });
      try {
        localStorage.removeItem(backupKey);
      } catch {}
      setMessage({ ok: res.notified ? `Published. ${res.notified} follower${res.notified === 1 ? "" : "s"} notified.` : "Published." });
    });
  const onUnpublish = () =>
    run(async () => {
      const res = await unpublishArticle(id).catch(() => ({ error: "No connection. Try again." }) as const);
      if ("error" in res) return setMessage({ error: res.error });
      setStatus("unpublished");
      setConfirm(null);
      setMessage({ ok: "Unpublished. It's no longer on the site; you can republish it any time." });
    });
  const onDelete = () =>
    run(async () => {
      const res = await deleteArticle(id);
      if (res?.error) setMessage({ error: res.error });
    });

  const saveLabel =
    save.kind === "saving"
      ? "Saving…"
      : save.kind === "error"
        ? "Couldn't save"
        : dirty
          ? live
            ? "Unsaved changes"
            : "Unsaved changes"
          : save.kind === "saved"
            ? `Saved ${new Date(save.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : "All changes saved";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        {moderated && (
          <p role="note" className="rounded-xl bg-danger/10 p-3 text-sm ring-1 ring-danger/25">
            Our team has {moderated === "removed" ? "removed" : "hidden"} this article from the site.{moderationReason && <> Reason: {moderationReason}.</>} Contact support to discuss it.
          </p>
        )}
        {offerRestore ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-accent/15 p-3 text-sm">
            <span className="flex-1">This browser has unsaved changes for this article from earlier.</span>
            <button
              type="button"
              className="btn-ghost min-h-10 px-3 text-sm"
              onClick={() => {
                try {
                  const saved = JSON.parse(localStorage.getItem(backupKey) ?? "null");
                  if (saved?.input) {
                    setF(saved.input);
                    setDirty(true);
                  }
                } catch {}
                setRestoreHandled(true);
              }}
            >
              Restore them
            </button>
            <button
              type="button"
              className="min-h-10 px-2 text-sm underline"
              onClick={() => {
                try {
                  localStorage.removeItem(backupKey);
                } catch {}
                setRestoreHandled(true);
              }}
            >
              Discard
            </button>
          </div>
        ) : (
          message && (
            <p role={message.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-medium ${message.error ? "bg-danger/10 text-danger" : "bg-success/15 text-success"}`}>
              {message.error ?? message.ok}
            </p>
          )
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-surface-2 p-1" role="group" aria-label="Editor view">
            <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${!preview ? "bg-surface shadow-soft" : "text-muted"}`}>
              <Pencil className="h-4 w-4" aria-hidden /> Write
            </button>
            <button type="button" aria-pressed={preview} onClick={() => setPreview(true)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${preview ? "bg-surface shadow-soft" : "text-muted"}`}>
              <Eye className="h-4 w-4" aria-hidden /> Preview
            </button>
          </div>
          <p className={`ml-auto text-sm ${save.kind === "error" ? "font-medium text-danger" : "text-muted"}`} role="status" aria-live="polite" data-testid="save-state">
            {saveLabel}
          </p>
        </div>
        {save.kind === "error" && (
          <p role="alert" className="text-sm text-danger">
            {save.message} Your changes are kept in this browser.{" "}
            <button type="button" className="font-semibold underline" onClick={() => void doSave()}>
              Try again
            </button>
          </p>
        )}

        {preview ? (
          <article className="card" lang={f.language}>
            {cover && <img src={cover} alt={f.cover_alt} className="mb-5 aspect-[16/9] w-full rounded-xl object-cover" />}
            <h1 className="text-3xl md:text-4xl">{f.title || "Untitled article"}</h1>
            {f.excerpt && <p className="mt-3 text-lg text-muted">{f.excerpt}</p>}
            <p className="mt-2 text-sm text-muted">{readingMinutes(words)} min read · preview, not published</p>
            <div className="mt-6 max-w-[68ch]">
              <ArticleBody blocks={blocks} />
            </div>
          </article>
        ) : (
          <div className="card space-y-5">
            <Field label="Title" count={`${f.title.length}/${LIMITS.title}`} htmlFor="a-title">
              <input id="a-title" className="field text-lg font-semibold" maxLength={LIMITS.title} value={f.title} onChange={(e) => update({ title: e.target.value })} lang={f.language} />
            </Field>
            <Field label="Short excerpt" hint="Shown in lists and when the link is shared." count={`${f.excerpt.length}/${LIMITS.excerpt}`} htmlFor="a-excerpt">
              <textarea id="a-excerpt" className="field py-2.5" rows={2} maxLength={LIMITS.excerpt} value={f.excerpt} onChange={(e) => update({ excerpt: e.target.value })} lang={f.language} />
            </Field>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="a-body" className="label">
                  Article
                </label>
                <span className="text-xs text-muted tabular-nums">
                  {words} words · {readingMinutes(words)} min read
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-line bg-surface-2 p-1" role="toolbar" aria-label="Formatting">
                {(
                  [
                    ["h2", Heading2, "Heading"],
                    ["h3", Heading3, "Subheading"],
                    ["b", Bold, "Bold"],
                    ["i", Italic, "Italic"],
                    ["ul", List, "Bulleted list"],
                    ["ol", ListOrdered, "Numbered list"],
                    ["quote", Quote, "Quote"],
                    ["link", Link2, "Link"],
                  ] as const
                ).map(([k, Icon, label]) => (
                  <button key={k} type="button" onClick={() => format(k)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface" aria-label={label} title={label}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </button>
                ))}
              </div>
              <textarea
                id="a-body"
                ref={body}
                className="field min-h-[22rem] rounded-t-none py-3 font-[inherit] leading-relaxed"
                value={f.body_md}
                maxLength={LIMITS.body}
                onChange={(e) => update({ body_md: e.target.value })}
                lang={f.language}
                aria-describedby="a-body-help"
              />
              <p id="a-body-help" className="mt-1 text-xs text-muted">
                Use the buttons, or type: ## heading, **bold**, *italic*, - list, 1. list, &gt; quote, [text](https://link). Leave a blank line between paragraphs.
                Share an excerpt rather than a whole book.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <section className="card space-y-3">
          <p className="text-sm">
            <span className="font-semibold">Status:</span> {status === "published" ? "Published" : status === "unpublished" ? "Unpublished" : "Draft"}
            {status === "published" && (
              <>
                {" · "}
                <Link href={path} className="underline" target="_blank">
                  View
                </Link>
              </>
            )}
          </p>
          {live ? (
            <button type="button" className="btn-primary w-full" disabled={busy || save.kind === "saving"} onClick={() => void doSave()}>
              Update published article
            </button>
          ) : (
            <button type="button" className="btn-ghost w-full" disabled={busy || save.kind === "saving"} onClick={() => void doSave()}>
              Save draft
            </button>
          )}
          {!live &&
            (confirm === "publish" ? (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                {problems.length ? (
                  <>
                    <p className="font-semibold">Before publishing:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>{status === "draft" ? "Publish this article? Your followers will get one notification." : "Publish this article again? Followers aren't notified again."}</p>
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn-accent flex-1" disabled={busy || problems.length > 0} onClick={onPublish}>
                    {busy ? "Publishing…" : "Yes, publish"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-accent w-full" disabled={busy || Boolean(moderated)} onClick={() => setConfirm("publish")}>
                Publish…
              </button>
            ))}
          {live &&
            (confirm === "unpublish" ? (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                <p>Take this article off the site? Likes and comments are kept if you publish it again.</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary flex-1" disabled={busy} onClick={onUnpublish}>
                    Yes, unpublish
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
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
            <div className="space-y-2 rounded-xl bg-danger/10 p-3 text-sm">
              <p>Delete this article for good, with its likes and comments? This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <button type="button" className="btn flex-1 bg-danger text-white" disabled={busy} onClick={onDelete}>
                  Delete
                </button>
                <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="w-full text-sm font-medium text-danger underline" onClick={() => setConfirm("delete")}>
              Delete article…
            </button>
          )}
          <p className="text-xs text-muted">{live ? "Changes to a published article go live only when you press Update." : "Drafts save automatically. Nothing is published until you choose Publish."}</p>
        </section>

        <section className="card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language" htmlFor="a-lang">
              <select id="a-lang" className="field" value={f.language} onChange={(e) => update({ language: e.target.value })}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </Field>
            <Field label="Topic" htmlFor="a-topic">
              <select id="a-topic" className="field" value={f.topic} onChange={(e) => update({ topic: e.target.value })}>
                <option value="">Choose</option>
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Tags" hint="Up to 5, separated by commas." htmlFor="a-tags">
            <input id="a-tags" className="field" value={f.tags} onChange={(e) => update({ tags: e.target.value })} placeholder="writing, craft" />
          </Field>
          <Field label="Related book (optional)" htmlFor="a-book">
            <select id="a-book" className="field" value={f.related_book_id} onChange={(e) => update({ related_book_id: e.target.value })}>
              <option value="">None</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </Field>
          {books.length === 0 && <p className="-mt-2 text-xs text-muted">Your published books appear here.</p>}
        </section>

        <section className="card space-y-3">
          <h2 className="text-base font-semibold">Cover image (optional)</h2>
          {cover ? (
            <>
              <img src={cover} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
              <Field label="Describe the image" hint="For readers using screen readers." htmlFor="a-alt">
                <input id="a-alt" className="field" maxLength={LIMITS.coverAlt} value={f.cover_alt} onChange={(e) => update({ cover_alt: e.target.value })} />
              </Field>
              <button type="button" className="text-sm font-medium underline" onClick={() => void removeCover()}>
                Remove image
              </button>
            </>
          ) : (
            <label className="block">
              <span className="sr-only">Upload a cover image</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" onChange={(e) => e.target.files?.[0] && void uploadCover(e.target.files[0])} />
              <span className="mt-1 block text-xs text-muted">JPEG, PNG or WebP, up to 5 MB. We remove location and camera details.</span>
            </label>
          )}
          {coverError && (
            <p role="alert" className="text-sm text-danger">
              {coverError}
            </p>
          )}
        </section>

        <section className="card">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-fg" checked={f.rights} onChange={(e) => update({ rights: e.target.checked })} />
            <span>I wrote this article, or have permission to publish it, and I own or have permission to use the images. Excerpts from my book are authorised.</span>
          </label>
        </section>
      </aside>
    </div>
  );
}

function Field({ label, hint, count, htmlFor, children }: { label: string; hint?: string; count?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
        {count && <span className="text-xs text-muted tabular-nums">{count}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

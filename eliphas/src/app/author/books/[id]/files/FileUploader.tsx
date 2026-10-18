"use client";
/* eslint-disable @next/next/no-img-element -- preview of a just-uploaded file */

import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { attachFile } from "@/app/actions/books";
import { COVER_TYPES, MAX_COVER_MB, MAX_MANUSCRIPT_MB, versionedPath } from "@/lib/publishing";
import { uploadWithProgress } from "@/lib/upload";

type Current = { name: string; href: string | null; detail?: string; preview?: string } | null;

/** Reads page count and first-page size from a PDF, in the browser. */
async function inspectPdf(file: File) {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    const first = doc.getPage(0);
    const { width, height } = first.getSize(); // points: 72 per inch
    return { pageCount: doc.getPageCount(), widthIn: width / 72, heightIn: height / 72 };
  } catch {
    return null; // unreadable PDF: upload anyway, author enters page count by hand
  }
}

export function FileUploader({
  kind,
  bookId,
  authorId,
  current,
  disabled,
}: {
  kind: "manuscript" | "cover" | "print_cover";
  bookId: string;
  authorId: string;
  current: Current;
  disabled: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [status, setStatus] = useState<"idle" | "checking" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const isPdf = kind !== "cover";
  const accept = isPdf ? "application/pdf" : Object.keys(COVER_TYPES).join(",");
  const maxMb = kind === "manuscript" ? MAX_MANUSCRIPT_MB : MAX_COVER_MB;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setError(null);
    setDone(null);

    const mb = (file.size / 1024 / 1024).toFixed(1);
    if (file.size > maxMb * 1024 * 1024) return setError(`This file is ${mb} MB. The limit is ${maxMb} MB${isPdf ? " — try exporting the PDF with compressed images" : ""}.`);
    if (isPdf && file.type !== "application/pdf") return setError(`“${file.name}” isn't a PDF. Export your ${kind === "manuscript" ? "manuscript" : "print cover"} as a PDF and choose that file.`);
    if (kind === "cover" && !COVER_TYPES[file.type]) return setError(`“${file.name}” isn't a JPG, PNG or WebP image.`);

    let info: Awaited<ReturnType<typeof inspectPdf>> = null;
    if (isPdf) {
      setStatus("checking");
      info = await inspectPdf(file);
    }

    setStatus("uploading");
    setProgress(0);
    // Each upload is saved as its own file, so earlier versions stay available
    const path = versionedPath(authorId, bookId, kind, isPdf ? "pdf" : COVER_TYPES[file.type]);
    const bucket = isPdf ? "manuscripts" : "covers";
    const up = await uploadWithProgress(bucket, path, file, setProgress);
    if ("error" in up) {
      setStatus("idle");
      return setError(up.error);
    }

    setStatus("saving");
    const res = await attachFile(bookId, kind, {
      path,
      mime: file.type,
      pageCount: info?.pageCount,
      widthIn: info?.widthIn,
      heightIn: info?.heightIn,
    }).catch(() => ({ error: "The file uploaded, but we couldn't save it to your book because the connection dropped. Choose the file again to retry." }));
    setStatus("idle");
    if (res?.error) return setError(res.error);
    setDone(
      kind === "manuscript" && info
        ? `Uploaded. We found ${info.pageCount} pages.`
        : kind === "manuscript"
          ? "Uploaded. We couldn't read the page count — please enter it on the next step."
          : "Uploaded.",
    );
    router.refresh();
  }

  const busy = status !== "idle";
  return (
    <div className="mt-4">
      {current && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-card)] bg-surface-2 p-3">
          {current.preview ? (
            <img src={current.preview} alt="Uploaded cover" className="h-24 w-16 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 shrink-0 text-muted" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{current.name}</p>
            {current.detail && <p className="text-sm text-muted">{current.detail}</p>}
            {current.href && (
              <a href={current.href} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">
                Open
              </a>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <>
          <label
            htmlFor={inputId}
            className={`btn-ghost w-full cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <Upload className="h-5 w-5" aria-hidden />
            {status === "checking"
              ? "Reading PDF…"
              : status === "uploading"
                ? `Uploading ${Math.round(progress * 100)}%… keep this page open`
                : status === "saving"
                  ? "Saving…"
                  : current
                    ? "Replace file"
                    : kind === "cover"
                      ? "Choose image"
                      : "Choose PDF"}
          </label>
          <input id={inputId} type="file" accept={accept} className="sr-only" onChange={onPick} disabled={busy} />
        </>
      )}
      {status === "uploading" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.max(2, progress * 100)}%` }} />
        </div>
      )}
      <div aria-live="polite" className="mt-2 text-sm">
        {error && <p className="font-medium text-danger">{error}</p>}
        {done && <p className="font-medium text-success">{done}</p>}
      </div>
    </div>
  );
}

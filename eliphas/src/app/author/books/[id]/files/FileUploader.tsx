"use client";
/* eslint-disable @next/next/no-img-element -- preview of a just-uploaded file */

import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { attachFile } from "@/app/actions/books";
import {
  COVER_TYPES,
  coverPath,
  manuscriptPath,
  MAX_COVER_MB,
  MAX_MANUSCRIPT_MB,
} from "@/lib/publishing";
import { createClient } from "@/lib/supabase/client";

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
  kind: "manuscript" | "cover";
  bookId: string;
  authorId: string;
  current: Current;
  disabled: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [status, setStatus] = useState<"idle" | "checking" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const accept = kind === "manuscript" ? "application/pdf" : Object.keys(COVER_TYPES).join(",");
  const maxMb = kind === "manuscript" ? MAX_MANUSCRIPT_MB : MAX_COVER_MB;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setError(null);
    setDone(null);

    if (file.size > maxMb * 1024 * 1024) return setError(`File is larger than ${maxMb} MB.`);
    if (kind === "manuscript" && file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (kind === "cover" && !COVER_TYPES[file.type]) return setError("Please choose a JPG, PNG, WebP or PDF file.");

    let info: Awaited<ReturnType<typeof inspectPdf>> = null;
    if (kind === "manuscript") {
      setStatus("checking");
      info = await inspectPdf(file);
    }

    setStatus("uploading");
    const path = kind === "manuscript" ? manuscriptPath(authorId, bookId) : coverPath(authorId, bookId, COVER_TYPES[file.type]);
    const bucket = kind === "manuscript" ? "manuscripts" : "covers";
    const { error: upErr } = await createClient()
      .storage.from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "60" });
    if (upErr) {
      setStatus("idle");
      return setError(
        upErr.message.toLowerCase().includes("row-level security")
          ? "This book is locked for editing."
          : `Upload failed: ${upErr.message}`,
      );
    }

    const res = await attachFile(bookId, kind, {
      path,
      mime: file.type,
      pageCount: info?.pageCount,
      widthIn: info?.widthIn,
      heightIn: info?.heightIn,
    });
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
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
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
                ? "Uploading… keep this page open"
                : current
                  ? "Replace file"
                  : kind === "manuscript"
                    ? "Choose PDF"
                    : "Choose cover"}
          </label>
          <input id={inputId} type="file" accept={accept} className="sr-only" onChange={onPick} disabled={busy} />
        </>
      )}
      <div aria-live="polite" className="mt-2 text-sm">
        {error && <p className="font-medium text-danger">{error}</p>}
        {done && <p className="font-medium text-success">{done}</p>}
      </div>
    </div>
  );
}

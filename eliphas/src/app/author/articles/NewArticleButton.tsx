"use client";

import { PenLine } from "lucide-react";
import { useState, useTransition } from "react";
import { createArticle } from "@/app/actions/articles";

export function NewArticleButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await createArticle();
            if (res?.error) setError(res.error);
          })
        }
      >
        <PenLine className="h-4 w-4" aria-hidden /> {pending ? "Starting…" : "New article"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

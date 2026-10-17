"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { createPost } from "@/app/actions/posts";
import { offlineSafe } from "@/lib/use-form-action";

export function NewPostButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await offlineSafe(createPost());
            if (res && "error" in res) setError(res.error);
          })
        }
      >
        <Plus className="h-5 w-5" aria-hidden /> {pending ? "Starting…" : "New update"}
      </button>
      {error && (
        <span role="alert" className="text-sm font-medium text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

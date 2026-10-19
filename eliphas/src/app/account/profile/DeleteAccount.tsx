"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/actions/auth";
import { offlineSafe } from "@/lib/use-form-action";

/** Account deletion with a typed confirmation on the page. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <section className="card" aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="text-lg">
        Delete account
      </h2>
      <p className="mt-1 text-sm text-muted">Removes your login and profile for good. Past orders are kept for tax records but no longer linked to you.</p>
      {!open ? (
        <button type="button" className="mt-2 min-h-11 text-sm text-danger underline underline-offset-2" onClick={() => setOpen(true)}>
          Delete my account
        </button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            startTransition(async () => {
              const res = await offlineSafe(deleteMyAccount(text));
              if (res?.error) setError(res.error);
            });
          }}
        >
          <label htmlFor="delete-confirm" className="label">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            className="field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "delete-error" : undefined}
          />
          {error && (
            <p id="delete-error" role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn bg-danger text-white hover:opacity-90" disabled={pending}>
              {pending ? "Deleting…" : "Delete forever"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
              Keep my account
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

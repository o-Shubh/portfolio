"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Like React's useActionState, but the form keeps what the person typed.
 * (React resets a form after its action runs, which would wipe their input
 * whenever the server says something needs fixing.)
 *
 * Also:
 * - ignores a second submit while the first is still running (no duplicate requests);
 * - turns a dropped connection into a clear error instead of a crashed page, keeping the input.
 *
 * Usage: const [state, onSubmit, pending] = useFormAction(myServerAction);
 *        <form onSubmit={onSubmit}>…</form>
 */
export const OFFLINE_ERROR = "We couldn't reach the server. Check your connection and try again; your entries are still here.";

export function useFormAction<S>(action: (prev: S, fd: FormData) => Promise<S>, { warnUnsaved = false }: { warnUnsaved?: boolean } = {}) {
  const [state, setState] = useState<S>(undefined as S);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const running = useRef(false);
  useUnsavedWarning(warnUnsaved && dirty);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (running.current) return;
    running.current = true;
    // Include the clicked button's name/value (e.g. "Save and continue")
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(async () => {
      try {
        const next = await action(state, fd);
        setState(next);
        if (!(next && typeof next === "object" && "error" in next && (next as { error?: unknown }).error)) setDirty(false);
      } catch (err) {
        // A redirect() from the action is a navigation, not a failure: let Next.js handle it
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
          setDirty(false);
          throw err;
        }
        setState({ error: OFFLINE_ERROR } as S);
      } finally {
        running.current = false;
      }
    });
  }

  /** Put on the <form> to track unsaved changes (used with warnUnsaved). */
  const onChange = () => setDirty(true);
  return [state, onSubmit, pending, { dirty, onChange }] as const;
}

/** Warns before leaving the page (refresh, close, back) while a form has unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/** Wraps a server action call so a dropped connection becomes `{ error }` instead of an uncaught failure. */
export function offlineSafe<T>(call: Promise<T>): Promise<T | { error: string }> {
  return call.catch((err) => {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
    return { error: OFFLINE_ERROR };
  });
}

"use client";

import { useState, useTransition } from "react";

/**
 * Like React's useActionState, but the form keeps what the person typed.
 * (React resets a form after its action runs, which would wipe their input
 * whenever the server says something needs fixing.)
 *
 * Usage: const [state, onSubmit, pending] = useFormAction(myServerAction);
 *        <form onSubmit={onSubmit}>…</form>
 */
export function useFormAction<S>(action: (prev: S, fd: FormData) => Promise<S>) {
  const [state, setState] = useState<S>(undefined as S);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Include the clicked button's name/value (e.g. "Save and continue")
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(async () => {
      setState(await action(state, fd));
    });
  }

  return [state, onSubmit, pending] as const;
}

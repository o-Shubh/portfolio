"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { unsubscribeDigest } from "@/app/actions/digest";
import { offlineSafe } from "@/lib/use-form-action";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  if (state.ok)
    return (
      <p role="status" className="notice-success mt-6">
        Done. You&apos;re unsubscribed from the weekly email. You can turn it back on in{" "}
        <Link href="/account/notifications" className="font-medium underline">
          Notifications
        </Link>
        .
      </p>
    );
  return (
    <>
      <button
        type="button"
        className="btn-primary mt-6 w-full"
        disabled={pending}
        onClick={() => start(async () => setState((await offlineSafe(unsubscribeDigest(token))) as { ok?: boolean; error?: string }))}
      >
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </button>
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
    </>
  );
}

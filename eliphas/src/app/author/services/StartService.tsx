"use client";

import { useState, useTransition } from "react";
import { createServiceOrder } from "@/app/actions/services";

export function StartService({ code, label }: { code: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => start(async () => setError((await createServiceOrder(code))?.error))}>
        {pending ? "Starting…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

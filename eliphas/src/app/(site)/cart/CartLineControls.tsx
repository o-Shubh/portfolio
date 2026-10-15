"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeFromCart, setCartQty } from "@/app/actions/cart";

/** Copies stepper and remove button for one book in the cart. */
export function CartLineControls({ bookId, title, qty, maxQty, available }: { bookId: string; title: string; qty: number; maxQty: number; available: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => ReturnType<typeof setCartQty>) =>
    start(async () => {
      const res = await fn();
      setError("error" in res ? res.error : null);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {available && (
        <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1" aria-busy={pending}>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40" onClick={() => run(() => setCartQty(bookId, qty - 1))} disabled={pending || qty <= 1} aria-label={`One less copy of ${title}`}>
            <Minus className="h-4 w-4" />
          </button>
          <output className="w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Copies of ${title}`}>
            {qty}
          </output>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40" onClick={() => run(() => setCartQty(bookId, qty + 1))} disabled={pending || qty >= maxQty} aria-label={`One more copy of ${title}`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <button type="button" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted hover:text-danger disabled:opacity-40" onClick={() => run(() => removeFromCart(bookId))} disabled={pending} aria-label={`Remove ${title}`}>
        <Trash2 className="h-4 w-4" aria-hidden /> Remove
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

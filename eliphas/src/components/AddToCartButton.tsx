"use client";

import { Check, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { offlineSafe } from "@/lib/use-form-action";

/** Adds one copy to the cart, then offers a link to the cart. */
export function AddToCartButton({ bookId, className = "", compact = false, title }: { bookId: string; className?: string; compact?: boolean; title?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: true } | { error: string } | null>(null);

  if (state && "ok" in state) {
    return (
      <Link href="/cart" className={`btn-ghost ${className}`} aria-live="polite">
        <Check className="h-4 w-4 text-success" aria-hidden /> {compact ? "In cart" : "Added · View cart"}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={`btn-ghost ${className}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await offlineSafe(addToCart(bookId));
            setState("error" in res ? res : { ok: true });
            router.refresh();
          })
        }
      >
        <ShoppingCart className="h-4 w-4" aria-hidden />{" "}
        {compact ? (
          <>
            <span className={pending ? "" : "max-sm:sr-only"}>{pending ? "…" : "Add"}</span>
            {title && <span className="sr-only"> {title} to cart</span>}
          </>
        ) : pending ? (
          "Adding…"
        ) : (
          "Add to cart"
        )}
      </button>
      {state && "error" in state && (
        <p role="alert" className={`w-full text-sm text-danger ${compact ? "relative z-10 text-xs" : ""}`}>
          {state.error}{" "}
          <Link href="/cart" className="underline">
            View cart
          </Link>
        </p>
      )}
    </>
  );
}

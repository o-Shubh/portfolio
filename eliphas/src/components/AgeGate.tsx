"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { confirmAdult } from "@/app/actions/mature";
import { offlineSafe } from "@/lib/use-form-action";

/** Shown instead of an 18+ book until the visitor confirms they are 18 or older. */
export function AgeGate({ title, back = "/books" }: { title: string; back?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="container-x flex justify-center py-12 md:py-20" data-testid="age-gate">
      <div className="card w-full max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tint-danger text-lg font-semibold text-danger">18+</span>
        <h1 className="display mt-4 text-2xl leading-tight">This book is for readers 18 and over</h1>
        <p className="mt-2 text-muted">
          <span className="font-medium text-fg">{title}</span> has mature themes, such as strong language or violence.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            className="btn-primary min-h-12"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await offlineSafe(confirmAdult());
                router.refresh();
              })
            }
          >
            {pending ? "One moment…" : "I'm 18 or older, show it"}
          </button>
          <Link href={back} className="btn-ghost min-h-12">
            Go back
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">We remember your answer on this device. You can turn 18+ books off again in Settings.</p>
      </div>
    </div>
  );
}

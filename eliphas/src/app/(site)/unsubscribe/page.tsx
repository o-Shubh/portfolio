import type { Metadata } from "next";
import { UnsubscribeButton } from "./UnsubscribeButton";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

/** From the link in the weekly email. A button (not the link itself) unsubscribes, so email scanners can't. */
export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const t = (await searchParams).t;
  const token = typeof t === "string" ? t : "";
  return (
    <div className="container-x flex justify-center py-12 md:py-16">
      <div className="card w-full max-w-md text-center">
        <h1 className="display text-2xl">Stop the weekly email?</h1>
        <p className="mt-2 text-muted">You won&apos;t get the weekly round-up any more. Order updates are separate and not affected.</p>
        <UnsubscribeButton token={token} />
      </div>
    </div>
  );
}

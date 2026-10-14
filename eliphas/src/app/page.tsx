import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

// Temporary homepage. The full public website is built in milestone 2.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16">
        <p className="font-semibold uppercase tracking-[0.2em] text-deodar dark:text-success">Print on demand · India</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold md:text-6xl">Your book, printed and delivered across India.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Publish in Hindi or English. No upfront cost and no stock to store — every copy is printed when a reader orders it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-accent">
            Start publishing
          </Link>
        </div>
      </main>
    </>
  );
}

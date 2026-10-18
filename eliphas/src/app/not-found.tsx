import { Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center bg-surface-2/60 px-4 py-16">
      <div className="w-full max-w-md rounded-[18px] bg-surface p-8 text-center shadow-sheet ring-1 ring-line">
        <Logo className="mx-auto h-12" />
        <p className="mono mt-8 text-xs tracking-[0.06em] text-muted uppercase">Error 404</p>
        <h1 className="display mt-2 text-3xl">Page not found</h1>
        <p className="mt-2 text-muted">This page may have moved, or the book is no longer available.</p>
        <form action="/books" role="search" className="mt-6 flex gap-2">
          <label htmlFor="nf-q" className="sr-only">
            Search books
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input id="nf-q" name="q" type="search" placeholder="Search books and authors" className="field pl-10" />
          </div>
        </form>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/" className="btn-primary">
            Home
          </Link>
          <Link href="/books" className="btn-ghost">
            Bookstore
          </Link>
        </div>
      </div>
    </main>
  );
}

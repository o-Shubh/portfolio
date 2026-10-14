import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">This page may have moved, or the book is no longer available.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/books" className="btn-ghost">
          Bookstore
        </Link>
      </div>
    </main>
  );
}

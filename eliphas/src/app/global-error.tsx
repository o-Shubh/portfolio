"use client";

/** Last-resort error page when even the main layout fails. Has its own minimal styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#17214a",
        }}
      >
        <title>Something went wrong — Eliphas Indicus</title>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontWeight: 600, fontSize: 30, margin: "0 0 8px" }}>Something went wrong.</h1>
          <p style={{ color: "#57534e", margin: 0 }}>Please try again in a moment.</p>
          {error.digest && <p style={{ color: "#57534e", fontSize: 12 }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 24, minHeight: 44, padding: "0 20px", border: 0, borderRadius: 999, background: "#17214a", color: "#fff", fontSize: 15, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

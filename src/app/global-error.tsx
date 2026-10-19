"use client";

import "./globals.css";

// Last resort when the root layout itself fails: it replaces the whole
// document, so it brings its own <html> and <body>.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper p-8 text-center text-ink">
        <p className="eyebrow text-muted">Atelier</p>
        <h1 className="text-title">Something went wrong</h1>
        <p className="max-w-reading text-muted">Please try again in a moment.</p>
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          Try again
        </button>
        {error.digest && <p className="text-ui text-muted">Reference: {error.digest}</p>}
      </body>
    </html>
  );
}

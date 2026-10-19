"use client";

import Link from "next/link";
import { useEffect } from "react";

// A failed render or read below the root layout. The message never repeats
// the error itself: details stay in the server logs, keyed by the digest.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? error.name);
  }, [error]);

  return (
    <main className="shell flex flex-1 flex-col items-center justify-center gap-6 py-section text-center">
      <p className="eyebrow text-muted">Something went wrong</p>
      <h1 className="text-display">We couldn&rsquo;t load this page</h1>
      <p className="max-w-reading text-lead text-muted">
        This is on our side, not something you did. Please try again in a
        moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Back to the homepage
        </Link>
      </div>
      {error.digest && (
        <p className="text-ui text-muted">Reference: {error.digest}</p>
      )}
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that asks first. The question is the browser's own
 * confirm(): keyboard and screen-reader friendly with nothing to build. The
 * action re-checks everything server-side whatever was clicked here.
 */
export function ConfirmButton({
  children,
  question,
  pendingLabel = "Saving…",
  tone = "secondary",
  className = "",
}: {
  children: ReactNode;
  question: string;
  pendingLabel?: string;
  tone?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "primary"
      ? "btn-primary"
      : tone === "danger"
        ? "btn-secondary border-alert text-alert"
        : "btn-secondary";
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
      className={`btn btn-sm ${toneClass} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "btn btn-primary btn-sm",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

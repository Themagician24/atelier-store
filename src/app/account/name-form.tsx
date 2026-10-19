"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { refreshHeaderSession } from "@/components/session-provider";
import { authClient } from "@/lib/auth-client";
import { MAX_ACCOUNT_NAME, normalizeAccountName } from "@/lib/display-name";

/*
 * Through the auth client to /api/auth/update-user, like sign-in: the
 * session is checked there and the database hook in src/lib/auth.ts
 * normalises the name again. Only the name is sent.
 */
export function NameForm({ name }: { name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = normalizeAccountName(new FormData(event.currentTarget).get("name"));
    if (!next) {
      setError(`Enter a name of 1 to ${MAX_ACCOUNT_NAME} characters.`);
      return;
    }
    setPending(true);
    setError(null);
    const { error: failed } = await authClient.updateUser({ name: next });
    setPending(false);
    if (failed) {
      setError("We couldn't save your name. Please try again.");
      return;
    }
    setEditing(false);
    setSaved(true);
    router.refresh();
    void refreshHeaderSession();
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-lead wrap-anywhere">{name}</span>
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
          className="link text-ui"
        >
          Edit<span className="sr-only"> name</span>
        </button>
        <p aria-live="polite" className="w-full text-ui text-muted">
          {saved ? "Name saved." : ""}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="account-name" className="sr-only">
        Name
      </label>
      <input
        id="account-name"
        name="name"
        defaultValue={name}
        autoComplete="name"
        maxLength={MAX_ACCOUNT_NAME}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "account-name-error" : undefined}
        autoFocus
        className="field"
      />
      {error && (
        <p id="account-name-error" role="alert" className="text-ui text-alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

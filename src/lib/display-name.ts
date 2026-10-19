// The greeting in the header. Better Auth stores one `name` field, so the
// first name is its first word; nothing here is ever read from the browser.

const MAX_FIRST_NAME = 24;

/** First word of the account name, or null when there is nothing usable. */
export function firstName(name: string | null | undefined): string | null {
  if (typeof name !== "string") return null;
  // Control characters out, whitespace collapsed.
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  const [first] = clean.split(/\s+/);
  if (!first) return null;
  return first.length > MAX_FIRST_NAME
    ? `${first.slice(0, MAX_FIRST_NAME - 1)}…`
    : first;
}

/** "Hi, Jeff", or a neutral label when the name is unusable. */
export function greeting(first: string | null): string {
  return first ? `Hi, ${first}` : "Your account";
}

export const MAX_ACCOUNT_NAME = 80;

/**
 * The account name as stored: control characters out, whitespace collapsed,
 * 1–80 characters. Null when nothing usable is left. Better Auth's database
 * hooks apply it to sign-up and to every name change.
 */
export function normalizeAccountName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length === 0 || clean.length > MAX_ACCOUNT_NAME) return null;
  return clean;
}

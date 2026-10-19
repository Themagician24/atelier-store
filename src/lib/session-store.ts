// What the header shows about the visitor: who is signed in and how many
// pieces are in their bag. The header is in the static shell and reads no
// session on the server, so this is filled from /api/me after hydration and
// nudged by the bag actions, which return the new count.
//
// Pure: no window, no fetch of its own. src/components/session-provider.tsx
// wires it to the browser.

export type HeaderUser = { firstName: string | null; isAdmin: boolean };

export type HeaderSession = {
  /** "loading" until /api/me has answered once. */
  status: "loading" | "ready";
  user: HeaderUser | null;
  bagCount: number;
};

export type MeResponse = { user: HeaderUser | null; bagCount: number };

type Listener = () => void;

export const INITIAL_SESSION: HeaderSession = { status: "loading", user: null, bagCount: 0 };

export function createSessionStore() {
  let state: HeaderSession = INITIAL_SESSION;
  // Bumped by every count an action reports, so a slow /api/me answer can't
  // put back an older count. The user part of that answer always applies:
  // an action knows the count, never who is signed in.
  let countVersion = 0;
  const listeners = new Set<Listener>();

  function set(next: HeaderSession) {
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    get: (): HeaderSession => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Starts a fetch. `apply` always takes the user; it takes the count only
     * if no action reported a newer one meanwhile, and says whether it did.
     */
    begin() {
      const started = countVersion;
      return (response: MeResponse) => {
        const countIsCurrent = countVersion === started;
        set({
          status: "ready",
          user: response.user,
          bagCount: countIsCurrent ? clampCount(response.bagCount) : state.bagCount,
        });
        return countIsCurrent;
      };
    },
    /** A bag action reported the new total. Who is signed in is unchanged. */
    setBagCount(count: number) {
      countVersion += 1;
      set({ ...state, bagCount: clampCount(count) });
    },
    /** Signed out: the public header again. */
    clear() {
      countVersion += 1;
      set({ status: "ready", user: null, bagCount: 0 });
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;

function clampCount(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : 0;
}

/** "Bag", "Bag, 1 item", "Bag, 5 items": the bag link's accessible name. */
export function bagLabel(count: number): string {
  if (count <= 0) return "Bag";
  return `Bag, ${count} ${count === 1 ? "item" : "items"}`;
}

/** Badge text: past 99 the exact number stops helping. */
export function badgeText(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

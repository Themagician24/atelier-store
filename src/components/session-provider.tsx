"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  createSessionStore,
  INITIAL_SESSION,
  type HeaderSession,
  type MeResponse,
} from "@/lib/session-store";

// One store per tab. The header reads it; the bag actions write to it.
const store = createSessionStore();

export function useHeaderSession(): HeaderSession {
  return useSyncExternalStore(store.subscribe, store.get, () => INITIAL_SESSION);
}

export const setBagCount = store.setBagCount;
export const clearHeaderSession = store.clear;

let inflight: AbortController | null = null;

/** Re-reads /api/me; a newer write from an action wins over a slow answer. */
export async function refreshHeaderSession(): Promise<void> {
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;
  const apply = store.begin();
  try {
    const res = await fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!res.ok) return;
    apply((await res.json()) as MeResponse);
  } catch {
    // Offline or aborted: keep what the header shows.
  }
}

/*
 * Refreshes on every navigation (sign-in, sign-out and checkout all land on
 * a new path), when the tab comes back into view, and when a page is restored
 * from the back/forward cache.
 */
export function SessionSync() {
  const pathname = usePathname();

  useEffect(() => {
    void refreshHeaderSession();
  }, [pathname]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refreshHeaderSession();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void refreshHeaderSession();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}

/** Rendered by pages that already know the bag total, e.g. /bag. */
export function BagCountSync({ count }: { count: number }) {
  useEffect(() => {
    setBagCount(count);
  }, [count]);
  return null;
}

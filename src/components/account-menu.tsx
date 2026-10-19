"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { signOut } from "@/app/(auth)/actions";
import { AccountIcon, BagIcon } from "@/components/nav-icons";
import {
  clearHeaderSession,
  useHeaderSession,
} from "@/components/session-provider";
import { greeting } from "@/lib/display-name";
import { badgeText, bagLabel } from "@/lib/session-store";

export const accountLinks = [
  { label: "Account overview", href: "/account" },
  { label: "Personal details", href: "/account#details" },
  { label: "Orders", href: "/account/orders" },
] as const;

/** Bag icon with the live piece count. The badge never shifts the layout. */
export function BagLink({ className = "" }: { className?: string }) {
  const session = useHeaderSession();
  const count = session.bagCount;
  const badge = badgeText(count);

  return (
    <Link
      href="/bag"
      aria-label={bagLabel(count)}
      title="Bag"
      className={`btn btn-icon relative ${className}`}
    >
      <BagIcon />
      {badge && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] leading-none font-medium text-paper tabular-nums"
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/*
 * Signed out: an icon link to sign in. Signed in: "Hi, Jeff" and a menu.
 * The menu follows the disclosure pattern (a button and a list of links):
 * Escape and outside clicks close it and focus returns to the button;
 * arrow keys move between items.
 */
export function AccountMenu() {
  const session = useHeaderSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (session.status === "loading" || !session.user) {
    // Same footprint while loading, so nothing jumps when the name arrives.
    return (
      <Link
        href={session.status === "loading" ? "/account" : "/sign-in"}
        aria-label={session.status === "loading" ? "Account" : "Sign in"}
        title={session.status === "loading" ? "Account" : "Sign in"}
        className="btn btn-icon"
      >
        <AccountIcon />
      </Link>
    );
  }

  const { user } = session;
  const label = greeting(user.firstName);
  const items = [
    ...accountLinks,
    ...(user.isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  function focusItem(delta: number) {
    const nodes = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [],
    );
    if (nodes.length === 0) return;
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const next =
      delta === Infinity
        ? nodes.length - 1
        : delta === -Infinity
          ? 0
          : (index + delta + nodes.length) % nodes.length;
    nodes[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (!open) return;
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      Home: -Infinity,
      End: Infinity,
    };
    if (event.key in moves) {
      event.preventDefault();
      focusItem(moves[event.key]);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="btn btn-icon gap-2 2xl:w-auto 2xl:px-2.5"
      >
        <AccountIcon />
        <span className="sr-only 2xl:not-sr-only 2xl:max-w-40 2xl:truncate 2xl:text-ui">
          {label}
        </span>
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-1 w-60 border bg-paper py-2 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)] motion-safe:animate-[nav-drop_180ms_var(--ease-standard)]"
      >
        <p className="truncate px-4 pt-1 pb-3 text-ui text-muted 2xl:hidden">
          {label}
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                data-menu-item
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center px-4 hover:bg-mist focus-visible:bg-mist"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <form
          action={signOut}
          onSubmit={() => clearHeaderSession()}
          className="mt-2 border-t pt-2"
        >
          <button
            type="submit"
            data-menu-item
            className="flex min-h-11 w-full items-center px-4 text-left hover:bg-mist focus-visible:bg-mist"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

/** The drawer's version: the same entries, laid out as full-width rows. */
export function AccountDrawerLinks() {
  const session = useHeaderSession();
  const user = session.user;

  if (!user) {
    return (
      <>
        <Link href="/sign-in" className="btn btn-primary">
          Sign in
        </Link>
        <BagDrawerButton />
      </>
    );
  }

  return (
    <>
      <p className="col-span-2 pb-1 text-ui text-muted">
        {greeting(user.firstName)}
      </p>
      {accountLinks.map((item) => (
        <Link key={item.href} href={item.href} className="btn btn-secondary">
          {item.label === "Account overview" ? "Account" : item.label}
        </Link>
      ))}
      <BagDrawerButton />
      {user.isAdmin && (
        <Link href="/admin" className="btn btn-secondary">
          Admin
        </Link>
      )}
      <form
        action={signOut}
        onSubmit={() => clearHeaderSession()}
        className="col-span-2"
      >
        <button type="submit" className="btn btn-primary btn-block">
          Sign out
        </button>
      </form>
    </>
  );
}

function BagDrawerButton() {
  const session = useHeaderSession();
  const count = session.bagCount;
  return (
    <Link href="/bag" aria-label={bagLabel(count)} className="btn btn-secondary">
      Bag{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}

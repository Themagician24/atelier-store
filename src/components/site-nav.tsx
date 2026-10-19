"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import {
  AccountDrawerLinks,
  AccountMenu,
  BagLink,
} from "@/components/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/nav-icons";
import { NavSearch } from "@/components/nav-search";
import { SessionSync } from "@/components/session-provider";
import { Price } from "@/components/price";
import { currency } from "@/lib/format";
import type { Navigation, NavSection } from "@/lib/nav-types";
import { stockCopy, stockTone } from "@/lib/stock";

// Hover intent: a short delay before opening so sweeping the pointer across
// the bar doesn't flash every menu, a longer one before closing so a
// diagonal move into the panel doesn't drop it.
const OPEN_DELAY = 90;
const CLOSE_DELAY = 160;
const TILE_COUNT = 4;

/*
 * Desktop (xl+): wordmark left, one link per section centred, search /
 * account / bag right. Hovering or focusing a section opens its panel: the
 * section's pieces by name with prices, the newest as photo tiles. Without JS
 * every link still works, the panels just stay shut.
 * Below xl: menu + search left, wordmark centred, account + bag right; the
 * menu is a full-screen drawer with one accordion per section.
 */
export function SiteNav({ navigation }: { navigation: Navigation }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  function schedule(slug: string | null, delay: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenSlug(slug), delay);
  }

  function closeNow() {
    clearTimeout(timer.current);
    setOpenSlug(null);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // "/" or ⌘K / Ctrl+K opens search from anywhere outside a text field.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing =
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const shortcut =
        (event.key === "/" && !typing) ||
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
      if (!shortcut) return;
      event.preventDefault();
      setOpenSlug(null);
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openSearch() {
    closeNow();
    setDrawerOpen(false);
    setSearchOpen(true);
  }

  return (
    <header
      className="sticky top-0 z-40 border-b bg-paper"
      onMouseLeave={() => schedule(null, CLOSE_DELAY)}
      onKeyDown={(event) => event.key === "Escape" && closeNow()}
    >
      {/* Dims the page under an open panel; pointing at it closes the panel. */}
      <div
        aria-hidden="true"
        onMouseEnter={closeNow}
        className={`fixed inset-x-0 top-(--header-height) bottom-0 bg-ink/20 transition-opacity duration-300 ease-standard max-xl:hidden ${
          openSlug ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div className="shell grid h-(--header-height) grid-cols-[1fr_auto_1fr] items-center gap-6">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
            aria-haspopup="dialog"
            className="btn btn-icon -ml-2.5 xl:hidden"
          >
            <MenuIcon />
          </button>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            aria-haspopup="dialog"
            className="btn btn-icon xl:hidden"
          >
            <SearchIcon />
          </button>
          <Link href="/" className="wordmark hidden items-center gap-2.5 xl:inline-flex">
            <BrandMark />
            Atelier
          </Link>
        </div>

        <Link href="/" className="wordmark inline-flex items-center gap-2 xl:hidden">
          <BrandMark className="h-[18px] w-auto md:h-5" />
          Atelier
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-6 2xl:gap-9">
            {navigation.sections.map((section) => (
              <li
                key={section.slug}
                onMouseEnter={() =>
                  schedule(section.slug, openSlug ? 0 : OPEN_DELAY)
                }
                onFocus={() => {
                  clearTimeout(timer.current);
                  setOpenSlug(section.slug);
                }}
                onBlur={(event: FocusEvent<HTMLLIElement>) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    schedule(null, 0);
                  }
                }}
              >
                <Link
                  href={section.href}
                  onClick={closeNow}
                  aria-expanded={openSlug === section.slug}
                  aria-current={pathname === section.href ? "page" : undefined}
                  className={`eyebrow link-quiet flex h-(--header-height) items-center ${
                    openSlug === section.slug ? "decoration-current" : ""
                  }`}
                >
                  {section.label}
                </Link>
                <MegaPanel
                  section={section}
                  open={openSlug === section.slug}
                  onNavigate={closeNow}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Who is signed in and the bag count arrive after hydration from
            /api/me: the header itself stays in the static shell. */}
        <div className="flex items-center justify-end">
          <SessionSync />
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            aria-haspopup="dialog"
            aria-keyshortcuts="/ Control+K Meta+K"
            title="Search ( / )"
            className="btn btn-icon hidden xl:inline-flex"
          >
            <SearchIcon />
          </button>
          <AccountMenu />
          <BagLink className="-mr-2.5" />
        </div>
      </div>

      <MobileDrawer
        navigation={navigation}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSearch={openSearch}
      />
      <NavSearch
        navigation={navigation}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  );
}

function MegaPanel({
  section,
  open,
  onNavigate,
}: {
  section: NavSection;
  open: boolean;
  onNavigate: () => void;
}) {
  const tiles = section.products.slice(0, TILE_COUNT);

  return (
    // Positioned against the sticky header, full width under it. `hidden`
    // keeps closed panels out of the tab order and the accessibility tree.
    <div
      hidden={!open}
      className="absolute inset-x-0 top-full border-b bg-paper motion-safe:animate-[nav-drop_240ms_var(--ease-standard)]"
    >
      <div className="shell grid grid-cols-[minmax(14rem,1fr)_3fr] gap-12 py-10 xl:gap-20">
        <div className="flex flex-col">
          <p className="eyebrow text-muted">
            {section.label}
            <span className="ml-2">{section.pieceCount}</span>
          </p>
          <ul className="mt-5 flex flex-col">
            {section.products.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onNavigate}
                  className="group flex min-h-9 items-baseline justify-between gap-4"
                >
                  <span className="link-quiet group-hover:decoration-current">
                    {product.name}
                  </span>
                  <span className="shrink-0 text-ui text-muted">
                    {currency(product.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={section.href}
            onClick={onNavigate}
            className="link-cta mt-8 self-start"
          >
            View all {section.label}
          </Link>
        </div>

        <ul className="grid grid-cols-4 gap-tile">
          {tiles.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/products/${product.slug}`}
                onClick={onNavigate}
                tabIndex={-1}
                className="group block"
              >
                <div className="media-frame">
                  <Image
                    src={product.image.url}
                    alt={product.image.alt}
                    fill
                    sizes="(min-width: 80rem) 16vw, 18vw"
                    className="transition-transform duration-700 ease-standard motion-safe:group-hover:scale-103"
                  />
                </div>
                <div className="mt-3 flex flex-col pr-2">
                  <p className="truncate">{product.name}</p>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Price
                      price={product.price}
                      compareAt={product.compareAt}
                      className="text-muted"
                    />
                    {product.stock !== "in-stock" && (
                      <p className={`text-ui ${stockTone[product.stock]}`}>
                        <span aria-hidden="true">· </span>
                        {stockCopy[product.stock]}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileDrawer({
  navigation,
  open,
  onClose,
  onSearch,
}: {
  navigation: Navigation;
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      onClose={onClose}
      // Any link followed inside the drawer closes it.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-paper p-0 text-ink backdrop:bg-ink/30 sm:max-w-md motion-safe:animate-[nav-slide_280ms_var(--ease-standard)] xl:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-(--header-height) shrink-0 items-center justify-between border-b px-gutter">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="btn btn-icon -ml-2.5"
          >
            <CloseIcon />
          </button>
          <Link href="/" className="wordmark inline-flex items-center gap-2">
            <BrandMark className="h-[18px] w-auto" />
            Atelier
          </Link>
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search"
            className="btn btn-icon -mr-2.5"
          >
            <SearchIcon />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-gutter py-4">
          <ul>
            {navigation.sections.map((section) => (
              <li key={section.slug} className="border-b">
                <details className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between font-display text-title [&::-webkit-details-marker]:hidden">
                    {section.label}
                    <span className="flex items-center gap-3">
                      <span className="eyebrow font-sans text-muted">
                        {section.pieceCount}
                      </span>
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M0 6h12" />
                        <path d="M6 0v12" className="group-open:hidden" />
                      </svg>
                    </span>
                  </summary>
                  <ul className="flex flex-col pb-5">
                    {section.products.map((product) => (
                      <li key={product.slug}>
                        <Link
                          href={`/products/${product.slug}`}
                          className="flex min-h-11 items-center gap-3"
                        >
                          <div className="media-frame w-9 shrink-0">
                            <Image
                              src={product.image.url}
                              alt=""
                              fill
                              sizes="36px"
                            />
                          </div>
                          <span className="min-w-0 flex-1 truncate">
                            {product.name}
                          </span>
                          <span className="text-ui text-muted">
                            {currency(product.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                    <li className="mt-4">
                      <Link href={section.href} className="link-cta">
                        View all {section.label}
                      </Link>
                    </li>
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t px-gutter py-4">
          <AccountDrawerLinks />
          <Link
            href="/help/contact"
            className="eyebrow link-quiet col-span-2 mt-2 text-center text-muted"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </dialog>
  );
}

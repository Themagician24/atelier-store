import Link from "next/link";
import { mainNav } from "@/lib/sample-data";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-paper">
      <div className="shell grid h-(--header-height) grid-cols-[1fr_auto_1fr] items-center">
        <div>
          <Link
            href="/help/contact"
            className="eyebrow link-quiet hidden md:inline"
          >
            Contact Us
          </Link>
        </div>

        <Link href="/" className="wordmark">
          Atelier
        </Link>

        <div className="flex items-center justify-end gap-2 md:gap-4">
          <Link href="/bag" aria-label="Bag" className="btn btn-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              aria-hidden="true"
            >
              <path d="M5 8h14l-1 13H6L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </Link>

          {/* Native disclosure: works without client JS. The panel anchors
              to the sticky header, full width under it. */}
          <details className="group">
            <summary className="eyebrow -mr-2 flex h-11 cursor-pointer list-none items-center gap-2 px-2 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.25}
                aria-hidden="true"
              >
                <path
                  className="group-open:hidden"
                  d="M1 4.5h14M1 11.5h14"
                />
                <path
                  className="hidden group-open:block"
                  d="M2.5 2.5l11 11M13.5 2.5l-11 11"
                />
              </svg>
              {/* Icon-only on phones so the wordmark stays centred. */}
              <span className="sr-only group-open:hidden md:not-sr-only">
                Menu
              </span>
              <span className="hidden group-open:inline group-open:max-md:sr-only">
                Close
              </span>
            </summary>
            <nav
              aria-label="Main"
              className="absolute inset-x-0 top-full border-b bg-paper"
            >
              <ul className="shell flex flex-col py-6 md:py-10">
                {mainNav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="link-quiet flex min-h-12 items-center font-display text-title"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

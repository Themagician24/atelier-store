import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** The frame shared by the client-services pages. */
export function HelpPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="shell flex-1 py-section">
        <article className="mx-auto flex max-w-reading flex-col gap-8">
          <nav aria-label="Breadcrumb">
            <ol className="eyebrow flex gap-2 text-muted">
              <li>
                <Link href="/" className="link-quiet">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{eyebrow}</li>
            </ol>
          </nav>
          <h1 className="text-display">{title}</h1>
          <div className="flex flex-col gap-8 text-lead text-ink-soft [&_h2]:font-display [&_h2]:text-title [&_h2]:text-ink">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

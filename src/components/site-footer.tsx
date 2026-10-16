import Link from "next/link";
import { footerNav } from "@/lib/sample-data";

// The one dark band on the site: closes the page the way a lookbook ends.
export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="shell grid gap-10 py-section md:grid-cols-[2fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <p className="wordmark">Atelier</p>
          <p className="max-w-reading text-paper/60">
            Ready-to-wear, bags and shoes, cut and finished in our own
            workshops, in small runs.
          </p>
        </div>

        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="eyebrow font-sans">{group.title}</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-quiet text-paper/60">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="shell border-t border-paper/15 py-6">
        <p className="eyebrow text-paper/60">© Atelier</p>
      </div>
    </footer>
  );
}

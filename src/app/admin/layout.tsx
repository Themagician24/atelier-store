import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/session";
import { AdminNav, AdminNavFallback } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Atelier admin" },
  robots: { index: false },
};

// The storefront header is public chrome and stays in the static shell. The
// admin chrome itself (title, section nav) renders only after requireAdmin(),
// so a customer gets the 404 without ever seeing what the area contains.
//
// This gate is not the security boundary on its own: every page calls
// requireAdmin() again (one cached read per request), and every Server
// Action calls it itself, because a layout check never protects an action.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main className="shell flex-1 py-section">
        <Suspense fallback={null}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      </main>
    </>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <p className="eyebrow mb-3 text-muted">Atelier</p>
      <h1 className="text-display mb-10 md:mb-14">Admin</h1>
      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <Suspense fallback={<AdminNavFallback />}>
          <AdminNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}

/** The header's own height and rule, so nothing moves when it streams in. */
function HeaderFallback() {
  return (
    <div aria-hidden="true" className="sticky top-0 z-40 border-b bg-paper">
      <div className="h-(--header-height)" />
    </div>
  );
}

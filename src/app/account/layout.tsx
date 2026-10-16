import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AccountNav, AccountNavFallback } from "./account-nav";

// Static chrome for every account page: no session read here, so it stays in
// the prerendered shell. Each page reads the user itself, behind Suspense.
//
// The header and the account nav both read usePathname(), which suspends
// under /account/orders/[reference] (the reference is unknown at build
// time). These boundaries keep that route's shell prerenderable; on the
// static account routes the pathname resolves and no fallback ever shows.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main className="shell flex-1 py-section">
        <h1 className="text-display mb-10 md:mb-14">Your account</h1>
        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <Suspense fallback={<AccountNavFallback />}>
            <AccountNav />
          </Suspense>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <SiteFooter />
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

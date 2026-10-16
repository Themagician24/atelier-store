import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your account — Atelier",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section aria-labelledby="page-title" className="shell py-section">
          <div className="section-head">
            <h1 id="page-title" className="text-display">
              Your account
            </h1>
          </div>
          <Suspense fallback={<div className="min-h-48" />}>
            <AccountDetails />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account");
  return (
    <div className="flex max-w-reading flex-col gap-8">
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="eyebrow text-muted">Name</dt>
          <dd className="text-lead">{user.name}</dd>
        </div>
        <div>
          <dt className="eyebrow text-muted">Email</dt>
          <dd className="text-lead">{user.email}</dd>
        </div>
      </dl>
      <form action={signOut}>
        <button type="submit" className="btn btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your account — Atelier",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export default function AccountPage() {
  return (
    <section aria-labelledby="details-title" className="flex max-w-reading flex-col gap-8">
      <h2 id="details-title" className="text-title">
        Account details
      </h2>
      <Suspense fallback={<DetailsSkeleton />}>
        <AccountDetails />
      </Suspense>
    </section>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account");
  const rows = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Sign-in method", value: "Email and password" },
    { label: "Member since", value: memberSince.format(user.createdAt) },
  ];

  return (
    <>
      <dl className="border-t">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 border-b py-5">
            <dt className="eyebrow text-muted">{row.label}</dt>
            <dd className="text-lead wrap-anywhere">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted">
        To change your name or email, contact{" "}
        <Link href="/help/contact" className="link text-ink">
          client services
        </Link>
        .
      </p>
      <Link href="/new-arrivals" className="link-cta self-start">
        Continue shopping
      </Link>
    </>
  );
}

// Same rows and heights as the details, so nothing shifts when they stream in.
function DetailsSkeleton() {
  return (
    <div aria-hidden="true" className="border-t">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-1 border-b py-5">
          <div className="h-4 w-20 bg-mist" />
          <div className="h-[1.7rem] w-40 max-w-full bg-mist" />
        </div>
      ))}
    </div>
  );
}

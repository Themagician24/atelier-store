import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Pagination, readPage } from "@/components/admin/admin-ui";
import { AUDIT_PAGE_SIZE, listAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log" };

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });

const targetHref: Record<string, (id: string) => string> = {
  product: (id) => `/admin/products/${id}`,
  order: (id) => `/admin/orders/${id}`,
  customer: (id) => `/admin/customers/${id}`,
};

export default function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireAdmin("/admin/audit");
  const page = readPage((await searchParams).page);
  const { rows, total } = await listAudit(page);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the back office, newest first. Payment changes come from Stripe and are in each order's history."
      />
      {rows.length === 0 ? (
        <EmptyState>No admin change recorded yet.</EmptyState>
      ) : (
        <ol className="border-t text-ui">
          {rows.map((r) => {
            const href = targetHref[r.targetType]?.(r.targetId);
            return (
              <li key={r.id} className="grid gap-1 border-b py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
                <span className="tabular-nums text-muted">{dateTime.format(r.createdAt)} UTC</span>
                <span className="min-w-0">
                  <span className="text-ink">{r.action}</span> on{" "}
                  {href ? (
                    <Link href={href} className="link">
                      {r.targetId}
                    </Link>
                  ) : (
                    r.targetId
                  )}{" "}
                  <span className="text-muted">by {r.actor ?? "a former admin"}</span>
                  {r.details && (
                    <code className="mt-1 block truncate text-muted">{JSON.stringify(r.details)}</code>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <Pagination page={page} pageSize={AUDIT_PAGE_SIZE} total={total} href={(p) => `/admin/audit?page=${p}`} />
    </>
  );
}

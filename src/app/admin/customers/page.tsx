import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Pagination, readPage, readQuery } from "@/components/admin/admin-ui";
import { CUSTOMERS_PAGE_SIZE, listCustomers } from "@/lib/admin-customers";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };

const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export default function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({
  searchParams,
}: {
  searchParams: PageProps<"/admin/customers">["searchParams"];
}) {
  await requireAdmin("/admin/customers");
  const params = await searchParams;
  const q = readQuery(params.q);
  const page = readPage(params.page);
  const { rows, total } = await listCustomers(q, page);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Registered accounts, newest first. Spent = paid orders minus refunds. Last activity isn't shown: sessions are deleted at sign-out, so it can't be known reliably."
      />

      <form action="/admin/customers" method="get" role="search" className="mb-8 flex max-w-form gap-3">
        <label htmlFor="customer-q" className="sr-only">
          Search by name or email
        </label>
        <input
          id="customer-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name or email"
          className="field min-h-10 flex-1 py-0"
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState>{q ? `No customer matches “${q}”.` : "No customers yet."}</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-ui">
            <caption className="sr-only">Customers, newest first.</caption>
            <thead>
              <tr className="border-b text-muted">
                <th scope="col" className="py-2 font-normal">Customer</th>
                <th scope="col" className="py-2 font-normal">Joined (UTC)</th>
                <th scope="col" className="py-2 font-normal">Account</th>
                <th scope="col" className="py-2 text-right font-normal">Paid orders</th>
                <th scope="col" className="py-2 text-right font-normal">Spent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="max-w-64 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="link block truncate">
                      {c.name}
                    </Link>
                    <span className="block truncate text-muted">{c.email}</span>
                  </td>
                  <td className="py-3 tabular-nums">{day.format(c.createdAt)}</td>
                  <td className="py-3 text-muted">
                    {c.role === "admin" ? "Admin" : "Customer"}
                    {c.activeSessions > 0 ? " · signed in" : ""}
                  </td>
                  <td className="py-3 text-right tabular-nums">{c.paidOrders}</td>
                  <td className="py-3 text-right tabular-nums">{formatCents(c.spentCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={CUSTOMERS_PAGE_SIZE}
        total={total}
        href={(p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`}
      />
    </>
  );
}

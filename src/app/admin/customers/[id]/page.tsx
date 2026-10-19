import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { getCustomer } from "@/lib/admin-customers";
import { formatCents } from "@/lib/format";
import { formatAddress, orderStatusCopy, orderStatusTone } from "@/lib/order-types";
import { requireAdmin } from "@/lib/session";
import { signOutEverywhere } from "../actions";

export const metadata: Metadata = { title: "Customer" };

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

const methodCopy: Record<string, string> = { credential: "Email and password" };

export default function AdminCustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  return (
    <section className="flex flex-col gap-8">
      <Link href="/admin/customers" className="link-cta self-start text-muted">
        <span aria-hidden="true">←</span> All customers
      </Link>
      <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
        <Customer params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

// Only what the store holds and needs. Never shown: password hashes, session
// tokens, IP addresses, user agents or payment details.
async function Customer({
  params,
  searchParams,
}: Pick<PageProps<"/admin/customers/[id]">, "params" | "searchParams">) {
  await requireAdmin("/admin/customers");
  const [{ id }, { revoked }] = await Promise.all([params, searchParams]);
  const customer = USER_ID.test(id) ? await getCustomer(id) : null;
  if (!customer) notFound();
  // A number from our own redirect; anything else shows nothing.
  const revokedCount =
    typeof revoked === "string" && /^\d{1,4}$/.test(revoked) ? Number(revoked) : null;

  const facts = [
    { label: "Internal id", value: customer.id },
    { label: "Name", value: customer.name },
    { label: "Email", value: customer.email },
    { label: "Email verified", value: customer.emailVerified ? "Yes" : "No (verification isn't enabled in this store)" },
    { label: "Role", value: customer.role === "admin" ? "Admin" : "Customer" },
    { label: "Sign-in method", value: customer.signInMethods.map((m) => methodCopy[m] ?? m).join(", ") || "—" },
    { label: "Account created", value: `${day.format(customer.createdAt)} (UTC)` },
    { label: "Profile last updated", value: `${day.format(customer.updatedAt)} (UTC)` },
    { label: "Active sessions", value: String(customer.activeSessions) },
    { label: "Marketing consent", value: "None recorded: the store doesn't collect any" },
  ];

  return (
    <>
      <header className="flex flex-col gap-2">
        <h2 className="text-title wrap-anywhere">{customer.name}</h2>
        <p className="text-ui text-muted">
          {customer.paidOrders} paid {customer.paidOrders === 1 ? "order" : "orders"} · {formatCents(customer.spentCents)} spent
        </p>
      </header>

      {revokedCount !== null && (
        <p role="status" className="border-l-2 border-ink pl-4">
          Signed out of {revokedCount} {revokedCount === 1 ? "session" : "sessions"}.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <dl className="border-t text-ui">
          {facts.map((f) => (
            <div key={f.label} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 border-b py-3">
              <dt className="text-muted">{f.label}</dt>
              <dd className="wrap-anywhere">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="addresses-title" className="flex flex-col gap-3">
            <h3 id="addresses-title" className="eyebrow text-muted">
              Shipping addresses used
            </h3>
            {customer.addresses.length === 0 ? (
              <p className="text-ui text-muted">None yet: addresses are collected by Stripe on paid orders.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-ui">
                {customer.addresses.map((a, i) => (
                  <li key={i} className="border p-3">
                    {(formatAddress(a) ?? []).map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="account-actions" className="flex flex-col gap-3">
            <h3 id="account-actions" className="eyebrow text-muted">
              Account
            </h3>
            <form action={signOutEverywhere}>
              <input type="hidden" name="id" value={customer.id} />
              <ConfirmButton
                question={`Sign ${customer.name} out on every device? They can sign in again with their password.`}
                pendingLabel="Signing out…"
              >
                Sign out on all devices
              </ConfirmButton>
            </form>
            <p className="text-ui text-muted">
              Logged in the audit trail. Roles are changed from the command line only. Deleting or
              anonymising an account isn&rsquo;t available here: orders must be kept for accounting.
            </p>
          </section>
        </div>
      </div>

      <section aria-labelledby="orders-title" className="flex flex-col gap-3 border-t pt-6">
        <h3 id="orders-title" className="eyebrow text-muted">
          Orders
        </h3>
        {customer.orders.length === 0 ? (
          <p className="text-ui text-muted">No order has reached payment yet.</p>
        ) : (
          <table className="w-full text-left text-ui">
            <thead>
              <tr className="border-b text-muted">
                <th scope="col" className="py-2 font-normal">Order</th>
                <th scope="col" className="py-2 font-normal">Placed (UTC)</th>
                <th scope="col" className="py-2 font-normal">Payment</th>
                <th scope="col" className="py-2 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.reference} className="border-b">
                  <td className="py-2">
                    <Link href={`/admin/orders/${o.reference}`} className="link">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="py-2 tabular-nums">{day.format(o.createdAt)}</td>
                  <td className={`py-2 ${orderStatusTone[o.status]}`}>{orderStatusCopy[o.status]}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCents(o.totalCents ?? o.subtotalCents)}
                    {o.refundedCents > 0 && (
                      <span className="block text-muted">{formatCents(o.refundedCents)} refunded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

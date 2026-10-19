import "server-only";
import { count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, session, user, type OrderStatus, type ShippingAddress } from "@/db/schema";
import { auditEntry } from "@/lib/admin-audit";

/*
 * Registered customers for the back office, with only what the business
 * needs: identity, dates, orders and the addresses those orders shipped to.
 * Never selected: password hashes (account.password), session tokens, IPs,
 * user agents, OAuth tokens or anything from Stripe beyond order amounts.
 * Callers have already called requireAdmin().
 */

export const CUSTOMERS_PAGE_SIZE = 25;

/** Money a customer has actually paid: confirmed orders minus refunds. */
const spent = sql<number>`coalesce((
  select sum(coalesce(o.total_cents, 0) - o.refunded_cents) from orders o
  where o.user_id = "user"."id" and o.status in ('paid', 'refunded')
), 0)::int`;
const paidOrders = sql<number>`(
  select count(*) from orders o
  where o.user_id = "user"."id" and o.status in ('paid', 'refunded')
)::int`;
const activeSessions = sql<number>`(
  select count(*) from session s where s.user_id = "user"."id" and s.expires_at > now()
)::int`;

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  paidOrders: number;
  spentCents: number;
  activeSessions: number;
};

function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listCustomers(
  q: string,
  page: number,
): Promise<{ rows: CustomerRow[]; total: number }> {
  const where: SQL | undefined = q
    ? or(ilike(user.name, likeTerm(q)), ilike(user.email, likeTerm(q)))
    : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        paidOrders,
        spentCents: spent,
        activeSessions,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(CUSTOMERS_PAGE_SIZE)
      .offset((page - 1) * CUSTOMERS_PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { rows, total };
}

export type CustomerDetail = CustomerRow & {
  updatedAt: Date;
  signInMethods: string[];
  orders: {
    reference: string;
    createdAt: Date;
    status: OrderStatus;
    totalCents: number | null;
    subtotalCents: number;
    refundedCents: number;
  }[];
  addresses: ShippingAddress[];
};

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      paidOrders,
      spentCents: spent,
      activeSessions,
      // Provider names only ("credential"), never the account rows.
      signInMethods: sql<string[]>`coalesce((select array_agg(distinct a.provider_id) from account a where a.user_id = "user"."id"), '{}')`,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!row) return null;

  const history = await db
    .select({
      reference: orders.reference,
      createdAt: orders.createdAt,
      status: orders.status,
      totalCents: orders.totalCents,
      subtotalCents: orders.subtotalCents,
      refundedCents: orders.refundedCents,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(sql`${orders.userId} = ${id} and ${orders.stripeCheckoutSessionId} is not null`)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  // Distinct addresses the customer's paid orders shipped to.
  const seen = new Set<string>();
  const addresses: ShippingAddress[] = [];
  for (const o of history) {
    if (!o.shippingAddress) continue;
    const key = JSON.stringify(o.shippingAddress);
    if (!seen.has(key)) {
      seen.add(key);
      addresses.push(o.shippingAddress);
    }
  }

  return {
    ...row,
    orders: history.map((o) => ({
      reference: o.reference,
      createdAt: o.createdAt,
      status: o.status,
      totalCents: o.totalCents,
      subtotalCents: o.subtotalCents,
      refundedCents: o.refundedCents,
    })),
    addresses,
  };
}

/** Signs a customer out everywhere by deleting their sessions. */
export async function revokeSessions(actorId: string, customerId: string): Promise<number> {
  const [deleted] = await db.batch([
    db.delete(session).where(eq(session.userId, customerId)).returning({ id: session.id }),
    auditEntry(actorId, "customer.sessions.revoke", "customer", customerId),
  ]);
  return deleted.length;
}

// --- Sign-ups -------------------------------------------------------------------

export const INACTIVE_AFTER_DAYS = 30;

export type SignupStats = {
  total: number;
  newInPeriod: number;
  verified: number;
  /** Older than INACTIVE_AFTER_DAYS with no order that ever reached Stripe. */
  inactive: number;
};

export async function signupStats(from: Date, to: Date): Promise<SignupStats> {
  const result = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where created_at >= ${from.toISOString()}::timestamptz and created_at < ${to.toISOString()}::timestamptz)::int as new_in_period,
      count(*) filter (where email_verified)::int as verified,
      count(*) filter (
        where created_at < now() - make_interval(days => ${INACTIVE_AFTER_DAYS})
          and not exists (
            select 1 from orders o
            where o.user_id = "user".id and o.stripe_checkout_session_id is not null
          )
      )::int as inactive
    from "user"`);
  const r = result.rows[0] as Record<string, number>;
  return {
    total: Number(r.total),
    newInPeriod: Number(r.new_in_period),
    verified: Number(r.verified),
    inactive: Number(r.inactive),
  };
}

export async function recentSignups(from: Date, to: Date, limit = 20) {
  return db
    .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(sql`${user.createdAt} >= ${from.toISOString()}::timestamptz and ${user.createdAt} < ${to.toISOString()}::timestamptz`)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

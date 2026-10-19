import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Definitions, Kpi, KpiGrid, PageHeader, PeriodPicker } from "@/components/admin/admin-ui";
import { TimeSeriesChart } from "@/components/admin/time-series-chart";
import { INACTIVE_AFTER_DAYS, recentSignups, signupStats } from "@/lib/admin-customers";
import { parsePeriod, periodQuery, type Granularity } from "@/lib/admin-period";
import { cumulativeUsers, signupSeries } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sign-ups" };

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const groupings: Granularity[] = ["day", "week", "month"];

export default function AdminSignupsPage({ searchParams }: PageProps<"/admin/signups">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
      <Signups searchParams={searchParams} />
    </Suspense>
  );
}

async function Signups({ searchParams }: { searchParams: PageProps<"/admin/signups">["searchParams"] }) {
  await requireAdmin("/admin/signups");
  const params = await searchParams;
  const base = parsePeriod(params);
  const by = groupings.find((g) => g === params.by) ?? base.granularity;
  const period = { ...base, granularity: by };

  const [stats, perBucket, cumulative, recent] = await Promise.all([
    signupStats(period.from, period.to),
    signupSeries(period),
    cumulativeUsers(period),
    recentSignups(period.from, period.to),
  ]);
  const q = periodQuery(base);

  return (
    <>
      <PageHeader
        title="Sign-ups"
        description="Accounts actually created. Visitors who browse without an account are never counted here."
      />
      <PeriodPicker period={base} basePath="/admin/signups" keep={{ by }} />

      <KpiGrid label="Accounts">
        <Kpi label="New accounts" value={stats.newInPeriod} note={base.label} />
        <Kpi label="All accounts" value={stats.total} />
        <Kpi
          label="Email verified"
          value={stats.verified}
          note="Email verification isn't enabled in this store yet."
        />
        <Kpi label="Inactive" value={stats.inactive} note={`No order in ${INACTIVE_AFTER_DAYS}+ days since joining`} />
      </KpiGrid>

      <nav aria-label="Group by" className="mb-6 flex gap-2">
        {groupings.map((g) => (
          <Link
            key={g}
            href={`/admin/signups?${q}&by=${g}`}
            aria-current={g === by ? "true" : undefined}
            className={`btn btn-sm ${g === by ? "btn-primary" : "btn-secondary"}`}
          >
            By {g}
          </Link>
        ))}
      </nav>

      <div className="grid gap-10 xl:grid-cols-2">
        <TimeSeriesChart title="New accounts" points={perBucket} format="count" granularity={by} />
        <TimeSeriesChart title="Total accounts" points={cumulative} format="count" kind="line" granularity={by} />
      </div>

      <section aria-labelledby="recent-title" className="mt-10 flex flex-col gap-3">
        <h3 id="recent-title" className="eyebrow text-muted">
          Newest accounts in the period
        </h3>
        {recent.length === 0 ? (
          <p className="text-ui text-muted">No account was created in this period.</p>
        ) : (
          <ul className="border-t text-ui">
            {recent.map((u) => (
              <li key={u.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b py-2">
                <Link href={`/admin/customers/${u.id}`} className="link-quiet truncate">
                  {u.name} <span className="text-muted">{u.email}</span>
                </Link>
                <span className="tabular-nums text-muted">{dateTime.format(u.createdAt)} UTC</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Definitions
        items={[
          { term: "New accounts", detail: "Rows created in the user table in the period, by creation time (UTC)." },
          {
            term: "Inactive",
            detail: `Accounts older than ${INACTIVE_AFTER_DAYS} days that have never opened a Stripe checkout. Browsing isn't tied to accounts, so it can't count as activity.`,
          },
          {
            term: "Acquisition source",
            detail: "Not shown: the store doesn't record where visitors come from, and won't without consent.",
          },
        ]}
      />
    </>
  );
}

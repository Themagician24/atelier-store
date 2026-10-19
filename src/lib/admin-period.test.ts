import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buckets,
  fillSeries,
  MAX_CUSTOM_DAYS,
  parsePeriod,
  periodQuery,
  previousPeriod,
} from "./admin-period";

const NOW = new Date("2026-10-18T15:30:00Z");
const iso = (d: Date) => d.toISOString();

describe("parsePeriod", () => {
  test("defaults to the last 30 UTC days, ending tonight", () => {
    const p = parsePeriod({}, NOW);
    assert.equal(p.key, "30d");
    assert.equal(iso(p.to), "2026-10-19T00:00:00.000Z");
    assert.equal(iso(p.from), "2026-09-19T00:00:00.000Z");
    assert.equal(p.days, 30);
    assert.equal(p.granularity, "day");
  });

  test("today is the current UTC day only", () => {
    const p = parsePeriod({ period: "today" }, NOW);
    assert.equal(iso(p.from), "2026-10-18T00:00:00.000Z");
    assert.equal(iso(p.to), "2026-10-19T00:00:00.000Z");
  });

  test("7 and 90 days; long ranges group by week", () => {
    assert.equal(parsePeriod({ period: "7d" }, NOW).days, 7);
    const p = parsePeriod({ period: "custom", from: "2026-01-01", to: "2026-10-18" }, NOW);
    assert.equal(p.granularity, "week");
    assert.equal(parsePeriod({ period: "90d" }, NOW).granularity, "day");
  });

  test("a custom range includes its end date", () => {
    const p = parsePeriod({ period: "custom", from: "2026-10-01", to: "2026-10-03" }, NOW);
    assert.equal(p.key, "custom");
    assert.equal(iso(p.from), "2026-10-01T00:00:00.000Z");
    assert.equal(iso(p.to), "2026-10-04T00:00:00.000Z");
    assert.equal(p.days, 3);
    assert.equal(p.error, null);
  });

  test("bad custom ranges fall back to 30 days with a reason", () => {
    const cases = [
      { from: "2026-10-05", to: "2026-10-01" },
      { from: "2026-10-01", to: "2026-12-01" },
      { from: "2024-01-01", to: "2026-10-01" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "nope", to: "2026-10-01" },
    ];
    for (const c of cases) {
      const p = parsePeriod({ period: "custom", ...c }, NOW);
      assert.equal(p.key, "30d", JSON.stringify(c));
      assert.ok(p.error, JSON.stringify(c));
    }
    assert.ok(MAX_CUSTOM_DAYS >= 365);
  });

  test("an unknown period key is the default, without an error", () => {
    const p = parsePeriod({ period: "forever" }, NOW);
    assert.equal(p.key, "30d");
    assert.equal(p.error, null);
  });

  test("the previous period is the same length, just before", () => {
    const p = parsePeriod({ period: "7d" }, NOW);
    const prev = previousPeriod(p);
    assert.equal(iso(prev.to), iso(p.from));
    assert.equal(prev.to.getTime() - prev.from.getTime(), p.to.getTime() - p.from.getTime());
  });

  test("periodQuery round-trips", () => {
    const p = parsePeriod({ period: "custom", from: "2026-10-01", to: "2026-10-03" }, NOW);
    const params = Object.fromEntries(new URLSearchParams(periodQuery(p)));
    assert.deepEqual(parsePeriod(params, NOW), p);
  });
});

describe("buckets and fillSeries", () => {
  test("one bucket per day, zeros where SQL returned nothing", () => {
    const p = parsePeriod({ period: "custom", from: "2026-10-01", to: "2026-10-03" }, NOW);
    const keys = buckets(p);
    assert.deepEqual(keys, ["2026-10-01", "2026-10-02", "2026-10-03"]);
    assert.deepEqual(fillSeries(keys, [{ bucket: "2026-10-02", value: 4 }]), [
      { bucket: "2026-10-01", value: 0 },
      { bucket: "2026-10-02", value: 4 },
      { bucket: "2026-10-03", value: 0 },
    ]);
  });

  test("weeks start on Monday, like date_trunc('week')", () => {
    // 2026-10-01 is a Thursday.
    const keys = buckets({
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-15T00:00:00Z"),
      granularity: "week",
    });
    assert.deepEqual(keys, ["2026-09-28", "2026-10-05", "2026-10-12"]);
  });

  test("months start on the 1st", () => {
    const keys = buckets({
      from: new Date("2026-08-15T00:00:00Z"),
      to: new Date("2026-10-19T00:00:00Z"),
      granularity: "month",
    });
    assert.deepEqual(keys, ["2026-08-01", "2026-09-01", "2026-10-01"]);
  });
});

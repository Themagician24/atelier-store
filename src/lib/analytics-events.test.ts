import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dayBucket, isLikelyBot, isPrefetch, parseEvent, visitorHash } from "./analytics-events";

describe("parseEvent", () => {
  test("accepts a view or a click on a product slug", () => {
    assert.deepEqual(parseEvent({ slug: "long-wool-coat", type: "view" }), {
      slug: "long-wool-coat",
      type: "view",
    });
    assert.deepEqual(parseEvent({ slug: "bag", type: "click" }), { slug: "bag", type: "click" });
  });

  test("the browser can't claim a bag add or a purchase", () => {
    assert.equal(parseEvent({ slug: "bag", type: "add_to_bag" }), null);
    assert.equal(parseEvent({ slug: "bag", type: "purchase" }), null);
  });

  test("rejects malformed slugs and bodies", () => {
    for (const body of [
      null,
      "view",
      { slug: "../admin", type: "view" },
      { slug: "Bag", type: "view" },
      { slug: "a".repeat(200), type: "view" },
      { type: "view" },
    ]) {
      assert.equal(parseEvent(body), null, JSON.stringify(body));
    }
  });
});

describe("bot and prefetch filtering", () => {
  test("drops crawlers, tools and missing user agents", () => {
    assert.equal(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
    assert.equal(isLikelyBot("curl/8.4.0"), true);
    assert.equal(isLikelyBot("Mozilla/5.0 HeadlessChrome/120"), true);
    assert.equal(isLikelyBot(null), true);
    assert.equal(
      isLikelyBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15"),
      false,
    );
  });

  test("speculative loads are not views", () => {
    assert.equal(isPrefetch(new Headers({ "sec-purpose": "prefetch" })), true);
    assert.equal(isPrefetch(new Headers({ purpose: "prefetch" })), true);
    assert.equal(isPrefetch(new Headers({})), false);
  });
});

describe("visitorHash", () => {
  const secret = "test-secret";

  test("is stable within a day, so a reload is deduplicated", () => {
    const a = visitorHash(secret, "2026-10-18", ["1.2.3.4", "UA"]);
    const b = visitorHash(secret, "2026-10-18", ["1.2.3.4", "UA"]);
    assert.equal(a, b);
  });

  test("changes every day and per visitor, and never contains the IP", () => {
    const today = visitorHash(secret, "2026-10-18", ["1.2.3.4", "UA"]);
    assert.notEqual(today, visitorHash(secret, "2026-10-19", ["1.2.3.4", "UA"]));
    assert.notEqual(today, visitorHash(secret, "2026-10-18", ["5.6.7.8", "UA"]));
    assert.doesNotMatch(today, /1\.2\.3\.4/);
    assert.match(today, /^[0-9a-f]{32}$/);
  });

  test("depends on the server secret", () => {
    assert.notEqual(
      visitorHash("one", "2026-10-18", ["x"]),
      visitorHash("two", "2026-10-18", ["x"]),
    );
  });

  test("days are UTC calendar days", () => {
    assert.equal(dayBucket(new Date("2026-10-18T23:59:59Z")), "2026-10-18");
    assert.equal(dayBucket(new Date("2026-10-19T00:00:00Z")), "2026-10-19");
  });
});

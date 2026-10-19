import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { badgeText, bagLabel, createSessionStore } from "./session-store";

const jeff = { firstName: "Jeff", isAdmin: false };

describe("header session store", () => {
  test("starts loading, then shows the signed-in user and bag count", () => {
    const store = createSessionStore();
    assert.equal(store.get().status, "loading");
    store.begin()({ user: jeff, bagCount: 5 });
    assert.deepEqual(store.get(), { status: "ready", user: jeff, bagCount: 5 });
  });

  test("an action's count updates the badge at once and keeps the user", () => {
    const store = createSessionStore();
    store.begin()({ user: jeff, bagCount: 2 });
    store.setBagCount(5);
    assert.deepEqual(store.get(), { status: "ready", user: jeff, bagCount: 5 });
  });

  test("a slow /api/me answer never overwrites a newer action count", () => {
    const store = createSessionStore();
    const apply = store.begin(); // request in flight with the old count
    store.setBagCount(3); // an add-to-bag lands first
    assert.equal(apply({ user: jeff, bagCount: 1 }), false);
    assert.equal(store.get().bagCount, 3);
  });

  test("…but still signs the user in: the bag page can't make them look signed out", () => {
    // /bag: SessionSync starts the fetch, then BagCountSync reports the count.
    const store = createSessionStore();
    const apply = store.begin();
    store.setBagCount(4);
    apply({ user: jeff, bagCount: 4 });
    assert.deepEqual(store.get(), { status: "ready", user: jeff, bagCount: 4 });
  });

  test("removing the last item empties the badge", () => {
    const store = createSessionStore();
    store.setBagCount(1);
    store.setBagCount(0);
    assert.equal(store.get().bagCount, 0);
  });

  test("sign-out restores the public header", () => {
    const store = createSessionStore();
    store.begin()({ user: { firstName: "Jeff", isAdmin: true }, bagCount: 4 });
    store.clear();
    assert.deepEqual(store.get(), { status: "ready", user: null, bagCount: 0 });
  });

  test("garbage counts are treated as an empty bag", () => {
    const store = createSessionStore();
    store.setBagCount(-2);
    assert.equal(store.get().bagCount, 0);
    store.setBagCount(Number.NaN);
    assert.equal(store.get().bagCount, 0);
  });

  test("subscribers hear every change and can unsubscribe", () => {
    const store = createSessionStore();
    let calls = 0;
    const off = store.subscribe(() => (calls += 1));
    store.setBagCount(1);
    off();
    store.setBagCount(2);
    assert.equal(calls, 1);
  });
});

describe("bag badge wording", () => {
  test("sums quantities, so 2 + 3 pieces read as 5", () => {
    assert.equal(bagLabel(2 + 3), "Bag, 5 items");
    assert.equal(badgeText(2 + 3), "5");
  });

  test("singular, empty and very large bags", () => {
    assert.equal(bagLabel(1), "Bag, 1 item");
    assert.equal(bagLabel(0), "Bag");
    assert.equal(badgeText(0), null);
    assert.equal(badgeText(120), "99+");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyTransition, transitionFor } from "./order-status";

describe("transitionFor / applyTransition", () => {
  test("a paid completed session pays a pending order and fulfils it", () => {
    const t = transitionFor("checkout.session.completed", "paid");
    assert.equal(t?.fulfil, true);
    assert.equal(applyTransition("pending", t), "paid");
  });

  test("an unpaid completed session only marks it processing", () => {
    const t = transitionFor("checkout.session.completed", "unpaid");
    assert.equal(t?.fulfil, false);
    assert.equal(applyTransition("pending", t), "processing");
  });

  test("a delayed payment that succeeds pays a processing order", () => {
    const t = transitionFor("checkout.session.async_payment_succeeded", "paid");
    assert.equal(applyTransition("processing", t), "paid");
  });

  test("a delayed payment that fails marks it payment_failed, unfulfilled", () => {
    const t = transitionFor("checkout.session.async_payment_failed", "unpaid");
    assert.equal(t?.fulfil, false);
    assert.equal(applyTransition("processing", t), "payment_failed");
  });

  test("replaying a completed event on a paid order changes nothing", () => {
    const t = transitionFor("checkout.session.completed", "paid");
    assert.equal(applyTransition("paid", t), "paid");
  });

  test("an expiry that arrives after payment changes nothing", () => {
    const t = transitionFor("checkout.session.expired", "unpaid");
    assert.equal(applyTransition("paid", t), "paid");
    assert.equal(applyTransition("processing", t), "processing");
    assert.equal(applyTransition("pending", t), "expired");
  });

  test("a late unpaid completion cannot pull a paid order back", () => {
    const t = transitionFor("checkout.session.completed", "unpaid");
    assert.equal(applyTransition("paid", t), "paid");
  });

  test("a payment that lands on a replaced (cancelled) order still pays it", () => {
    const t = transitionFor("checkout.session.completed", "paid");
    assert.equal(applyTransition("cancelled", t), "paid");
  });

  test("an expired or failed order is never paid by a replay", () => {
    const t = transitionFor("checkout.session.completed", "paid");
    assert.equal(applyTransition("expired", t), "expired");
    assert.equal(applyTransition("payment_failed", t), "payment_failed");
  });

  test("a cancelled order is otherwise left alone", () => {
    for (const [event, status] of [
      ["checkout.session.expired", "unpaid"],
      ["checkout.session.async_payment_failed", "unpaid"],
      ["checkout.session.completed", "unpaid"],
    ] as const) {
      assert.equal(applyTransition("cancelled", transitionFor(event, status)), "cancelled");
    }
  });

  test("async failure on a pending order is ignored", () => {
    const t = transitionFor("checkout.session.async_payment_failed", "unpaid");
    assert.equal(applyTransition("pending", t), "pending");
  });

  test("no_payment_required has no transition", () => {
    assert.equal(transitionFor("checkout.session.completed", "no_payment_required"), null);
  });
});

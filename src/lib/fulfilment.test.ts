import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { orderStatuses } from "../db/schema";
import { canMoveFulfilment, nextFulfilment } from "./fulfilment";

describe("fulfilment", () => {
  test("a paid order moves one step at a time to delivered", () => {
    assert.equal(nextFulfilment("paid", "unfulfilled"), "preparing");
    assert.equal(nextFulfilment("paid", "preparing"), "shipped");
    assert.equal(nextFulfilment("paid", "shipped"), "delivered");
    assert.equal(nextFulfilment("paid", "delivered"), null);
  });

  test("steps can't be skipped or reversed", () => {
    assert.equal(canMoveFulfilment("paid", "unfulfilled", "shipped"), false);
    assert.equal(canMoveFulfilment("paid", "shipped", "preparing"), false);
    assert.equal(canMoveFulfilment("paid", "preparing", "shipped"), true);
  });

  test("only paid orders are ever prepared", () => {
    for (const status of orderStatuses.filter((s) => s !== "paid")) {
      assert.equal(nextFulfilment(status, "unfulfilled"), null, status);
    }
  });
});

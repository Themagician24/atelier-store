import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  clampQuantity,
  MAX_LINE_QUANTITY,
  maxQuantity,
  subtotalCents,
} from "./cart-math";

describe("maxQuantity", () => {
  test("is the stock when below the line limit", () => {
    assert.equal(maxQuantity({ stockQuantity: 2, madeToOrder: false }), 2);
  });
  test("is 0 for a sold-out variant", () => {
    assert.equal(maxQuantity({ stockQuantity: 0, madeToOrder: false }), 0);
  });
  test("never exceeds the line limit", () => {
    assert.equal(
      maxQuantity({ stockQuantity: 50, madeToOrder: false }),
      MAX_LINE_QUANTITY,
    );
  });
  test("lets made-to-order pieces be ordered with no stock", () => {
    assert.equal(
      maxQuantity({ stockQuantity: 0, madeToOrder: true }),
      MAX_LINE_QUANTITY,
    );
  });
});

describe("clampQuantity", () => {
  test("keeps a quantity within bounds", () => {
    assert.equal(clampQuantity(2, 5), 2);
  });
  test("caps at the max", () => {
    assert.equal(clampQuantity(9, 3), 3);
  });
  test("floors negatives at 0", () => {
    assert.equal(clampQuantity(-4, 3), 0);
  });
  test("drops fractions", () => {
    assert.equal(clampQuantity(2.9, 5), 2);
  });
  test("treats NaN and Infinity as 0", () => {
    assert.equal(clampQuantity(Number.NaN, 5), 0);
    assert.equal(clampQuantity(Number.POSITIVE_INFINITY, 5), 0);
  });
});

describe("subtotalCents", () => {
  test("is exact to the cent", () => {
    assert.equal(subtotalCents([{ unitPriceCents: 9999, quantity: 3 }]), 29997);
  });
  test("ignores lines with nothing purchasable", () => {
    assert.equal(
      subtotalCents([
        { unitPriceCents: 12000, quantity: 1 },
        { unitPriceCents: 45000, quantity: 0 },
      ]),
      12000,
    );
  });
  test("is 0 for an empty bag", () => {
    assert.equal(subtotalCents([]), 0);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { BagLine } from "./cart-types";
import {
  checkoutSubtotal,
  needsReview,
  toCheckoutLines,
  toStripeLineItems,
} from "./checkout-lines";

function line(overrides: Partial<BagLine> = {}): BagLine {
  return {
    sku: "COAT-CAMEL-M",
    productSlug: "wool-coat",
    name: "Wool coat",
    colour: "Camel",
    size: "M",
    image: { url: "https://images.example.com/coat.jpg", alt: "Coat" },
    unitPriceCents: 49999,
    quantity: 2,
    maxQuantity: 5,
    status: "ok",
    stock: "in-stock",
    ...overrides,
  };
}

describe("toCheckoutLines", () => {
  test("keeps exact cents and multiplies per line", () => {
    const [l] = toCheckoutLines([line()]);
    assert.equal(l.unitPriceCents, 49999);
    assert.equal(l.lineTotalCents, 99998);
  });

  test("drops unavailable and reduced lines", () => {
    const lines = toCheckoutLines([
      line({ sku: "A" }),
      line({ sku: "B", status: "unavailable", quantity: 0 }),
      line({ sku: "C", status: "reduced", quantity: 1 }),
    ]);
    assert.deepEqual(lines.map((l) => l.sku), ["A"]);
  });

  test("subtotal sums line totals", () => {
    const lines = toCheckoutLines([
      line({ sku: "A", unitPriceCents: 1050, quantity: 3 }),
      line({ sku: "B", unitPriceCents: 999, quantity: 1 }),
    ]);
    assert.equal(checkoutSubtotal(lines), 4149);
  });
});

describe("needsReview", () => {
  test("only a fully ok bag goes straight to payment", () => {
    assert.equal(needsReview([line()]), false);
    assert.equal(needsReview([line(), line({ status: "reduced" })]), true);
    assert.equal(needsReview([line({ status: "unavailable" })]), true);
  });
});

describe("toStripeLineItems", () => {
  test("builds price_data from our numbers, in usd", () => {
    const [item] = toStripeLineItems(toCheckoutLines([line()]));
    assert.equal(item.quantity, 2);
    assert.equal(item.price_data?.currency, "usd");
    assert.equal(item.price_data?.unit_amount, 49999);
    assert.equal(item.price_data?.product_data?.name, "Wool coat");
    assert.equal(item.price_data?.product_data?.description, "Camel · M");
    assert.deepEqual(item.price_data?.product_data?.metadata, { sku: "COAT-CAMEL-M" });
    assert.equal("price" in item, false);
  });

  test("leaves out images that are not absolute https", () => {
    const [item] = toStripeLineItems(
      toCheckoutLines([line({ image: { url: "/local.jpg", alt: "" } })]),
    );
    assert.equal(item.price_data?.product_data?.images, undefined);
  });
});

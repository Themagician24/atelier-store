import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyFilters, compareSizes, facets, hasActiveFilters, parseFilters } from "./catalogue-filters";
import type { StockState } from "./stock";

const p = (
  name: string,
  price: number,
  variants: [string, string, StockState][],
) => ({
  name,
  price,
  stock: "in-stock" as StockState,
  colours: [...new Set(variants.map((v) => v[0]))],
  variants: variants.map(([colour, size, stock]) => ({ colour, size, stock })),
});

// Newest first, as getCategory returns them.
const products = [
  p("Coat", 900, [["Black", "M", "in-stock"], ["Camel", "M", "sold-out"]]),
  p("Shirt", 200, [["White", "S", "low-stock"], ["Black", "S", "sold-out"]]),
  p("Bag", 600, [["Black", "One size", "made-to-order"]]),
];

describe("parseFilters", () => {
  test("defaults to newest and nothing filtered", () => {
    const f = parseFilters({});
    assert.deepEqual(f, { colour: null, size: null, inStock: false, sort: "newest" });
    assert.equal(hasActiveFilters(f), false);
  });

  test("ignores unknown sorts and over-long values", () => {
    assert.equal(parseFilters({ sort: "random" }).sort, "newest");
    assert.equal(parseFilters({ colour: "x".repeat(200) }).colour, null);
  });
});

describe("applyFilters", () => {
  test("colour and size must match on the same variant", () => {
    const f = parseFilters({ colour: "Camel", size: "M" });
    assert.deepEqual(applyFilters(products, f).map((x) => x.name), ["Coat"]);
    const none = parseFilters({ colour: "White", size: "M" });
    assert.deepEqual(applyFilters(products, none), []);
  });

  test("available now keeps buyable variants, made to order included", () => {
    const f = parseFilters({ colour: "Black", stock: "in" });
    assert.deepEqual(applyFilters(products, f).map((x) => x.name), ["Coat", "Bag"]);
  });

  test("sorts by price either way and keeps newest order otherwise", () => {
    assert.deepEqual(applyFilters(products, parseFilters({ sort: "price-asc" })).map((x) => x.price), [200, 600, 900]);
    assert.deepEqual(applyFilters(products, parseFilters({ sort: "price-desc" })).map((x) => x.price), [900, 600, 200]);
    assert.deepEqual(applyFilters(products, parseFilters({})).map((x) => x.name), ["Coat", "Shirt", "Bag"]);
  });
});

describe("facets", () => {
  test("lists the colours and sizes on offer, sizes in wearing order", () => {
    const f = facets(products);
    assert.deepEqual(f.colours, ["Black", "Camel", "White"]);
    assert.deepEqual(f.sizes, ["S", "M", "One size"]);
  });

  test("numeric sizes sort as numbers", () => {
    assert.deepEqual(["42", "38", "40"].sort(compareSizes), ["38", "40", "42"]);
  });
});

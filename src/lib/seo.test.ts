import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  breadcrumbJsonLd,
  collectionDescription,
  isIndexablePath,
  jsonLd,
  metaDescription,
  privatePaths,
  productJsonLd,
  schemaAvailability,
  staticPublicPaths,
  type ProductForSeo,
} from "./seo";

const coat: ProductForSeo = {
  slug: "long-wool-coat",
  name: "Long Wool Coat",
  description: "Double-faced wool, cut long.",
  price: 99.99,
  stock: "low-stock",
  category: { slug: "women", name: "Women" },
  images: [{ url: "https://images.unsplash.com/photo-1" }],
  colours: ["Camel"],
  variants: [
    { sku: "LONG-WOOL-COAT-CAMEL-S", colour: "Camel", size: "S", stock: "in-stock" },
    { sku: "LONG-WOOL-COAT-CAMEL-M", colour: "Camel", size: "M", stock: "sold-out" },
  ],
};

describe("productJsonLd", () => {
  const data = productJsonLd(coat, "https://shop.test/products/long-wool-coat", "Atelier");
  const offers = data.offers as Record<string, unknown>[];

  test("carries the real price to the cent, in USD", () => {
    for (const offer of offers) {
      assert.equal(offer.price, "99.99");
      assert.equal(offer.priceCurrency, "USD");
    }
  });

  test("one offer per SKU, with that variant's real availability", () => {
    assert.equal(offers.length, 2);
    assert.equal(offers[0].sku, "LONG-WOOL-COAT-CAMEL-S");
    assert.equal(offers[0].availability, "https://schema.org/InStock");
    assert.equal(offers[1].availability, "https://schema.org/OutOfStock");
  });

  test("never invents ratings or reviews", () => {
    const text = JSON.stringify(data);
    assert.doesNotMatch(text, /aggregateRating|AggregateRating|review/i);
  });

  test("states the actual shipping rule: free, US only", () => {
    const shipping = offers[0].shippingDetails as Record<string, Record<string, string>>;
    assert.equal(shipping.shippingRate.value, "0");
    assert.equal(shipping.shippingDestination.addressCountry, "US");
  });
});

describe("structured data helpers", () => {
  test("availability covers the four stock states", () => {
    assert.equal(schemaAvailability("made-to-order"), "https://schema.org/MadeToOrder");
    assert.equal(schemaAvailability("low-stock"), "https://schema.org/LimitedAvailability");
  });

  test("breadcrumbs are numbered from 1", () => {
    const b = breadcrumbJsonLd([
      { name: "Home", url: "https://shop.test/" },
      { name: "Women", url: "https://shop.test/collections/women" },
    ]);
    const items = b.itemListElement as { position: number }[];
    assert.deepEqual(items.map((i) => i.position), [1, 2]);
  });

  test("serialised JSON-LD can't close its <script> tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    assert.doesNotMatch(out, /<\/script>/);
    assert.match(out, /\\u003c\/script>/);
  });

  test("descriptions are cut under 160 characters at a word", () => {
    const long = "word ".repeat(80);
    const out = metaDescription(long);
    assert.ok(out.length <= 160);
    assert.ok(out.endsWith("…"));
    assert.equal(metaDescription("Short."), "Short.");
  });

  test("a collection description states the real piece count", () => {
    assert.match(collectionDescription("Bags", 1), /1 piece,/);
    assert.match(collectionDescription("Bags", 12), /12 pieces/);
  });
});

describe("indexable routes", () => {
  test("commercial pages are indexable", () => {
    for (const path of [...staticPublicPaths, "/products/x", "/collections/women"]) {
      assert.equal(isIndexablePath(path), true, path);
    }
  });

  test("account, bag, checkout, admin, API, search and auth are not", () => {
    for (const path of [
      "/account",
      "/account/orders/AT-ABC234",
      "/bag",
      "/checkout/success",
      "/admin",
      "/admin/products",
      "/api/me",
      "/search",
      "/sign-in",
      "/sign-up",
    ]) {
      assert.equal(isIndexablePath(path), false, path);
    }
  });

  test("no static sitemap path is private", () => {
    for (const path of staticPublicPaths) {
      assert.ok(!privatePaths.some((p) => path.startsWith(p)), path);
    }
  });
});

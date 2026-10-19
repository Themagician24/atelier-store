import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  centsToInput,
  parseNewImage,
  parseNewVariants,
  parseProductStatus,
  parseStockChanges,
  wholeNumber,
  parseCents,
  parseNewProduct,
  parseProductDetails,
  slugify,
  variantSku,
} from "./admin-forms";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const details = {
  name: "Satin Bomber Jacket",
  category: "women",
  price: "1650",
  description: "A cropped bomber in heavy duchess satin.",
  details: "Duchess satin\n\n  Rib-knit trims  \n",
  care: "Dry clean only.",
};

const newProduct = {
  ...details,
  colours: "Rust, Black",
  sizes: "S, M, L",
  initialStock: "2",
  imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea",
  imageAlt: "A rust satin bomber jacket on a hanger",
};

describe("parseCents", () => {
  test("reads whole dollars, decimals, commas and a leading $", () => {
    assert.equal(parseCents("1250"), 125000);
    assert.equal(parseCents("1250.5"), 125050);
    assert.equal(parseCents("$1,250.05"), 125005);
    assert.equal(parseCents(" 0.99 "), 99);
  });
  test("rejects anything that isn't an amount", () => {
    for (const raw of ["", "-5", "12.345", "1e3", "abc", "12.", ".5", "99999999"]) {
      assert.equal(parseCents(raw), null, raw);
    }
  });
  test("round-trips through centsToInput", () => {
    assert.equal(centsToInput(125005), "1250.05");
    assert.equal(parseCents(centsToInput(125005)), 125005);
    assert.equal(centsToInput(null), "");
  });
});

describe("slugify and variantSku", () => {
  test("strips accents and punctuation", () => {
    assert.equal(slugify("Tapered Crêpe Trousers!"), "tapered-crepe-trousers");
    assert.equal(slugify("  --Wool & Silk--  "), "wool-silk");
  });
  test("builds SKUs like the seed", () => {
    assert.equal(variantSku("satin-bomber-jacket", "Rust", "One size"), "SATIN-BOMBER-JACKET-RUST-ONE-SIZE");
  });
});

describe("parseProductDetails", () => {
  test("accepts a valid edit and normalises it", () => {
    const result = parseProductDetails(form({ ...details, madeToOrder: "on", stockDetail: "  " }));
    assert.ok(result.ok);
    assert.equal(result.data.priceCents, 165000);
    assert.equal(result.data.compareAtCents, null);
    assert.equal(result.data.madeToOrder, true);
    assert.equal(result.data.stockDetail, null);
    assert.deepEqual(result.data.details, ["Duchess satin", "Rib-knit trims"]);
  });
  test("an unticked checkbox is not made to order", () => {
    const result = parseProductDetails(form(details));
    assert.ok(result.ok);
    assert.equal(result.data.madeToOrder, false);
  });
  test("rejects a compare-at price not above the price", () => {
    const result = parseProductDetails(form({ ...details, compareAt: "1650" }));
    assert.ok(!result.ok);
    assert.ok(result.errors.compareAt);
  });
  test("rejects a price below Stripe's minimum", () => {
    const result = parseProductDetails(form({ ...details, price: "0.10" }));
    assert.ok(!result.ok);
    assert.ok(result.errors.price);
  });
  test("reports every missing field at once", () => {
    const result = parseProductDetails(form({}));
    assert.ok(!result.ok);
    assert.deepEqual(
      Object.keys(result.errors).sort(),
      ["care", "category", "description", "name", "price"],
    );
  });
  test("rejects a category that isn't a slug", () => {
    const result = parseProductDetails(form({ ...details, category: "../men" }));
    assert.ok(!result.ok);
    assert.ok(result.errors.category);
  });
});

describe("parseNewProduct", () => {
  test("builds the colour × size grid in display order", () => {
    const result = parseNewProduct(form(newProduct));
    assert.ok(result.ok);
    assert.equal(result.data.slug, "satin-bomber-jacket");
    assert.equal(result.data.initialStock, 2);
    assert.deepEqual(
      result.data.variants.map((v) => [v.sku, v.position]),
      [
        ["SATIN-BOMBER-JACKET-RUST-S", 0],
        ["SATIN-BOMBER-JACKET-RUST-M", 1],
        ["SATIN-BOMBER-JACKET-RUST-L", 2],
        ["SATIN-BOMBER-JACKET-BLACK-S", 3],
        ["SATIN-BOMBER-JACKET-BLACK-M", 4],
        ["SATIN-BOMBER-JACKET-BLACK-L", 5],
      ],
    );
  });
  test("keeps an explicit slug", () => {
    const result = parseNewProduct(form({ ...newProduct, slug: "bomber" }));
    assert.ok(result.ok);
    assert.equal(result.data.slug, "bomber");
  });
  test("rejects a malformed slug", () => {
    const result = parseNewProduct(form({ ...newProduct, slug: "Bomber Jacket" }));
    assert.ok(!result.ok);
    assert.ok(result.errors.slug);
  });
  test("rejects the slug the create route already uses", () => {
    const explicit = parseNewProduct(form({ ...newProduct, slug: "new" }));
    assert.ok(!explicit.ok);
    assert.ok(explicit.errors.slug);
    const derived = parseNewProduct(form({ ...newProduct, name: "New" }));
    assert.ok(!derived.ok);
    assert.ok(derived.errors.slug);
  });
  test("rejects colour and size pairs that would share a SKU", () => {
    const result = parseNewProduct(
      form({ ...newProduct, colours: "Navy, Navy Blue", sizes: "Blue S, S" }),
    );
    assert.ok(!result.ok);
    assert.ok(result.errors.colours);
  });
  test("rejects colours that would share a SKU", () => {
    const result = parseNewProduct(form({ ...newProduct, colours: "Navy, navy" }));
    assert.ok(!result.ok);
    assert.ok(result.errors.colours);
  });
  test("rejects SKUs longer than the bag accepts", () => {
    const result = parseNewProduct(
      form({ ...newProduct, slug: "a".repeat(60), colours: "Midnight blue" }),
    );
    assert.ok(!result.ok);
    assert.ok(result.errors.slug);
  });
  test("rejects images the storefront can't load", () => {
    for (const imageUrl of ["http://images.unsplash.com/x", "https://example.com/x.jpg", "nope"]) {
      const result = parseNewProduct(form({ ...newProduct, imageUrl }));
      assert.ok(!result.ok, imageUrl);
      assert.ok(result.errors.imageUrl);
    }
  });
  test("rejects negative or fractional stock", () => {
    for (const initialStock of ["-1", "1.5", "10000"]) {
      const result = parseNewProduct(form({ ...newProduct, initialStock }));
      assert.ok(!result.ok, initialStock);
      assert.ok(result.errors.initialStock);
    }
  });
});

describe("low-stock threshold", () => {
  test("defaults to 3 and must be a whole number", () => {
    const ok = parseProductDetails(form({ ...details }));
    assert.equal(ok.ok && ok.data.lowStockThreshold, 3);
    const set = parseProductDetails(form({ ...details, lowStockThreshold: "10" }));
    assert.equal(set.ok && set.data.lowStockThreshold, 10);
    for (const bad of ["-1", "2.5", "abc", "1000"]) {
      const r = parseProductDetails(form({ ...details, lowStockThreshold: bad }));
      assert.equal(r.ok, false, bad);
    }
  });
});

describe("wholeNumber", () => {
  test("never accepts negatives, decimals or values over the cap", () => {
    assert.equal(wholeNumber("0", 10), 0);
    assert.equal(wholeNumber(" 7 ", 10), 7);
    assert.equal(wholeNumber("-1", 10), null);
    assert.equal(wholeNumber("1.5", 10), null);
    assert.equal(wholeNumber("11", 10), null);
  });
});

describe("parseStockChanges", () => {
  test("returns only the rows that changed, with the count they were read at", () => {
    const r = parseStockChanges(
      form({
        "stock:COAT-BLACK-S": "4",
        "expected:COAT-BLACK-S": "2",
        "stock:COAT-BLACK-M": "5",
        "expected:COAT-BLACK-M": "5",
      }),
    );
    assert.deepEqual(r.ok && r.data, [{ sku: "COAT-BLACK-S", expected: 2, quantity: 4 }]);
  });

  test("refuses a negative or fractional stock", () => {
    for (const bad of ["-3", "1.5", ""]) {
      const r = parseStockChanges(form({ "stock:A": bad, "expected:A": "1" }));
      assert.equal(r.ok, false, bad);
    }
  });

  test("ignores rows the form never rendered", () => {
    const r = parseStockChanges(form({ "stock:INJECTED": "9" }));
    assert.deepEqual(r.ok && r.data, []);
  });
});

describe("parseProductStatus", () => {
  test("only the three statuses", () => {
    assert.equal(parseProductStatus("archived"), "archived");
    assert.equal(parseProductStatus("deleted"), null);
    assert.equal(parseProductStatus(null), null);
  });
});

describe("parseNewImage", () => {
  const colours = ["Black", "Ivory"];

  test("an Unsplash photo with a description, optionally tagged with a colour", () => {
    const r = parseNewImage(
      form({ imageUrl: "https://images.unsplash.com/photo-1", imageAlt: "Back view", imageColour: "Ivory" }),
      colours,
    );
    assert.deepEqual(r.ok && r.data, {
      url: "https://images.unsplash.com/photo-1",
      alt: "Back view",
      colour: "Ivory",
    });
  });

  test("other hosts, missing descriptions and foreign colours are refused", () => {
    const r = parseNewImage(
      form({ imageUrl: "https://example.com/a.jpg", imageAlt: "", imageColour: "Red" }),
      colours,
    );
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.errors.imageUrl && r.errors.imageAlt && r.errors.imageColour);
  });
});

describe("parseNewVariants", () => {
  const existing = [
    { colour: "Black", size: "S", sku: "COAT-BLACK-S" },
    { colour: "Black", size: "M", sku: "COAT-BLACK-M" },
  ];

  test("a new colour gets every existing size, with SKUs built like the seed", () => {
    const r = parseNewVariants(form({ addColours: "Ivory", addStock: "2" }), "coat", existing);
    assert.deepEqual(r.ok && r.data, {
      variants: [
        { sku: "COAT-IVORY-S", colour: "Ivory", size: "S" },
        { sku: "COAT-IVORY-M", colour: "Ivory", size: "M" },
      ],
      initialStock: 2,
    });
  });

  test("a new size fills it in for every colour", () => {
    const r = parseNewVariants(form({ addSizes: "L" }), "coat", existing);
    assert.deepEqual(r.ok && r.data.variants.map((v) => v.sku), ["COAT-BLACK-L"]);
  });

  test("nothing new, or a negative stock, is refused", () => {
    assert.equal(parseNewVariants(form({ addColours: "Black" }), "coat", existing).ok, false);
    assert.equal(parseNewVariants(form({}), "coat", existing).ok, false);
    assert.equal(parseNewVariants(form({ addSizes: "L", addStock: "-1" }), "coat", existing).ok, false);
  });
});

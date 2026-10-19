import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { firstName, greeting, MAX_ACCOUNT_NAME, normalizeAccountName } from "./display-name";

describe("firstName", () => {
  test("is the first word of the account name", () => {
    assert.equal(firstName("Jeff Bizo"), "Jeff");
    assert.equal(firstName("  Jeff   Bizo "), "Jeff");
  });

  test("keeps accented and hyphenated names whole", () => {
    assert.equal(firstName("Jean-Michel Dupré"), "Jean-Michel");
    assert.equal(firstName("Zoë"), "Zoë");
  });

  test("is null when there is nothing usable", () => {
    assert.equal(firstName(""), null);
    assert.equal(firstName("   "), null);
    assert.equal(firstName(null), null);
    assert.equal(firstName(undefined), null);
  });

  test("strips control characters and truncates very long names", () => {
    assert.equal(firstName("Je\u0000ff"), "Je");
    const long = "A".repeat(40);
    const out = firstName(long);
    assert.ok(out && out.length === 24 && out.endsWith("…"));
  });
});

describe("greeting", () => {
  test("says hi by first name, or falls back to a neutral label", () => {
    assert.equal(greeting("Jeff"), "Hi, Jeff");
    assert.equal(greeting(null), "Your account");
  });
});

describe("normalizeAccountName", () => {
  test("collapses whitespace and trims", () => {
    assert.equal(normalizeAccountName("  Jeff \n  Bizo "), "Jeff Bizo");
  });

  test("rejects empty, non-string and over-long names", () => {
    assert.equal(normalizeAccountName(""), null);
    assert.equal(normalizeAccountName("   "), null);
    assert.equal(normalizeAccountName(42), null);
    assert.equal(normalizeAccountName("x".repeat(MAX_ACCOUNT_NAME + 1)), null);
    assert.equal(normalizeAccountName("x".repeat(MAX_ACCOUNT_NAME)), "x".repeat(MAX_ACCOUNT_NAME));
  });
});

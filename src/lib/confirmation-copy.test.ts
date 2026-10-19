import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { orderStatuses } from "../db/schema";
import {
  confirmationHeading,
  confirmationLead,
  nextSteps,
  thankYouName,
} from "./confirmation-copy";

describe("thank-you page", () => {
  test("thanks the customer by the first name on their account", () => {
    const name = thankYouName("Jeff Bizo", "Someone Else");
    assert.equal(confirmationHeading("paid", name), "Thank you, Jeff");
  });

  test("falls back to the shipping name, then to no name", () => {
    assert.equal(thankYouName("", "Ada Lovelace"), "Ada");
    assert.equal(thankYouName(null, null), null);
    assert.equal(confirmationHeading("paid", null), "Thank you for your order");
  });

  test("never thanks for a payment that isn't confirmed", () => {
    for (const status of orderStatuses.filter((s) => s !== "paid")) {
      assert.doesNotMatch(confirmationHeading(status, "Jeff"), /Thank you/, status);
    }
  });

  test("every status has its own heading and explanation", () => {
    for (const status of orderStatuses) {
      assert.ok(confirmationHeading(status, null).length > 0);
      assert.ok(confirmationLead(status).length > 0);
    }
    assert.match(confirmationLead("payment_failed"), /Nothing was charged/);
    assert.match(confirmationLead("refunded"), /returned/);
  });

  test("next steps promise nothing the store doesn't do (no emails are sent)", () => {
    for (const step of nextSteps) assert.doesNotMatch(step.body, /email/i);
  });
});

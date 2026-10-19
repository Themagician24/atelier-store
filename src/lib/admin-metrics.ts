// What each dashboard number counts, shown under the dashboards. Kept in one
// place so the SQL in admin-stats.ts / admin-insights.ts and the wording
// can be checked against each other.

export const overviewDefinitions = [
  {
    term: "Gross revenue",
    detail:
      "Sum of the amount Stripe charged (amount_total) for orders whose payment was confirmed in the period, by payment date. Includes orders later refunded. Pending, processing, failed, expired and cancelled checkouts are never counted.",
  },
  {
    term: "Refunds",
    detail:
      "Amount refunded through Stripe (charge.refunded), dated by the latest refund on the order. Partial refunds count for their amount.",
  },
  {
    term: "Net revenue",
    detail: "Gross revenue minus refunds in the same period. Stripe fees are not deducted.",
  },
  {
    term: "Average order value",
    detail: "Gross revenue divided by the number of orders paid in the period.",
  },
  {
    term: "Orders",
    detail:
      "Checkouts that reached Stripe, by the day they were placed, broken down by their status now. A customer who opened checkout twice has one cancelled and one live order.",
  },
  {
    term: "Out of stock",
    detail:
      "Active products, not made to order, with no stock left in any variant. Low stock: total stock above zero and at or under the product's own threshold.",
  },
  {
    term: "Customers",
    detail: "Registered accounts. Visitors without an account are never counted here.",
  },
] as const;

export const insightsDefinitions = [
  {
    term: "Views",
    detail:
      "Product page views, counted once per visitor, product and UTC day. Reloads, bots and prefetches are not counted.",
  },
  {
    term: "Clicks",
    detail: "Clicks on a product card (grids, rails, search results), once per visitor, product and day.",
  },
  {
    term: "Added to bag",
    detail: "Signed-in customers adding the product to their bag, once per customer, product and day.",
  },
  {
    term: "Checkouts",
    detail: "Units of the product in orders that reached Stripe in the period, whatever happened next.",
  },
  {
    term: "Purchases",
    detail: "Units of the product in orders paid in the period, with the revenue they brought (catalogue price at checkout).",
  },
  {
    term: "Conversion",
    detail:
      "Paid orders containing the product divided by unique daily views of it, both in the same period. Not attributed: a purchase may follow a view from an earlier period.",
  },
  {
    term: "Visitor",
    detail:
      "A daily-rotating hash of the request; no cookie is set and no IP is stored, so one person on two days counts twice and two people behind one network may count once.",
  },
] as const;

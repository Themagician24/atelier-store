// Catalogue prices only: whole dollars. Bag and checkout use formatCents.
const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function currency(dollars: number) {
  return wholeDollars.format(dollars);
}

const exactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** Bag, checkout and receipts: exact to the cent, from integer cents. */
export function formatCents(cents: number) {
  return exactDollars.format(cents / 100);
}

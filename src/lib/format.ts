// Catalogue prices only: whole dollars. Bag and checkout use formatCents.
const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function currency(dollars: number) {
  return wholeDollars.format(dollars);
}

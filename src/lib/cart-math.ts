// Pure bag rules, shared by the server (which enforces them) and the client
// (which only uses them to disable controls). No imports: safe anywhere.

/** Per-line ceiling, so made-to-order pieces are not unbounded either. */
export const MAX_LINE_QUANTITY = 10;

/** The most of one variant a bag line may hold right now. */
export function maxQuantity({
  stockQuantity,
  madeToOrder,
}: {
  stockQuantity: number;
  madeToOrder: boolean;
}): number {
  if (madeToOrder) return MAX_LINE_QUANTITY;
  return Math.max(0, Math.min(stockQuantity, MAX_LINE_QUANTITY));
}

/** A whole number in [0, max]; anything that isn't a finite number is 0. */
export function clampQuantity(requested: number, max: number): number {
  if (!Number.isFinite(requested)) return 0;
  return Math.max(0, Math.min(Math.trunc(requested), max));
}

/** Integer cents; lines with nothing purchasable contribute nothing. */
export function subtotalCents(
  lines: { unitPriceCents: number; quantity: number }[],
): number {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

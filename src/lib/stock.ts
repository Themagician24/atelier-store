export type StockState = "in-stock" | "low-stock" | "made-to-order" | "sold-out";

/** Default for products.low_stock_threshold. */
export const LOW_STOCK_THRESHOLD = 3;

export function stockState({
  stockQuantity,
  madeToOrder,
  lowStockThreshold = LOW_STOCK_THRESHOLD,
}: {
  stockQuantity: number;
  madeToOrder: boolean;
  /** Per product; at or below it (and above zero) reads as low. */
  lowStockThreshold?: number;
}): StockState {
  if (stockQuantity > lowStockThreshold) return "in-stock";
  if (stockQuantity > 0) return "low-stock";
  return madeToOrder ? "made-to-order" : "sold-out";
}

export const stockCopy: Record<StockState, string> = {
  "in-stock": "In stock",
  "low-stock": "Only a few left",
  "made-to-order": "Made to order",
  "sold-out": "Sold out",
};

export const stockTone: Record<StockState, string> = {
  "in-stock": "text-muted",
  "low-stock": "text-alert",
  "made-to-order": "text-muted",
  "sold-out": "text-muted",
};

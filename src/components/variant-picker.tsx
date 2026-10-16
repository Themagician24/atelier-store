"use client";

import { useState } from "react";
import { AddToBag } from "@/components/add-to-bag";
import { useColourSelection } from "@/components/colour-selection";
import type { ProductVariant } from "@/lib/products";
import { stockCopy, stockTone, type StockState } from "@/lib/stock";

/*
 * Colour and size as native radio groups, styled as square chips. The stock
 * line follows the selection: the whole product until a size is picked, then
 * that exact variant. A single colour or size is stated, not offered.
 */
export function VariantPicker({
  variants,
  productStock,
  stockDetail,
}: {
  variants: ProductVariant[];
  productStock: StockState;
  stockDetail: string | null;
}) {
  const colours = [...new Set(variants.map((v) => v.colour))];
  // Shared with the gallery, which can change it too.
  const { selection, select } = useColourSelection();
  const { colour } = selection;
  const forColour = variants.filter((v) => v.colour === colour);
  const [size, setSize] = useState(
    forColour.length === 1 ? forColour[0].size : null,
  );
  // A size the new colour doesn't come in reads as no size picked.
  const selected = forColour.find((v) => v.size === size);
  const stock = selected?.stock ?? productStock;

  return (
    <div className="flex flex-col gap-6">
      {colours.length > 1 && (
        <fieldset>
          <legend className="eyebrow text-muted">
            Colour <span className="text-ink">{colour}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {colours.map((c) => (
              <Chip
                key={c}
                name="colour"
                label={c}
                checked={c === colour}
                onChange={() => select({ colour: c, url: null })}
              />
            ))}
          </div>
        </fieldset>
      )}

      {forColour.length > 1 ? (
        <fieldset>
          <legend className="eyebrow text-muted">Size</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {forColour.map((v) => (
              <Chip
                key={v.sku}
                name="size"
                label={v.size}
                checked={v.size === size}
                soldOut={v.stock === "sold-out"}
                onChange={() => setSize(v.size)}
              />
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="eyebrow text-muted">{forColour[0]?.size}</p>
      )}

      <div className={stockTone[stock]} aria-live="polite">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 bg-current" />
          {stockCopy[stock]}
        </p>
        {stockDetail && <p className="mt-2 text-muted">{stockDetail}</p>}
      </div>

      {/* Keyed so a message about one size clears when another is picked. */}
      <AddToBag
        key={selected?.sku ?? "none"}
        sku={selected?.sku ?? null}
        stock={stock}
      />
    </div>
  );
}

function Chip({
  name,
  label,
  checked,
  soldOut = false,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  soldOut?: boolean;
  onChange: () => void;
}) {
  // Sold-out sizes stay selectable so the stock line can say so.
  return (
    <label
      className={`inline-flex min-h-10 min-w-12 cursor-pointer items-center justify-center border px-3 text-ui transition-colors duration-200 ease-standard has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline has-focus-visible:outline-offset-3 has-focus-visible:outline-ink hover:border-ink ${soldOut ? "text-muted line-through" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={label}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
      {soldOut && <span className="sr-only"> (sold out)</span>}
    </label>
  );
}

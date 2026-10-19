"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  hasActiveFilters,
  sortOptions,
  type CatalogueFilters,
} from "@/lib/catalogue-filters";

/*
 * A plain GET form: it works without JavaScript (the Apply button), and with
 * it each change submits straight away, so the button is hidden.
 */
export function FilterBar({
  action,
  filters,
  colours,
  sizes,
  resultCount,
}: {
  action: string;
  filters: CatalogueFilters;
  colours: string[];
  sizes: string[];
  resultCount: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const active = hasActiveFilters(filters);

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      aria-label="Filter and sort"
      className="flex flex-wrap items-end gap-x-4 gap-y-3"
    >
      <Select
        name="colour"
        label="Colour"
        value={filters.colour ?? ""}
        options={colours}
        onChange={submit}
      />
      <Select
        name="size"
        label="Size"
        value={filters.size ?? ""}
        options={sizes}
        onChange={submit}
      />
      <label className="flex min-h-11 items-center gap-2 text-ui">
        <input
          type="checkbox"
          name="stock"
          value="in"
          defaultChecked={filters.inStock}
          onChange={submit}
          className="size-4 accent-ink"
        />
        Available now
      </label>
      <label className="flex flex-col gap-1 text-ui text-muted sm:ml-auto">
        Sort
        <select
          name="sort"
          defaultValue={filters.sort}
          onChange={submit}
          className="field min-h-11 py-0 text-ink"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="btn btn-secondary btn-sm">
          Apply
        </button>
      </noscript>
      <p aria-live="polite" className="w-full text-ui text-muted">
        {resultCount} {resultCount === 1 ? "piece" : "pieces"}
        {active && (
          <>
            {" · "}
            <Link href={action} className="link text-ink">
              Clear filters
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Select({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  onChange: () => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-ui text-muted">
      {label}
      <select
        name={name}
        defaultValue={value}
        onChange={onChange}
        className="field min-h-11 min-w-36 py-0 text-ink"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { AdminFormState, CategoryOption, FormValues } from "@/lib/admin-forms";

type Action = (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;

/*
 * One form for both create and edit. The server validates everything again
 * (src/lib/admin-forms.ts); the browser attributes here only save a round
 * trip. A rejected submit comes back with what was typed, and the form
 * remounts on `attempt` so every field shows it again.
 */
export function ProductForm({
  mode,
  action,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  categories: CategoryOption[];
  initial: FormValues;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  // After a rejected submit, put the cursor on the first field to fix.
  useEffect(() => {
    if (!state) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? formRef.current?.querySelector<HTMLElement>("[data-form-message]"))?.focus();
  }, [state]);

  const field = (name: string) => ({
    name,
    id: `field-${name}`,
    defaultValue: values[name] ?? "",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `field-${name}-error` : undefined,
    readOnly: pending,
  });

  return (
    <form
      key={state?.attempt ?? 0}
      ref={formRef}
      action={formAction}
      aria-busy={pending}
      className="flex max-w-reading flex-col gap-12"
    >
      <p
        data-form-message
        tabIndex={-1}
        role="alert"
        className="text-alert outline-none empty:hidden"
      >
        {state?.message}
      </p>

      <Fieldset legend="Details">
        <Field label="Name" name="name" error={errors.name}>
          <input type="text" required maxLength={120} className="field" {...field("name")} />
        </Field>

        {mode === "create" ? (
          <Field
            label="Slug"
            name="slug"
            error={errors.slug}
            hint="The address of the product page. Leave blank to build it from the name. It can't be changed later."
          >
            <input
              type="text"
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              autoCapitalize="none"
              spellCheck={false}
              className="field"
              {...field("slug")}
            />
          </Field>
        ) : (
          // The product is named by its slug; it's not editable.
          <input type="hidden" name="slug" value={values.slug ?? ""} />
        )}

        <Field label="Category" name="category" error={errors.category}>
          <select required className="field" {...field("category")}>
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" name="description" error={errors.description}>
          <textarea required rows={4} maxLength={2000} className="field" {...field("description")} />
        </Field>

        <Field
          label="Details"
          name="details"
          error={errors.details}
          hint="One per line. Shown as a list on the product page."
        >
          <textarea rows={5} className="field" {...field("details")} />
        </Field>

        <Field label="Care" name="care" error={errors.care}>
          <textarea required rows={2} maxLength={500} className="field" {...field("care")} />
        </Field>
      </Fieldset>

      <Fieldset legend="Price">
        <div className="grid gap-8 sm:grid-cols-2">
          <Field label="Price (USD)" name="price" error={errors.price}>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="1250.00"
              className="field tabular-nums"
              {...field("price")}
            />
          </Field>
          <Field
            label="Original price (USD)"
            name="compareAt"
            error={errors.compareAt}
            hint="Optional. Set it to show the price as reduced."
          >
            <input
              type="text"
              inputMode="decimal"
              className="field tabular-nums"
              {...field("compareAt")}
            />
          </Field>
        </div>
      </Fieldset>

      <Fieldset legend="Availability">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="madeToOrder"
            defaultChecked={values.madeToOrder === "on"}
            disabled={pending}
            className="mt-1 size-4 accent-ink"
          />
          <span className="flex flex-col gap-1">
            <span>Made to order</span>
            <span className="text-ui text-muted">
              Sizes with no stock stay available to buy instead of showing as sold out.
            </span>
          </span>
        </label>
        <Field
          label="Availability note"
          name="stockDetail"
          error={errors.stockDetail}
          hint="Optional. Shown beside the stock state, e.g. “Ready in four weeks.”"
        >
          <input type="text" maxLength={200} className="field" {...field("stockDetail")} />
        </Field>
        <Field
          label="Low-stock alert"
          name="lowStockThreshold"
          error={errors.lowStockThreshold}
          hint="Total stock at or below this shows “Only a few left” and appears in the dashboard alerts."
        >
          <input
            type="number"
            min={0}
            max={999}
            step={1}
            inputMode="numeric"
            className="field max-w-40 tabular-nums"
            {...field("lowStockThreshold")}
          />
        </Field>
      </Fieldset>

      {mode === "create" && (
        <>
          <Fieldset legend="Variants">
            <p className="text-ui text-muted">
              One SKU is made for every colour and size. They can&rsquo;t be renamed later.
            </p>
            <Field label="Colours" name="colours" error={errors.colours} hint="Comma-separated, e.g. Black, Ivory.">
              <input type="text" required className="field" {...field("colours")} />
            </Field>
            <Field label="Sizes" name="sizes" error={errors.sizes} hint="Comma-separated, small to large, e.g. S, M, L — or One size.">
              <input type="text" required className="field" {...field("sizes")} />
            </Field>
            <Field label="Starting stock per SKU" name="initialStock" error={errors.initialStock}>
              <input
                type="number"
                min={0}
                max={9999}
                step={1}
                inputMode="numeric"
                className="field tabular-nums"
                {...field("initialStock")}
              />
            </Field>
          </Fieldset>

          <Fieldset legend="Photo">
            <Field
              label="Packshot URL"
              name="imageUrl"
              error={errors.imageUrl}
              hint="An images.unsplash.com address. Shown on cards and first on the product page."
            >
              <input type="url" required className="field" {...field("imageUrl")} />
            </Field>
            <Field label="Description of the photo" name="imageAlt" error={errors.imageAlt}>
              <input type="text" required maxLength={200} className="field" {...field("imageAlt")} />
            </Field>
          </Fieldset>
        </>
      )}

      <button type="submit" className="btn btn-primary self-start" disabled={pending}>
        {mode === "create"
          ? pending ? "Creating…" : "Create product"
          : pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-8 border-t pt-6">
      <legend className="eyebrow float-left mb-2 w-full text-muted">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${name}`} className="eyebrow">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-ui text-muted">{hint}</p>}
      {error && (
        <p id={`field-${name}-error`} className="text-ui text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

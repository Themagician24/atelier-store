"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { AdminFormState } from "@/lib/admin-forms";
import { addImage, addVariants, updateStock } from "./actions";
import { Field } from "./product-form";

type Variant = { sku: string; colour: string; size: string; stockQuantity: number };

function FormMessage({ state }: { state: AdminFormState }) {
  if (!state?.message) return null;
  return (
    <p role="alert" className="text-ui text-alert">
      {state.message}
    </p>
  );
}

/*
 * Every SKU's count in one form. Each row also posts the count it was
 * rendered with; the server only writes rows that still hold it, so a sale
 * that landed meanwhile is reported, never overwritten.
 */
export function StockForm({ slug, variants }: { slug: string; variants: Variant[] }) {
  const [state, action, pending] = useActionState(updateStock, null);
  const errors = state?.errors ?? {};

  return (
    <form key={state?.attempt ?? 0} action={action} aria-busy={pending} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <FormMessage state={state} />
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-ui text-muted">
            <th scope="col" className="py-2 font-normal">Variant</th>
            <th scope="col" className="py-2 text-right font-normal">In stock</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const name = `stock:${v.sku}`;
            const error = errors[name];
            return (
              <tr key={v.sku} className="border-b align-top">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <label htmlFor={`stock-${v.sku}`}>
                    {v.colour} · {v.size}
                  </label>
                  <span className="block truncate text-ui text-muted">{v.sku}</span>
                  {error && (
                    <span id={`stock-${v.sku}-error`} className="block text-ui text-alert">
                      {error}
                    </span>
                  )}
                </th>
                <td className="py-3 text-right">
                  <input type="hidden" name={`expected:${v.sku}`} value={v.stockQuantity} />
                  <input
                    id={`stock-${v.sku}`}
                    name={name}
                    type="number"
                    min={0}
                    max={9999}
                    step={1}
                    inputMode="numeric"
                    defaultValue={v.stockQuantity}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `stock-${v.sku}-error` : undefined}
                    className="field w-28 text-right tabular-nums"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm self-start">
        {pending ? "Saving…" : "Save stock"}
      </button>
    </form>
  );
}

export function AddVariantsForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(addVariants, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? {};

  return (
    <form key={state?.attempt ?? 0} action={action} aria-busy={pending} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      <FormMessage state={state} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="New colours" name="addColours" error={errors.addColours} hint="Comma-separated. Each gets every size.">
          <input id="field-addColours" name="addColours" defaultValue={values.addColours ?? ""} className="field" />
        </Field>
        <Field label="New sizes" name="addSizes" error={errors.addSizes} hint="Comma-separated. Each gets every colour.">
          <input id="field-addSizes" name="addSizes" defaultValue={values.addSizes ?? ""} className="field" />
        </Field>
      </div>
      <Field label="Starting stock per new SKU" name="addStock" error={errors.addStock}>
        <input
          id="field-addStock"
          name="addStock"
          type="number"
          min={0}
          max={9999}
          defaultValue={values.addStock ?? "0"}
          className="field max-w-40 tabular-nums"
        />
      </Field>
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm self-start">
        {pending ? "Adding…" : "Add to the grid"}
      </button>
    </form>
  );
}

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

/** Add a photo by URL, previewed before it is saved. */
export function AddImageForm({ slug, colours }: { slug: string; colours: string[] }) {
  const [state, action, pending] = useActionState(addImage, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? {};
  const [url, setUrl] = useState(values.imageUrl ?? "");
  const previewable = UNSPLASH.test(url);

  return (
    <form key={state?.attempt ?? 0} action={action} aria-busy={pending} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      <FormMessage state={state} />
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="flex flex-col gap-6">
          <Field label="Photo URL" name="imageUrl" error={errors.imageUrl} hint="An images.unsplash.com address.">
            <input
              id="field-imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={values.imageUrl ?? ""}
              onChange={(e) => setUrl(e.target.value.trim())}
              className="field"
            />
          </Field>
          <Field label="Description of the photo" name="imageAlt" error={errors.imageAlt}>
            <input id="field-imageAlt" name="imageAlt" maxLength={200} defaultValue={values.imageAlt ?? ""} className="field" />
          </Field>
          <Field
            label="Shows colour"
            name="imageColour"
            error={errors.imageColour}
            hint="Leave on “Any colour” for a photo that stands in for all of them."
          >
            <select id="field-imageColour" name="imageColour" defaultValue={values.imageColour ?? ""} className="field">
              <option value="">Any colour</option>
              {colours.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div aria-hidden="true" className="relative aspect-product self-start bg-mist">
          {previewable && <Image src={url} alt="" fill sizes="128px" className="object-cover" />}
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm self-start">
        {pending ? "Adding…" : "Add photo"}
      </button>
    </form>
  );
}

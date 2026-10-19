import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { getAdminProduct, listCategoryOptions, type AdminProduct } from "@/lib/admin-catalogue";
import { centsToInput, SLUG_PATTERN } from "@/lib/admin-forms";
import { requireAdmin } from "@/lib/session";
import { stockCopy, stockTone } from "@/lib/stock";
import {
  deleteProduct,
  moveImage,
  removeImage,
  removeVariant,
  setStatus,
  updateProduct,
} from "../actions";
import { AddImageForm, AddVariantsForm, StockForm } from "../maintenance-forms";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false },
};

// A fixed list: the query string picks a message, it never supplies one.
const notices: Record<string, { text: string; alert?: boolean }> = {
  created: { text: "Product created. It's live in the store." },
  updated: { text: "Changes saved. The store shows them now." },
  stock: { text: "Stock saved." },
  "variants-added": { text: "New SKUs added to the grid." },
  "variants-removed": { text: "SKU removed." },
  "variants-ordered": {
    text: "That SKU has been ordered, so it stays for the order history. Set its stock to 0 instead.",
    alert: true,
  },
  "photos-added": { text: "Photo added." },
  "photos-removed": { text: "Photo removed." },
  "photos-moved": { text: "Photo order saved." },
  "photos-last": { text: "A product keeps at least one photo.", alert: true },
  "status-active": { text: "Product is active: on sale in the store." },
  "status-draft": { text: "Product is a draft: hidden from the store." },
  "status-archived": {
    text: "Product archived: hidden from the store, the sitemap and checkout. Its orders are untouched.",
  },
  "danger-confirm": { text: "Type the slug exactly to delete.", alert: true },
  "danger-ordered": {
    text: "This product has been ordered, so it can't be deleted. Archive it instead.",
    alert: true,
  },
};

const statusCopy = {
  active: "Active · on sale",
  draft: "Draft · hidden",
  archived: "Archived · hidden",
} as const;

export default function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[slug]">) {
  return (
    <section className="flex flex-col gap-8">
      <Link href="/admin/products" className="link-cta self-start text-muted">
        <span aria-hidden="true">←</span> All products
      </Link>
      <Suspense fallback={<div aria-busy="true" className="h-10 w-64 bg-mist" />}>
        <EditProduct params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function EditProduct({
  params,
  searchParams,
}: Pick<PageProps<"/admin/products/[slug]">, "params" | "searchParams">) {
  await requireAdmin("/admin/products");
  const { slug } = await params;
  const { saved } = await searchParams;

  const [product, categories] = await Promise.all([
    SLUG_PATTERN.test(slug) ? getAdminProduct(slug) : null,
    listCategoryOptions(),
  ]);
  if (!product) notFound();

  const notice = typeof saved === "string" ? notices[saved] : undefined;
  const colours = [...new Set(product.variants.map((v) => v.colour))];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-title">{product.name}</h2>
          <p className="text-ui text-muted">
            /products/{product.slug} · {statusCopy[product.status]} ·{" "}
            <span className={stockTone[product.stock]}>{stockCopy[product.stock]}</span> ·{" "}
            {product.totalStock} in stock
          </p>
        </div>
        {product.status === "active" && (
          <Link href={`/products/${product.slug}`} className="link-cta" target="_blank">
            View in store
          </Link>
        )}
      </header>

      {notice && (
        <p
          role={notice.alert ? "alert" : "status"}
          className={`border-l-2 pl-4 ${notice.alert ? "border-alert text-alert" : "border-ink"}`}
        >
          {notice.text}
        </p>
      )}

      <ProductForm
        mode="edit"
        action={updateProduct}
        categories={categories}
        initial={{
          slug: product.slug,
          name: product.name,
          category: product.category.slug,
          description: product.description,
          details: product.details.join("\n"),
          care: product.care,
          price: centsToInput(product.priceCents),
          compareAt: centsToInput(product.compareAtCents),
          madeToOrder: product.madeToOrder ? "on" : "",
          stockDetail: product.stockDetail ?? "",
          lowStockThreshold: String(product.lowStockThreshold),
        }}
      />

      <Section id="stock" title="Stock">
        <p className="text-ui text-muted">
          Counts per SKU. Paid orders decrement them automatically; nothing is reserved while a
          customer is in checkout.
        </p>
        <StockForm slug={product.slug} variants={product.variants} />
      </Section>

      <Section id="variants" title="Variants">
        <VariantList product={product} />
        <AddVariantsForm slug={product.slug} />
      </Section>

      <Section id="photos" title="Photos">
        <PhotoList product={product} />
        <AddImageForm slug={product.slug} colours={colours} />
      </Section>

      <Section id="status" title="Status">
        <p className="text-ui text-muted">
          Only active products appear in the store, the sitemap, search and checkout. Bags holding a
          hidden product show it as unavailable.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["active", "draft", "archived"] as const)
            .filter((s) => s !== product.status)
            .map((status) => (
              <form key={status} action={setStatus}>
                <input type="hidden" name="slug" value={product.slug} />
                <input type="hidden" name="status" value={status} />
                <ConfirmButton
                  question={
                    status === "active"
                      ? `Put “${product.name}” on sale?`
                      : `Hide “${product.name}” from the store (${status})?`
                  }
                  tone={status === "active" ? "primary" : "secondary"}
                >
                  {status === "active" ? "Activate" : status === "draft" ? "Move to draft" : "Archive"}
                </ConfirmButton>
              </form>
            ))}
        </div>
      </Section>

      <Section id="danger" title="Delete">
        {product.hasOrders ? (
          <p className="text-ui text-muted">
            This product appears in orders, so it can&rsquo;t be deleted: the order history must keep
            it. Archive it to take it off sale.
          </p>
        ) : (
          <form action={deleteProduct} className="flex flex-col gap-3">
            <input type="hidden" name="slug" value={product.slug} />
            <label htmlFor="confirm-delete" className="text-ui text-muted">
              Never ordered, so it can be deleted with its SKUs and photos. Type{" "}
              <strong className="text-ink">{product.slug}</strong> to confirm.
            </label>
            <input
              id="confirm-delete"
              name="confirm"
              autoComplete="off"
              spellCheck={false}
              className="field max-w-sm"
            />
            <ConfirmButton
              question={`Delete “${product.name}” for good? This can't be undone.`}
              tone="danger"
              pendingLabel="Deleting…"
              className="self-start"
            >
              Delete product
            </ConfirmButton>
          </form>
        )}
      </Section>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex max-w-reading scroll-mt-[calc(var(--header-height)+2rem)] flex-col gap-5 border-t pt-6"
    >
      <h3 id={`${id}-title`} className="eyebrow text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function VariantList({ product }: { product: AdminProduct }) {
  return (
    <ul className="border-t">
      {product.variants.map((v) => (
        <li key={v.sku} className="flex items-center justify-between gap-4 border-b py-2">
          <span className="min-w-0">
            {v.colour} · {v.size}
            <span className="block truncate text-ui text-muted">
              {v.sku}
              {v.ordered ? " · ordered" : ""}
            </span>
          </span>
          {!v.ordered && product.variants.length > 1 && (
            <form action={removeVariant}>
              <input type="hidden" name="slug" value={product.slug} />
              <input type="hidden" name="sku" value={v.sku} />
              <ConfirmButton question={`Remove ${v.sku}? Bags holding it lose the line.`} pendingLabel="Removing…">
                Remove
              </ConfirmButton>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

function PhotoList({ product }: { product: AdminProduct }) {
  const last = product.images.length - 1;
  return (
    <ul className="grid grid-cols-2 gap-tile sm:grid-cols-3">
      {product.images.map((image, i) => (
        <li key={image.position} className="flex flex-col gap-2">
          <div className="relative aspect-product bg-mist">
            <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-cover" />
          </div>
          <p className="text-ui text-muted">
            {i === 0 ? "First · packshot" : `#${i + 1}`} · {image.colour ?? "Any colour"}
          </p>
          <div className="flex flex-wrap gap-1">
            {i > 0 && <MoveButton slug={product.slug} position={image.position} direction="up" />}
            {i < last && <MoveButton slug={product.slug} position={image.position} direction="down" />}
            {product.images.length > 1 && (
              <form action={removeImage}>
                <input type="hidden" name="slug" value={product.slug} />
                <input type="hidden" name="position" value={image.position} />
                <ConfirmButton question="Remove this photo?" pendingLabel="Removing…">
                  Remove
                </ConfirmButton>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function MoveButton({
  slug,
  position,
  direction,
}: {
  slug: string;
  position: number;
  direction: "up" | "down";
}) {
  return (
    <form action={moveImage}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="position" value={position} />
      <input type="hidden" name="direction" value={direction} />
      <button type="submit" className="btn btn-secondary btn-sm">
        {direction === "up" ? "Earlier" : "Later"}
      </button>
    </form>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { EmptyState, Pagination, readPage, readQuery } from "@/components/admin/admin-ui";
import {
  ADMIN_PAGE_SIZE,
  adminSorts,
  adminStockFilters,
  listAdminProducts,
  listCategoryOptions,
  type AdminProductQuery,
  type AdminSort,
  type AdminStockFilter,
} from "@/lib/admin-catalogue";
import { parseProductStatus } from "@/lib/admin-forms";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { stockCopy, stockTone } from "@/lib/stock";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false },
};

type Params = Record<string, string | string[] | undefined>;

function readFilters(params: Params): AdminProductQuery {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]);
  const sort = one("sort");
  const stock = one("stock");
  const category = one("category");
  return {
    q: readQuery(params.q),
    category: typeof category === "string" && /^[a-z0-9-]{1,80}$/.test(category) ? category : null,
    status: parseProductStatus(one("status")),
    stock: stock && stock in adminStockFilters ? (stock as AdminStockFilter) : null,
    sort: sort && sort in adminSorts ? (sort as AdminSort) : "newest",
    page: readPage(params.page),
  };
}

function queryString(f: AdminProductQuery, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  if (f.status) p.set("status", f.status);
  if (f.stock) p.set("stock", f.stock);
  if (f.sort !== "newest") p.set("sort", f.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <section aria-labelledby="products-title" className="flex flex-col gap-8">
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const statusLabel = { active: "Active", draft: "Draft", archived: "Archived" } as const;

async function ProductList({
  searchParams,
}: {
  searchParams: PageProps<"/admin/products">["searchParams"];
}) {
  await requireAdmin("/admin/products");
  const params = await searchParams;
  const filters = readFilters(params);
  const [{ rows, total }, categories] = await Promise.all([
    listAdminProducts(filters),
    listCategoryOptions(),
  ]);
  const filtered =
    filters.q !== "" || filters.category !== null || filters.status !== null || filters.stock !== null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="products-title" className="text-title">
          Products <span className="text-muted tabular-nums">({total})</span>
        </h2>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          New product
        </Link>
      </div>

      {params.deleted === "1" && (
        <p role="status" className="border-l-2 border-ink pl-4">
          Product deleted.
        </p>
      )}

      <form
        action="/admin/products"
        method="get"
        role="search"
        aria-label="Filter products"
        className="flex flex-wrap items-end gap-3 border-b pb-6"
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-ui text-muted">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, slug or SKU"
            className="field min-h-10 py-0 text-ink"
          />
        </label>
        <Select label="Category" name="category" value={filters.category ?? ""}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Status" name="status" value={filters.status ?? ""}>
          <option value="">All</option>
          {Object.entries(statusLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select label="Stock" name="stock" value={filters.stock ?? ""}>
          <option value="">All</option>
          {Object.entries(adminStockFilters).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select label="Sort" name="sort" value={filters.sort}>
          {Object.entries(adminSorts).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <button type="submit" className="btn btn-secondary btn-sm">
          Apply
        </button>
        {filtered && (
          <Link href="/admin/products" className="link text-ui">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState>{filtered ? "No products match these filters." : "No products yet."}</EmptyState>
      ) : (
        <ul className="border-t">
          {rows.map((p) => (
            <li key={p.slug} className="border-b">
              <Link
                href={`/admin/products/${p.slug}`}
                className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_8rem_10rem] sm:gap-x-6"
              >
                <div className="relative aspect-product w-12 bg-mist">
                  {p.image && (
                    <Image src={p.image.url} alt="" fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate group-hover:underline">
                    {p.name}
                    {p.status !== "active" && (
                      <span className="ml-2 border px-1.5 text-ui text-muted">{statusLabel[p.status]}</span>
                    )}
                  </p>
                  <p className="text-ui text-muted">
                    {p.category.name} · {p.variantCount} {p.variantCount === 1 ? "SKU" : "SKUs"}
                  </p>
                  <p className={`text-ui sm:hidden ${stockTone[p.stock]}`}>
                    {stockCopy[p.stock]} · {p.totalStock} in stock
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <p className="tabular-nums">{formatCents(p.priceCents)}</p>
                  {p.compareAtCents !== null && (
                    <p className="text-ui text-muted tabular-nums line-through">
                      {formatCents(p.compareAtCents)}
                    </p>
                  )}
                </div>
                <div className="hidden flex-col items-end gap-1 text-right sm:flex">
                  <p className={`text-ui ${stockTone[p.stock]}`}>{stockCopy[p.stock]}</p>
                  <p className="text-ui text-muted tabular-nums">
                    {p.totalStock} in stock · alert at {p.lowStockThreshold}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={filters.page}
        pageSize={ADMIN_PAGE_SIZE}
        total={total}
        href={(page) => `/admin/products${queryString(filters, page)}`}
      />
    </>
  );
}

function Select({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-ui text-muted">
      {label}
      <select name={name} defaultValue={value} className="field min-h-10 py-0 text-ink">
        {children}
      </select>
    </label>
  );
}

function ProductsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div className="h-10 w-48 bg-mist" />
      <div className="border-t">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} aria-hidden="true" className="flex items-center gap-4 border-b py-4">
            <div className="aspect-product w-12 bg-mist" />
            <div className="h-5 w-48 bg-mist" />
          </div>
        ))}
      </div>
    </div>
  );
}

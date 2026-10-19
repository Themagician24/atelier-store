import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listCategoryOptions } from "@/lib/admin-catalogue";
import { requireAdmin } from "@/lib/session";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false },
};

export default function NewProductPage() {
  return (
    <section aria-labelledby="new-product-title" className="flex flex-col gap-8">
      <Link href="/admin/products" className="link-cta self-start text-muted">
        <span aria-hidden="true">←</span> All products
      </Link>
      <h2 id="new-product-title" className="text-title">
        New product
      </h2>
      <Suspense fallback={null}>
        <NewProduct />
      </Suspense>
    </section>
  );
}

async function NewProduct() {
  await requireAdmin("/admin/products/new");
  const categories = await listCategoryOptions();

  return (
    <ProductForm
      mode="create"
      action={createProduct}
      categories={categories}
      initial={{ category: "", initialStock: "0", lowStockThreshold: "3" }}
    />
  );
}

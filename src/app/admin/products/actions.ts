"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  addImage as insertImage,
  addVariants as insertVariants,
  createProduct as insertProduct,
  deleteProduct as removeProduct,
  getAdminProduct,
  moveImage as reorderImage,
  removeImage as deleteImage,
  removeVariant as deleteVariant,
  setProductStatus,
  updateProduct as saveProduct,
  updateStock as saveStock,
  type WriteResult,
} from "@/lib/admin-catalogue";
import {
  formValues,
  parseNewImage,
  parseNewProduct,
  parseNewVariants,
  parseProductDetails,
  parseProductStatus,
  parseStockChanges,
  SKU_MAX,
  SLUG_PATTERN,
  wholeNumber,
  type AdminFormState,
  type FieldErrors,
} from "@/lib/admin-forms";
import { requireAdmin } from "@/lib/session";

// Every action checks the role first: an action is a public POST endpoint,
// whatever page it was rendered on. Inputs are re-validated here whatever
// the browser checked, and the product is named by its slug, never an id.
// Every change is written to the audit log by src/lib/admin-catalogue.ts.

function rejected(
  prev: AdminFormState,
  fd: FormData,
  errors: FieldErrors,
  message: string | null = null,
): AdminFormState {
  return {
    errors,
    message:
      message ??
      (Object.keys(errors).length > 0 ? "Check the highlighted fields." : null),
    values: formValues(fd),
    attempt: (prev?.attempt ?? 0) + 1,
  };
}

function refused(prev: AdminFormState, fd: FormData, result: WriteResult & { ok: false }) {
  return result.field
    ? rejected(prev, fd, { [result.field]: result.message })
    : rejected(prev, fd, {}, result.message);
}

function readSlug(fd: FormData): string | null {
  const slug = fd.get("slug");
  return typeof slug === "string" && SLUG_PATTERN.test(slug) ? slug : null;
}

/** Back to the product page with a notice from a fixed list (see page.tsx). */
function backTo(slug: string, notice: string): never {
  redirect(`/admin/products/${slug}?saved=${notice}#${notice.split("-")[0]}`);
}

export async function createProduct(
  prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin("/admin/products/new");

  const parsed = parseNewProduct(fd);
  if (!parsed.ok) return rejected(prev, fd, parsed.errors);

  const result = await insertProduct(admin.id, parsed.data);
  if (!result.ok) return refused(prev, fd, result);

  // The storefront's cached reads (homepage, collections, nav, product page)
  // all carry this tag: the new piece shows on the next request.
  updateTag("products");
  redirect(`/admin/products/${result.slug}?saved=created`);
}

export async function updateProduct(
  prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  if (!slug) return rejected(prev, fd, {}, "This product no longer exists.");

  const parsed = parseProductDetails(fd);
  if (!parsed.ok) return rejected(prev, fd, parsed.errors);

  const result = await saveProduct(admin.id, slug, parsed.data);
  if (!result.ok) return refused(prev, fd, result);

  updateTag("products");
  redirect(`/admin/products/${slug}?saved=updated`);
}

export async function updateStock(
  prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  if (!slug) return rejected(prev, fd, {}, "This product no longer exists.");

  const parsed = parseStockChanges(fd);
  if (!parsed.ok) return rejected(prev, fd, parsed.errors);
  if (parsed.data.length === 0) return rejected(prev, fd, {}, "Nothing changed.");

  const result = await saveStock(admin.id, slug, parsed.data);
  if (!result) return rejected(prev, fd, {}, "This product no longer exists.");
  if (result.applied.length > 0) updateTag("products");
  if (result.conflicts.length > 0) {
    // The page re-renders with live numbers; these rows need a second look.
    refresh();
    return {
      errors: Object.fromEntries(
        result.conflicts.map((sku) => [`stock:${sku}`, "Changed since you opened the page. Check the new count."]),
      ),
      message: `${result.applied.length} saved. ${result.conflicts.length} changed meanwhile (a sale or another admin) and were not overwritten.`,
      values: {},
      attempt: (prev?.attempt ?? 0) + 1,
    };
  }
  backTo(slug, "stock");
}

export async function addVariants(
  prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const product = slug ? await getAdminProduct(slug) : null;
  if (!slug || !product) return rejected(prev, fd, {}, "This product no longer exists.");

  const parsed = parseNewVariants(fd, slug, product.variants);
  if (!parsed.ok) return rejected(prev, fd, parsed.errors);

  const result = await insertVariants(admin.id, slug, parsed.data);
  if (!result.ok) return refused(prev, fd, result);

  updateTag("products");
  backTo(slug, "variants-added");
}

export async function removeVariant(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const sku = fd.get("sku");
  if (!slug || typeof sku !== "string" || sku.length === 0 || sku.length > SKU_MAX) {
    redirect("/admin/products");
  }
  const result = await deleteVariant(admin.id, slug, sku);
  if (result.ok) updateTag("products");
  backTo(slug, result.ok ? "variants-removed" : "variants-ordered");
}

export async function addImage(
  prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const product = slug ? await getAdminProduct(slug) : null;
  if (!slug || !product) return rejected(prev, fd, {}, "This product no longer exists.");

  const colours = [...new Set(product.variants.map((v) => v.colour))];
  const parsed = parseNewImage(fd, colours);
  if (!parsed.ok) return rejected(prev, fd, parsed.errors);

  const result = await insertImage(admin.id, slug, parsed.data);
  if (!result.ok) return refused(prev, fd, result);

  updateTag("products");
  backTo(slug, "photos-added");
}

function readPosition(fd: FormData): number | null {
  const raw = fd.get("position");
  return typeof raw === "string" ? wholeNumber(raw, 10_000) : null;
}

export async function removeImage(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const position = readPosition(fd);
  if (!slug || position === null) redirect("/admin/products");

  const result = await deleteImage(admin.id, slug, position);
  if (result.ok) updateTag("products");
  backTo(slug, result.ok ? "photos-removed" : "photos-last");
}

export async function moveImage(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const position = readPosition(fd);
  const direction = fd.get("direction");
  if (!slug || position === null || (direction !== "up" && direction !== "down")) {
    redirect("/admin/products");
  }
  await reorderImage(admin.id, slug, position, direction);
  updateTag("products");
  backTo(slug, "photos-moved");
}

export async function setStatus(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  const status = parseProductStatus(fd.get("status"));
  if (!slug || !status) redirect("/admin/products");

  await setProductStatus(admin.id, slug, status);
  // Archiving drops it from the storefront, the sitemap and checkout.
  updateTag("products");
  backTo(slug, `status-${status}`);
}

export async function deleteProduct(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/products");

  const slug = readSlug(fd);
  if (!slug) redirect("/admin/products");
  // Typed confirmation: the slug, exactly.
  if (fd.get("confirm") !== slug) backTo(slug, "danger-confirm");

  const result = await removeProduct(admin.id, slug);
  if (!result.ok) backTo(slug, "danger-ordered");

  updateTag("products");
  redirect("/admin/products?deleted=1");
}

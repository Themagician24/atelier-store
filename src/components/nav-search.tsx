"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { CloseIcon, SearchIcon } from "@/components/nav-icons";
import { Price } from "@/components/price";
import type { Navigation, NavProduct } from "@/lib/nav-types";
import { searchProducts, searchSections } from "@/lib/nav-search";
import { stockCopy, stockTone } from "@/lib/stock";

const RESULT_LIMIT = 8;
const SUGGESTION_LIMIT = 4;

/*
 * Search as a modal sheet from the top (full screen on phones). A native
 * <dialog> gives focus trapping, Escape and the backdrop for free. The input
 * is a combobox: arrows move through the results, Enter opens one.
 */
export function NavSearch({
  navigation,
  open,
  onClose,
}: {
  navigation: Navigation;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const typed = query.trim().length > 0;
  const sections = typed ? searchSections(navigation.sections, query) : [];
  const products = typed
    ? searchProducts(navigation.products, query).slice(0, RESULT_LIMIT)
    : navigation.products.slice(0, SUGGESTION_LIMIT);
  // One list for the arrow keys: sections first, then pieces.
  const options = [
    ...sections.map((s) => ({ key: `s-${s.slug}`, href: s.href })),
    ...products.map((p) => ({ key: `p-${p.slug}`, href: `/products/${p.slug}` })),
  ];
  const activeIndex = Math.min(active, options.length - 1);

  function close() {
    setQuery("");
    setActive(0);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      router.push(options[activeIndex].href);
      close();
    }
  }

  const optionProps = (index: number) => ({
    id: `${listId}-${index}`,
    role: "option" as const,
    "aria-selected": index === activeIndex,
    onMouseMove: () => setActive(index),
    onClick: close,
  });

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search"
      onClose={close}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => event.target === event.currentTarget && close()}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-paper p-0 text-ink backdrop:bg-ink/30 md:bottom-auto md:h-auto md:max-h-[85dvh] md:border-b motion-safe:animate-[nav-drop_240ms_var(--ease-standard)]"
    >
      <div className="shell flex h-(--header-height) items-center gap-3 border-b">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            options.length > 0 ? `${listId}-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search pieces, colours, categories"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-lead outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close search"
          className="btn btn-icon -mr-2.5"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="shell overflow-y-auto py-8 md:max-h-[calc(85dvh-var(--header-height))]">
        <div id={listId} role="listbox" aria-label="Results">
          {sections.length > 0 && (
            <div role="group" aria-label="Collections" className="mb-8">
              <p className="eyebrow text-muted">Collections</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sections.map((section, i) => (
                  <Link
                    key={section.slug}
                    href={section.href}
                    {...optionProps(i)}
                    className="btn btn-sm btn-secondary aria-selected:bg-ink aria-selected:text-paper"
                  >
                    {section.label}
                    <span className="opacity-60">{section.pieceCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div role="group" aria-label={typed ? "Pieces" : "New in"}>
              <p className="eyebrow text-muted">
                {typed
                  ? `${products.length} ${products.length === 1 ? "piece" : "pieces"}`
                  : "New in"}
              </p>
              <ul className="mt-3 grid gap-x-8 md:grid-cols-2">
                {products.map((product, i) => (
                  <li key={product.slug} role="presentation">
                    <ResultRow
                      product={product}
                      {...optionProps(sections.length + i)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {typed && options.length === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-lead">
              Nothing matches “{query.trim()}”.
            </p>
            <p className="text-muted">Try a category instead:</p>
            <div className="flex flex-wrap gap-2">
              {navigation.sections.map((section) => (
                <Link
                  key={section.slug}
                  href={section.href}
                  onClick={close}
                  className="btn btn-sm btn-secondary"
                >
                  {section.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

function ResultRow({
  product,
  ...option
}: { product: NavProduct } & ComponentProps<"a">) {
  return (
    <Link
      href={`/products/${product.slug}`}
      {...option}
      className="flex items-center gap-4 border-b py-3 aria-selected:bg-mist md:px-2"
    >
      <div className="media-frame w-12 shrink-0">
        <Image src={product.image.url} alt="" fill sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate">{product.name}</p>
        <p className="truncate text-ui text-muted">
          {product.category.name} ·{" "}
          {product.colours.length === 1
            ? product.colours[0]
            : `${product.colours.length} colours`}
          {product.stock !== "in-stock" && (
            <span className={stockTone[product.stock]}>
              {" "}
              · {stockCopy[product.stock]}
            </span>
          )}
        </p>
      </div>
      <Price price={product.price} compareAt={product.compareAt} className="shrink-0" />
    </Link>
  );
}

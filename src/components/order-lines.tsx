import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/format";
import type { OrderDetail } from "@/lib/order-types";

/*
 * The purchase-time snapshot of an order: lines, shipping and total, exactly
 * as they were charged. Same thumbnail column as the bag, read-only.
 */
export function OrderLines({
  order,
  titleId,
  title = "Summary",
}: {
  order: OrderDetail;
  titleId: string;
  title?: string;
}) {
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="eyebrow mb-4 text-muted">
        {title}
      </h2>
      <ul className="border-t">
        {order.items.map((item) => {
          const href = `/products/${item.productSlug}`;
          return (
            <li
              key={item.sku}
              className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-4 border-b py-5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-6"
            >
              <Link href={href} tabIndex={-1} aria-hidden="true" className="media-frame block">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt="" fill sizes="5rem" />
                )}
              </Link>
              <div className="flex min-w-0 items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="wrap-anywhere">
                    <Link href={href} className="link-quiet">
                      {item.productName}
                    </Link>
                  </p>
                  <p className="mt-1 text-ui text-muted">
                    {item.colour} · {item.size}
                  </p>
                  <p className="text-ui text-muted tabular-nums">
                    Qty {item.quantity}
                    {item.quantity > 1 && ` · ${formatCents(item.unitPriceCents)} each`}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{formatCents(item.lineTotalCents)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <dl>
        {order.totalCents !== null && (
          <div className="flex items-baseline justify-between gap-4 border-b py-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-muted tabular-nums">{formatCents(order.subtotalCents)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-b py-4">
          <dt className="text-muted">Shipping</dt>
          <dd className="text-muted">
            {order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-5">
          <dt className="eyebrow">{order.totalCents === null ? "Subtotal" : "Total"}</dt>
          <dd className="text-lead tabular-nums">
            {formatCents(order.totalCents ?? order.subtotalCents)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Same rows and heights as OrderLines, so nothing shifts when it streams in. */
export function OrderLinesSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="mb-4 h-4 w-20 bg-mist" />
      <div className="border-t">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-4 border-b py-5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-6"
          >
            <div className="media-frame" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-40 max-w-full bg-mist" />
              <div className="h-4 w-24 bg-mist" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

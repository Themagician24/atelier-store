import { currency } from "@/lib/format";

/** Catalogue price; a reduced price shows the original struck through. */
export function Price({
  price,
  compareAt,
  className = "",
}: {
  price: number;
  compareAt: number | null;
  className?: string;
}) {
  if (compareAt === null) {
    return <p className={className}>{currency(price)}</p>;
  }
  return (
    <p className={className}>
      <s className="text-muted">
        <span className="sr-only">Was </span>
        {currency(compareAt)}
      </s>{" "}
      <span className="text-alert">
        <span className="sr-only">Now </span>
        {currency(price)}
      </span>
    </p>
  );
}

import Link from "next/link";

// Shown for an unknown reference and for another customer's order alike:
// the two are indistinguishable on purpose.
export default function OrderNotFound() {
  return (
    <div className="flex max-w-reading flex-col gap-6">
      <h2 className="text-title">We can&rsquo;t find this order</h2>
      <p className="text-muted">
        Check the reference in your confirmation email, or find it in your
        order history.
      </p>
      <Link href="/account/orders" className="btn btn-primary self-start">
        View your orders
      </Link>
    </div>
  );
}

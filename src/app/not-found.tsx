import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shell flex flex-1 flex-col items-center justify-center gap-6 py-section text-center">
        <p className="eyebrow text-muted">Page not found</p>
        <h1 className="text-display">This piece isn’t here</h1>
        <p className="max-w-reading text-lead text-muted">
          It may have sold through or moved. The latest arrivals are a good
          place to start again.
        </p>
        <Link href="/" className="btn btn-primary mt-4">
          Back to the homepage
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}

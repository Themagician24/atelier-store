"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";

// One entry per admin section that exists. Hiding a link protects nothing:
// each route and action checks the role itself.
const adminNav = [
  { label: "Overview", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Sign-ups", href: "/admin/signups" },
  { label: "Insights", href: "/admin/insights" },
  { label: "Audit log", href: "/admin/audit" },
];

// Under a dynamic segment (/admin/products/[slug]) usePathname() suspends:
// the same nav shows, with no current item, until it resolves.
export function AdminNavFallback() {
  return <AdminNavView pathname={null} />;
}

export function AdminNav() {
  return <AdminNavView pathname={usePathname()} />;
}

// A row under the title on phones, a column beside the content from lg.
function AdminNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin" className="border-b pb-4 lg:border-b-0 lg:pb-0">
      <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 lg:flex-col lg:items-start lg:gap-4">
        {adminNav.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              className="eyebrow link-quiet inline-flex min-h-11 items-center"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto lg:ml-0 lg:mt-4 lg:w-full lg:border-t lg:pt-4">
          <form action={signOut}>
            <SignOutButton />
          </form>
        </li>
      </ul>
    </nav>
  );
}

// A product's edit page still marks "Products"; Overview only on /admin itself.
function isCurrent(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="eyebrow link-quiet inline-flex min-h-11 cursor-pointer items-center text-muted disabled:cursor-default"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

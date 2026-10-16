"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";

// One entry per account page.
const accountNav = [
  { label: "Account details", href: "/account" },
  { label: "Orders", href: "/account/orders" },
];

// Under an order's [reference] segment the pathname is only known at request
// time and usePathname() suspends: the layout shows this same nav, with no
// current item, until it resolves. Static account routes never see it.
export function AccountNavFallback() {
  return <AccountNavView pathname={null} />;
}

export function AccountNav() {
  return <AccountNavView pathname={usePathname()} />;
}

// A row under the title on phones, a column beside the content from lg.
function AccountNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Account" className="border-b pb-4 lg:border-b-0 lg:pb-0">
      <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 lg:flex-col lg:items-start lg:gap-4">
        {accountNav.map((item) => (
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

// "/account" is the root of the others, so it only matches itself; an order
// detail page still marks "Orders".
function isCurrent(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  return href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
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

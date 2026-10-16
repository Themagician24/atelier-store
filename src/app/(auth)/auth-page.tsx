import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser, safeNext } from "@/lib/session";
import { AuthForm } from "./auth-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Shared shell for /sign-in and /sign-up. The heading is static; the form
// reads the request (searchParams, session), so it streams behind Suspense.
export function AuthPage({
  mode,
  title,
  lead,
  searchParams,
}: {
  mode: "sign-in" | "sign-up";
  title: string;
  lead: string;
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />
      <main className="shell flex flex-1 flex-col items-center py-section">
        <div className="flex w-full max-w-form flex-col gap-10">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-display">{title}</h1>
            <p className="text-lead text-muted">{lead}</p>
          </div>
          <Suspense fallback={<div className="min-h-96" />}>
            <AuthFormGate mode={mode} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function AuthFormGate({
  mode,
  searchParams,
}: {
  mode: "sign-in" | "sign-up";
  searchParams: SearchParams;
}) {
  const next = safeNext((await searchParams).next);
  // Already signed in: nothing to do here.
  if (await getCurrentUser()) redirect(next);
  return <AuthForm mode={mode} next={next} />;
}

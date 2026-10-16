import type { Metadata } from "next";
import { AuthPage } from "../auth-page";

export const metadata: Metadata = {
  title: "Sign in — Atelier",
  robots: { index: false },
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <AuthPage
      mode="sign-in"
      title="Sign in"
      lead="Welcome back."
      searchParams={searchParams}
    />
  );
}

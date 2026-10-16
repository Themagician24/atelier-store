import type { Metadata } from "next";
import { AuthPage } from "../auth-page";

export const metadata: Metadata = {
  title: "Create an account — Atelier",
  robots: { index: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <AuthPage
      mode="sign-up"
      title="Create an account"
      lead="Keep your details for faster checkout."
      searchParams={searchParams}
    />
  );
}

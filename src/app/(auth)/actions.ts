"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Deletes the session row; nextCookies() clears the cookie on the response.
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { revokeSessions } from "@/lib/admin-customers";
import { requireAdmin } from "@/lib/session";

// The one account action the back office needs: sign a customer out on
// every device (lost phone, shared computer). Roles stay CLI-only
// (npm run auth:role), and no action reads or changes credentials.

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function signOutEverywhere(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/customers");

  const id = fd.get("id");
  if (typeof id !== "string" || !USER_ID.test(id)) redirect("/admin/customers");
  const revoked = await revokeSessions(admin.id, id);
  redirect(`/admin/customers/${id}?revoked=${revoked}`);
}

"use server";

import { redirect } from "next/navigation";
import { fulfilmentStatuses, type FulfilmentStatus } from "@/db/schema";
import { advanceFulfilment } from "@/lib/admin-orders";
import { requireAdmin } from "@/lib/session";

// The admin can move preparation and delivery forward, one step at a time,
// on paid orders only. There is deliberately no action that touches payment
// status: only the verified Stripe webhook does that.

const REFERENCE = /^AT-[2-9A-HJ-NP-Z]{6}$/;

function readFulfilment(raw: FormDataEntryValue | null): FulfilmentStatus | null {
  return (fulfilmentStatuses as readonly unknown[]).includes(raw) ? (raw as FulfilmentStatus) : null;
}

export async function moveFulfilment(fd: FormData): Promise<void> {
  const admin = await requireAdmin("/admin/orders");

  const reference = fd.get("reference");
  const from = readFulfilment(fd.get("from"));
  const to = readFulfilment(fd.get("to"));
  if (typeof reference !== "string" || !REFERENCE.test(reference) || !from || !to) {
    redirect("/admin/orders");
  }
  const moved = await advanceFulfilment(admin.id, reference, from, to);
  redirect(`/admin/orders/${reference}?fulfilment=${moved ? "moved" : "stale"}`);
}

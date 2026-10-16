import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin — Atelier",
  robots: { index: false },
};

// Nothing static is rendered before requireAdmin(): a customer gets the
// 404, not an admin shell with an empty slot.
export default function AdminPage() {
  return (
    <main className="shell flex-1 py-section">
      <Suspense fallback={null}>
        <AdminDashboard />
      </Suspense>
    </main>
  );
}

async function AdminDashboard() {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="section-head">
        <p className="eyebrow text-muted">Admin</p>
        <h1 className="text-display">Atelier admin</h1>
        <p className="text-lead text-muted">Signed in as {admin.email}.</p>
      </div>
      <form action={signOut}>
        <button type="submit" className="btn btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}

import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, user } from "@/db/schema";

/*
 * The back-office audit trail. Where the change is an unconditional insert,
 * `auditEntry(...)` joins its db.batch() and they commit together; where the
 * write is guarded (it may match no row), the entry is written right after,
 * only if the change happened. `details` holds what changed (slugs, counts, statuses), never a
 * secret, a password, a token or card data.
 */

export type AuditTarget = "product" | "order" | "customer";

export function auditEntry(
  actorUserId: string,
  action: string,
  targetType: AuditTarget,
  targetId: string,
  details: Record<string, unknown> | null = null,
) {
  return db.insert(adminAuditLog).values({
    actorUserId,
    action,
    targetType,
    targetId,
    details,
  });
}

export type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  actor: string | null;
};

export const AUDIT_PAGE_SIZE = 50;

export async function listAudit(page: number): Promise<{ rows: AuditRow[]; total: number }> {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: adminAuditLog.id,
        action: adminAuditLog.action,
        targetType: adminAuditLog.targetType,
        targetId: adminAuditLog.targetId,
        details: adminAuditLog.details,
        createdAt: adminAuditLog.createdAt,
        actor: user.name,
      })
      .from(adminAuditLog)
      .leftJoin(user, eq(user.id, adminAuditLog.actorUserId))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(adminAuditLog),
  ]);
  return { rows, total };
}

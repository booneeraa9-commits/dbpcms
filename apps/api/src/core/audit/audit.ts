import { prisma } from "../db/prisma.js";

/**
 * Writes an entry to the append-only audit log. Call this for every critical
 * mutation (create/update/delete/approve/etc.). Pass before/after snapshots so
 * the trail records exactly what changed.
 */
export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  // Allow writing inside an existing transaction.
  tx?: { auditLog: { create: (args: unknown) => unknown } };
}): Promise<void> {
  const client = params.tx ?? prisma;
  await (client.auditLog.create as (args: unknown) => Promise<unknown>)({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      before: (params.before ?? undefined) as never,
      after: (params.after ?? undefined) as never,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}

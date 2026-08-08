import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList } from "../../core/http/responses.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";

/**
 * Read-only audit-log viewer (admin). The audit log is append-only; there is no
 * create/update/delete endpoint by design — the trail must be tamper-evident.
 */
export const auditLogsRouter = Router();
auditLogsRouter.use(authenticate);

auditLogsRouter.get(
  "/",
  requirePermission(PERMISSIONS.AUDIT_LOG_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const q = parseListQuery(req.query as Record<string, unknown>, ["createdAt"], {
      createdAt: "desc",
    });
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType =
      typeof req.query.entityType === "string" ? req.query.entityType : undefined;

    const where = {
      ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
      ...(entityType ? { entityType } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.orderBy,
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    sendList(res, items, { page: q.page, pageSize: q.pageSize, totalItems: total });
  }),
);

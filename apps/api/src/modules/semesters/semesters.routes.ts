import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS, semesterCreateSchema } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";

/**
 * Semesters belong to an academic year. This module is small enough to keep
 * routes + handlers together; the same service/repository split can be extracted
 * later if it grows.
 */
function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const semestersRouter = Router();
semestersRouter.use(authenticate);

semestersRouter.get(
  "/",
  requirePermission(PERMISSIONS.PROGRAM_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const q = parseListQuery(
      req.query as Record<string, unknown>,
      ["name", "sequence", "startDate", "createdAt"],
      { startDate: "desc" },
    );
    const academicYearId =
      typeof req.query.academicYear === "string" ? req.query.academicYear : undefined;
    const where = {
      deletedAt: null,
      ...(academicYearId ? { academicYearId } : {}),
      ...(q.search
        ? { name: { contains: q.search, mode: "insensitive" as const } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.semester.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.orderBy,
        include: { academicYear: { select: { id: true, name: true } } },
      }),
      prisma.semester.count({ where }),
    ]);
    sendList(res, items, { page: q.page, pageSize: q.pageSize, totalItems: total });
  }),
);

semestersRouter.post(
  "/",
  requirePermission(PERMISSIONS.SEMESTER_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const input = semesterCreateSchema.parse(req.body);
    const year = await prisma.academicYear.findFirst({
      where: { id: input.academicYearId, deletedAt: null },
    });
    if (!year) throw new NotFoundError("Selected academic year does not exist.");

    const clash = await prisma.semester.findFirst({
      where: {
        academicYearId: input.academicYearId,
        sequence: input.sequence,
        deletedAt: null,
      },
    });
    if (clash) {
      throw new ConflictError(
        `Semester sequence ${input.sequence} already exists for this academic year.`,
      );
    }

    const a = actor(req);
    const created = await prisma.semester.create({
      data: {
        academicYearId: input.academicYearId,
        name: input.name,
        sequence: input.sequence,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: input.status,
        createdBy: a.userId,
        updatedBy: a.userId,
      },
    });
    await writeAudit({
      userId: a.userId,
      action: "semester.create",
      entityType: "Semester",
      entityId: created.id,
      after: created,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
    });
    sendSuccess(res, created, 201);
  }),
);

semestersRouter.delete(
  "/:id",
  requirePermission(PERMISSIONS.SEMESTER_MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const a = actor(req);
    const before = await prisma.semester.findFirst({
      where: { id: req.params.id!, deletedAt: null },
    });
    if (!before) throw new NotFoundError("Semester not found.");
    await prisma.semester.update({
      where: { id: req.params.id! },
      data: { deletedAt: new Date(), updatedBy: a.userId },
    });
    await writeAudit({
      userId: a.userId,
      action: "semester.delete",
      entityType: "Semester",
      entityId: req.params.id!,
      before,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
    });
    res.status(204).send();
  }),
);

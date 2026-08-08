/**
 * Activity log (audit trail) endpoints.
 *
 *   GET /api/v1/activity          — paginated list, optional filters
 *   GET /api/v1/activity/:id      — single entry detail
 *   GET /api/v1/activity/recent   — most recent N (for dashboard)
 *   GET /api/v1/activity/stats    — counts by action, by user
 *
 * Only super_admin and principal can read these. Nobody can create/update
 * them via HTTP — they are written by the service from other modules.
 */

import { Request, Response } from 'express';
import { prisma } from '../../infra/database/client';
import { sendSuccess } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError, ForbiddenError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';

export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  if (!caller.roles.includes('super_admin') && !caller.roles.includes('principal')) {
    throw new ForbiddenError('You cannot view the activity log');
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30));
  const where: any = {};
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.action) where.action = req.query.action;
  if (req.query.resource) where.resource = req.query.resource;
  if (req.query.resourceId) where.resourceId = req.query.resourceId;

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  sendSuccess(res, items, 200, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  if (!caller.roles.includes('super_admin') && !caller.roles.includes('principal')) {
    throw new ForbiddenError('You cannot view the activity log');
  }
  const entry = await prisma.activityLog.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!entry) return sendSuccess(res, null);
  return sendSuccess(res, entry);
});

export const getRecent = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  if (!caller.roles.includes('super_admin') && !caller.roles.includes('principal')) {
    throw new ForbiddenError('You cannot view the activity log');
  }
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const items = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  sendSuccess(res, items);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  if (!caller.roles.includes('super_admin') && !caller.roles.includes('principal')) {
    throw new ForbiddenError('You cannot view the activity log');
  }
  const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, byAction, topUsers] = await Promise.all([
    prisma.activityLog.count({ where: { createdAt: { gte: since } } }),
    prisma.activityLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.activityLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  // Hydrate user names
  const userIds = topUsers.map((u) => u.userId!).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topUsersWithNames = topUsers.map((u) => ({
    userId: u.userId,
    user: userMap.get(u.userId!) || null,
    count: u._count._all,
  }));

  sendSuccess(res, {
    since: since.toISOString(),
    total,
    byAction: byAction.map((b) => ({ action: b.action, count: b._count._all })),
    topUsers: topUsersWithNames,
  });
});

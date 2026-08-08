/**
 * Notifications controller.
 *
 * Exposes the bell-badge + full-page endpoints. Notification creation is
 * only callable by super_admin (other modules use the service directly).
 */

import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError, ForbiddenError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { listNotificationsQuerySchema, createNotificationSchema } from './notifications.schema';

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const query = listNotificationsQuerySchema.parse(req.query);
  const out = await notificationsService.listForUser(caller.id, query);
  sendSuccess(res, out.items, 200, out.meta);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const count = await notificationsService.getUnreadCount(caller.id);
  sendSuccess(res, { count });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const updated = await notificationsService.markRead(req.params.id, caller.id);
  sendSuccess(res, updated);
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  const count = await notificationsService.markAllRead(caller.id, req);
  sendSuccess(res, { count });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  await notificationsService.delete(req.params.id, caller.id);
  sendNoContent(res);
});

/**
 * Admin/system endpoint to create a notification. Used by the seed script
 * and by future modules (e.g. "X happened" hooks).
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const caller = getCurrentUser(req);
  if (!caller) throw new UnauthorizedError();
  if (!caller.roles.includes('super_admin')) throw new ForbiddenError('Only super_admin can create notifications directly');
  const input = createNotificationSchema.parse(req.body);
  const created = await notificationsService.notify(input);
  sendSuccess(res, created, 201);
});

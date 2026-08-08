/**
 * Notifications service.
 *
 * Used by the rest of the app to push notifications to users when something
 * interesting happens (e.g. a result needs verification, a question was
 * approved, a student was registered, etc.).
 *
 * In a production setup you would also dispatch to email/push — here we
 * keep it in-DB so the UI bell works end-to-end with no extra infrastructure.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { activityLog } from '../activity/activity.service';
import type { Request } from 'express';
import type { CreateNotificationInput, ListNotificationsQuery } from './notifications.schema';

export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  readAt: string | null;
  createdAt: string;
}

class NotificationsService {
  /**
   * Send a notification to a single user. Returns the created row.
   */
  async notify(input: CreateNotificationInput): Promise<NotificationDTO> {
    const n = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
    return this.toDTO(n);
  }

  /**
   * Send the same notification to many users (e.g. all department heads).
   */
  async notifyMany(userIds: string[], payload: Omit<CreateNotificationInput, 'userId'>): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: (payload.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      })),
    });
    return result.count;
  }

  /**
   * List the notifications for a specific user. Used by the UI bell + page.
   */
  async listForUser(userId: string, query: ListNotificationsQuery) {
    const { page, pageSize, skip, take } = normalizePagination(query);
    const where: Prisma.NotificationWhereInput = { userId };
    if (query.unreadOnly) where.readAt = null;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);
    return {
      items: items.map((n) => this.toDTO(n)),
      meta: buildMeta(total, page, pageSize),
    };
  }

  /**
   * Returns just the count of unread notifications — for the bell badge.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  /**
   * Mark a notification as read. Idempotent.
   */
  async markRead(notificationId: string, userId: string): Promise<NotificationDTO> {
    const n = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n) throw new NotFoundError('Notification not found');
    if (n.userId !== userId) throw new BadRequestError('Not your notification');
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.toDTO(updated);
  }

  /**
   * Mark all of a user's notifications as read in one call.
   */
  async markAllRead(userId: string, req?: Request): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (req) {
      await activityLog.log(req, {
        userId,
        action: 'UPDATE',
        resource: 'notification',
        description: `Marked ${result.count} notifications as read`,
      });
    }
    return result.count;
  }

  /**
   * Delete a notification.
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    const n = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n) throw new NotFoundError('Notification not found');
    if (n.userId !== userId) throw new BadRequestError('Not your notification');
    await prisma.notification.delete({ where: { id: notificationId } });
  }

  private toDTO(n: any): NotificationDTO {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? null,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}

export const notificationsService = new NotificationsService();

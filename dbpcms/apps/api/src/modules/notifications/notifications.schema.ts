/**
 * Zod validators for notifications endpoints.
 */

import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  data: z.record(z.any()).optional(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

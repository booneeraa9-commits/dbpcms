/**
 * Activity log service.
 * Every important action calls this to leave a forensic trail.
 *
 * Examples:
 *   await activityLog.log(req, { action: 'LOGIN', userId: user.id });
 *   await activityLog.log(req, { action: 'CREATE', resource: 'student', resourceId: id });
 *   await activityLog.log(req, { action: 'DELETE', resource: 'user', resourceId: id, description: 'Deleted user John' });
 *
 * Failures here MUST NOT break the request — logging is best-effort.
 */

import { Prisma, ActivityAction } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../infra/database/client';
import { logger } from '../../infra/logger';

export interface LogEntry {
  userId?: string | null;
  action: ActivityAction;
  resource?: string;
  resourceId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

class ActivityLogService {
  async log(req: Request | null, entry: LogEntry): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          description: entry.description,
          metadata: entry.metadata,
          ipAddress: req?.ip ?? null,
          userAgent: req?.headers['user-agent'] ?? null,
        },
      });
    } catch (err) {
      // Log but don't throw — we never want a logging failure to break a request
      logger.error({ err, entry }, 'Failed to write activity log');
    }
  }
}

export const activityLog = new ActivityLogService();

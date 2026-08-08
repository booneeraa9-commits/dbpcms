/**
 * Prisma client singleton.
 *
 * In development, hot-reload can create many PrismaClient instances,
 * which exhausts DB connections. We attach ONE client to globalThis
 * so HMR reuses the same instance.
 *
 * In production, we just create one and that's it.
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { logger } from '../logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: config.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });

// Log queries in development to help debug
if (config.isDevelopment) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'DB query');
  });
}

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ message: e.message }, 'DB error');
});

if (config.isDevelopment) {
  global.__prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection established');
    return true;
  } catch (error) {
    logger.error({ err: error }, '❌ Database connection failed');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

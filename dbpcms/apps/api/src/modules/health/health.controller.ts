/**
 * Health check endpoints.
 * Used by Docker, Kubernetes, load balancers, monitoring tools.
 *
 *   GET /health/live  → "Am I running?" (always 200 if process is up)
 *   GET /health/ready → "Am I ready to serve?" (checks DB connection)
 *   GET /health       → detailed status with version, uptime, etc.
 */

import { Request, Response } from 'express';
import { prisma } from '../../infra/database/client';
import { config } from '../../config';
import { packageJson } from '../../package-info';

const startTime = Date.now();

export async function live(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: { status: 'alive', timestamp: new Date().toISOString() },
  });
}

export async function ready(_req: Request, res: Response) {
  const checks: Record<string, { status: 'up' | 'down'; latencyMs?: number; error?: string }> = {};

  // Check database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'up', latencyMs: Date.now() - dbStart };
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const allUp = Object.values(checks).every((c) => c.status === 'up');
  const status = allUp ? 'ready' : 'not_ready';

  res.status(allUp ? 200 : 503).json({
    success: allUp,
    data: {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function detailed(_req: Request, res: Response) {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    data: {
      app: {
        name: config.APP_NAME,
        env: config.NODE_ENV,
        version: packageJson.version,
      },
      system: {
        uptime: `${Math.floor(uptime)}s`,
        uptimeSeconds: uptime,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        },
        node: process.version,
        platform: process.platform,
      },
      startedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
    },
  });
}

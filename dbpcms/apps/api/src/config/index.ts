/**
 * Centralized environment configuration.
 * We validate ALL env vars at startup — if anything is missing or wrong,
 * the app refuses to start. Fail-fast prevents hours of debugging.
 *
 * Why this pattern?
 *   - No `process.env.X` scattered across the codebase
 *   - One place to see every config value
 *   - Type safety: env vars are strongly typed
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),

  APP_NAME: z.string().default('DBPCMS'),
  APP_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // We use console here because logger may not be initialized yet.
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:');
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
} as const;

export type Config = typeof config;

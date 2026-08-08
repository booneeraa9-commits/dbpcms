/**
 * Structured logger using Pino.
 * In production, logs are JSON (machine-readable) so they can be shipped to
 * Datadog, CloudWatch, or any log aggregator. In development, pino-pretty
 * makes them human-readable.
 */

import pino from 'pino';
import { config } from '../../config';

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    service: config.APP_NAME,
    env: config.NODE_ENV,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});

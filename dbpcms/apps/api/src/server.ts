/**
 * Server entry point.
 * Boots the database connection, then starts listening.
 * Handles graceful shutdown so we don't lose data on Ctrl+C.
 */

import { createApp } from './app';
import { config } from './config';
import { logger } from './infra/logger';
import { checkDatabaseConnection, disconnectDatabase } from './infra/database/client';

async function bootstrap() {
  logger.info('🚀 Starting DBPCMS API…');
  logger.info(`📦 Environment: ${config.NODE_ENV}`);
  logger.info(`🔌 Port: ${config.PORT}`);

  // Verify DB before serving traffic
  const dbReady = await checkDatabaseConnection();
  if (!dbReady) {
    logger.fatal('Cannot start without a database connection');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`✅ API listening at http://localhost:${config.PORT}`);
    logger.info(`🏥 Health check at http://localhost:${config.PORT}/health`);
    logger.info(`📚 API base at http://localhost:${config.PORT}/api/v1`);
  });

  // ─── Graceful shutdown ───
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully…`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close DB pool
      await disconnectDatabase();
      logger.info('Database disconnected');

      logger.info('👋 Bye!');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});

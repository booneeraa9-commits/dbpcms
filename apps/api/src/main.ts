import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logging/logger.js";

/**
 * The entry point. Starts the HTTP server and handles graceful shutdown so the
 * process stops cleanly when the VPS restarts it.
 */
function start(): void {
  const app = createApp();

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `DBPCMS API listening on http://localhost:${env.PORT}`,
    );
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Shutting down gracefully...");
    server.close(() => {
      logger.info("HTTP server closed. Bye.");
      process.exit(0);
    });
    // Force-exit if it hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

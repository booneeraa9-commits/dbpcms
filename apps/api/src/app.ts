import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./core/logging/logger.js";
import { requestContext } from "./middleware/request-context.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { generalRateLimiter } from "./middleware/rate-limit.js";
import { apiV1Router } from "./routes.js";
import { sendSuccess } from "./core/http/responses.js";

/**
 * Builds and wires the Express application: security middleware, logging,
 * routing, and (last) error handling. Kept separate from main.ts so tests can
 * import the app without starting a real server.
 *
 * ORDER MATTERS. Middleware runs top to bottom; the error handler must be last.
 */
export function createApp(): Express {
  const app = express();

  // Trust the reverse proxy (the VPS will sit behind one) so client IPs are correct.
  app.set("trust proxy", 1);

  // Security headers (Helmet) — sensible defaults against common attacks.
  app.use(helmet());

  // Cross-Origin Resource Sharing — only our known frontend origins may call us.
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );

  // Parse JSON bodies (with a size limit to blunt abuse).
  app.use(express.json({ limit: "1mb" }));

  // Parse cookies (needed to read the refresh-token cookie).
  app.use(cookieParser());

  // Give every request an id, then log it.
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      customProps: (_req, res) => ({ requestId: res.locals.requestId }),
    }),
  );

  // Liveness probe at the ROOT path too (some monitors expect /health at root).
  app.get("/health", (_req, res) =>
    sendSuccess(res, { status: "ok", service: "dbpcms-api" }),
  );

  // The versioned API (with a general rate limit).
  app.use("/api/v1", generalRateLimiter, apiV1Router);

  // 404 for anything unmatched, then the central error handler (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

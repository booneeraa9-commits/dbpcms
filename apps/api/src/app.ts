import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
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
  // We disable the Content-Security-Policy default because, in production, this
  // same server also serves the built React app (a single-page application),
  // and Helmet's strict default CSP would block the app's own scripts/styles.
  // Everything else Helmet provides (HSTS, no-sniff, etc.) stays on.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

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

  // ---------------------------------------------------------------------------
  // Serve the built frontend (production single-service hosting, e.g. Render).
  //
  // In development the frontend runs on its own Vite dev server (port 5173) and
  // proxies /api calls here — so we do NOTHING in that mode. In production we
  // build the React app to static files and let THIS server hand them out, so
  // the whole system runs as one process behind one URL (simpler & cheaper).
  //
  // The built files are copied to apps/api/public during the production build
  // (see the build:web:copy script). We only enable this if that folder exists,
  // so a missing build never breaks the API in development.
  // ---------------------------------------------------------------------------
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // dist/app.js -> ../public  (apps/api/public)
  const clientDir = path.resolve(currentDir, "../public");
  const indexHtml = path.join(clientDir, "index.html");

  if (fs.existsSync(indexHtml)) {
    logger.info({ clientDir }, "Serving built frontend from disk.");

    // Serve the static assets (JS/CSS/images). These have hashed filenames so
    // they can be cached aggressively; index.html must never be cached.
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );

    // SPA fallback: any non-API GET that isn't a real file returns index.html,
    // so the React Router can handle client-side routes like /transcripts.
    app.get(/^\/(?!api\/).*/, (req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(indexHtml);
    });
  }

  // 404 for anything unmatched, then the central error handler (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

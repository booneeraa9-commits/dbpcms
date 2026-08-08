/**
 * Express application setup.
 * This file CREATES and CONFIGURES the app, but does NOT listen on a port.
 * That happens in server.ts. This separation lets us test the app in isolation.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { requestLogger, requestId } from './common/middlewares';
import { errorHandler, notFoundHandler } from './common/middlewares/errorHandler';
import apiRoutes from './routes';
import healthRoutes from './modules/health/health.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security & parsing middleware (order matters!) ───
  app.set('trust proxy', 1); // Trust X-Forwarded-* headers (when behind nginx, load balancer)
  app.use(helmet()); // Secure HTTP headers
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );
  app.use(compression()); // Gzip responses
  app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse form data
  app.use(requestId); // Tag every request
  app.use(requestLogger); // Log every request

  // ─── Health checks (no /api prefix, before API routes) ───
  app.use('/health', healthRoutes);

  // ─── API routes ───
  app.use('/api/v1', apiRoutes);

  // ─── Root endpoint (so visiting the API URL is friendly) ───
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: config.APP_NAME,
        message: 'Welcome to the DBPCMS API',
        docs: '/api/v1/docs',
        health: '/health',
        version: 'v1',
      },
    });
  });

  // ─── 404 & error handlers (must be LAST) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

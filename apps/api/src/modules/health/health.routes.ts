import { Router } from "express";
import { sendSuccess } from "../../core/http/responses.js";

/**
 * Health module. The /health endpoint lets monitoring tools (and later the
 * Ethio Telecom VPS) check that the API is alive. It requires no authentication.
 *
 * This is intentionally tiny — it also proves the whole request pipeline
 * (context -> routing -> response envelope) works end to end.
 */
export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    service: "dbpcms-api",
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

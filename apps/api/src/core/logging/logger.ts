import pino from "pino";
import { env } from "../../config/env.js";

/**
 * Structured (JSON) logger. In development it prints human-friendly colored
 * output; in production it emits JSON that log tools can parse.
 *
 * Sensitive fields are redacted so passwords/tokens never end up in logs.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "newPassword",
      "currentPassword",
      "token",
      "accessToken",
      "refreshToken",
    ],
    censor: "[redacted]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});

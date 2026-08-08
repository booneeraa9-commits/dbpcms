import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

/**
 * Load the .env file BEFORE anything reads process.env. Path is resolved
 * relative to this file, so it works no matter which folder you run from.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envFilePath = path.resolve(currentDir, "../../.env");
loadDotenv({ path: envFilePath });
/**
 * Reads and VALIDATES environment variables at startup.
 * If a required variable is missing or malformed, the app refuses to start with
 * a clear message ("fail fast, fail loud") instead of crashing mysteriously
 * later. This single file is the only place that touches process.env.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters."),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters."),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  STORAGE_ROOT: z.string().default("./storage"),
  SEED_ADMIN_EMAIL: z.string().email().default("booneeraa9@gmail.com"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe!Temp1234"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print a readable list of what's wrong, then stop.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(
    `\n[DBPCMS] Invalid environment configuration:\n${issues}\n\n` +
      `Copy apps/api/.env.example to apps/api/.env and fill in the values.\n`,
  );
  process.exit(1);
}

/** The validated, strongly-typed configuration used everywhere in the backend. */
export const env = parsed.data;
export type Env = typeof env;

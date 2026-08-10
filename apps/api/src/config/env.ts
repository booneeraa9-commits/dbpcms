import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

/**
 * IMPORTANT: load the .env file BEFORE anything reads process.env.
 * We resolve the path relative to THIS file (apps/api/src/config/env.ts) so it
 * works no matter which folder you run the command from. The .env lives at
 * apps/api/.env — two levels up from this file's directory.
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
  // The PUBLIC address of this deployment, used to build QR verification links
  // and any other absolute URL that must work from OUTSIDE the server (e.g. a
  // phone scanning a printed transcript). This must be the address a visitor
  // types in their browser — NOT localhost.
  //
  // Precedence when building the effective public URL (see `publicAppUrl` below):
  //   1. PUBLIC_APP_URL if you set it explicitly (best for a custom domain), else
  //   2. RENDER_EXTERNAL_URL, which Render injects automatically (e.g.
  //      https://dbpcms.onrender.com) — so on Render this "just works", else
  //   3. the first CORS origin, else
  //   4. http://localhost:5173 for local development.
  PUBLIC_APP_URL: z.string().optional(),
  RENDER_EXTERNAL_URL: z.string().optional(),
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
      `Copy apps/api/.env.example to apps/api/.env and fill in the values.\n` +
      `(Looked for the file at: ${envFilePath})\n`,
  );
  process.exit(1);
}

/** The validated, strongly-typed configuration used everywhere in the backend. */
export const env = parsed.data;
export type Env = typeof env;

/**
 * The effective PUBLIC base URL of this deployment, with a trailing slash removed.
 * Use THIS (not CORS_ORIGINS) whenever you build an absolute URL that must work
 * from outside the server — most importantly the QR verification links printed on
 * employee profiles and transcripts.
 *
 * See PUBLIC_APP_URL in the schema above for the precedence order. On Render,
 * RENDER_EXTERNAL_URL is set automatically, so QR codes point at the live site
 * with zero configuration.
 */
export const publicAppUrl: string = (
  env.PUBLIC_APP_URL ||
  env.RENDER_EXTERNAL_URL ||
  env.CORS_ORIGINS[0] ||
  "http://localhost:5173"
).replace(/\/+$/, "");

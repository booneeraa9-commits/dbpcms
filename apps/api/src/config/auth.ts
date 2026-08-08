import { env } from "./env.js";

/**
 * Centralized authentication tuning values. Keeping these here (some backed by
 * env vars) means security thresholds are easy to find and adjust.
 */
export const authConfig = {
  accessTokenSecret: env.JWT_ACCESS_SECRET,
  refreshTokenSecret: env.JWT_REFRESH_SECRET,
  accessTokenTtl: env.JWT_ACCESS_TTL, // e.g. "15m"
  refreshTokenTtl: env.JWT_REFRESH_TTL, // e.g. "7d"

  // Account-lockout policy (brute-force protection).
  maxFailedLogins: 5,
  lockoutMinutes: 15,

  // Refresh token cookie settings.
  refreshCookieName: "dbpcms_refresh_token",
  isProduction: env.NODE_ENV === "production",
} as const;

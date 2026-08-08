import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { authConfig } from "../../config/auth.js";

/**
 * Helpers for creating and verifying tokens.
 *
 * - Access token: a signed JWT the client sends on every request. Short-lived.
 * - Refresh token: a long random string. We store only its SHA-256 HASH in the
 *   database, so a database leak never exposes usable tokens.
 */

export interface AccessTokenPayload {
  sub: string; // user id
  tokenVersion: number;
  permissions: string[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: authConfig.accessTokenTtl as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, authConfig.accessTokenSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, authConfig.accessTokenSecret) as AccessTokenPayload;
}

/** Generates a cryptographically strong random refresh token (the raw value). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/** Hashes a refresh token for safe storage/lookup. */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Converts a TTL string like "7d" / "15m" into a future Date. */
export function ttlToDate(ttl: string, from = new Date()): Date {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    // Fallback: treat as seconds.
    const seconds = Number(ttl) || 0;
    return new Date(from.getTime() + seconds * 1000);
  }
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(from.getTime() + value * (multipliers[unit] ?? 1000));
}

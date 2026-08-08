/**
 * JWT (JSON Web Token) helpers.
 *
 * We use two token types:
 *   - ACCESS token: short-lived (15 min), sent with every API request
 *   - REFRESH token: long-lived (7 days), used only to get new access tokens
 *
 * Why two? If an access token leaks (e.g. logged somewhere), it expires in
 * 15 minutes. The attacker can't do much. Refresh tokens are stored more
 * carefully (httpOnly cookie in production) and can be revoked.
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';

export interface AccessTokenPayload {
  sub: string;       // user id
  email: string;
  roles: string[];   // role slugs, for quick authz checks
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;       // unique id, lets us revoke individual tokens
  type: 'refresh';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const options: SignOptions = {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: config.APP_NAME,
    audience: 'api',
  };
  return jwt.sign({ ...payload, type: 'access' }, config.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  const options: SignOptions = {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: config.APP_NAME,
    audience: 'api',
  };
  return jwt.sign({ ...payload, type: 'refresh' }, config.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: config.APP_NAME,
    audience: 'api',
  }) as JwtPayload & AccessTokenPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
    issuer: config.APP_NAME,
    audience: 'api',
  }) as JwtPayload & RefreshTokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

/**
 * Hash a token for safe storage.
 * We never store raw tokens in the DB — only their SHA-256 hash.
 * This way, if the DB is leaked, attackers can't use the tokens.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse expiry string like "15m", "7d", "1h" to milliseconds.
 * Used when computing DB-side expiry timestamps.
 */
export function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export function parseExpiryToDate(expiry: string): Date {
  return new Date(Date.now() + parseExpiryToMs(expiry));
}

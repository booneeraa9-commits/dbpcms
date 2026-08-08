/**
 * Password hashing and verification.
 *
 * Why bcrypt?
 *   - Built-in salting (every hash is unique, even for same password)
 *   - Configurable cost factor — slows down brute force attempts
 *   - Industry standard, battle-tested
 *
 * Cost factor 12 = ~250ms per hash on modern hardware.
 * That's slow enough to make brute force impractical, fast enough to not
 * annoy legitimate users. NIST recommends 10+ as of 2024.
 */

import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length < 1) {
    throw new Error('Password cannot be empty');
  }
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  if (!plainPassword || !hash) return false;
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch {
    return false;
  }
}

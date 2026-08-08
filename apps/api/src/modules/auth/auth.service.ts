import argon2 from "argon2";
import {
  changePasswordSchema,
  loginSchema,
  type LoginInput,
} from "@dbpcms/shared";
import { authConfig } from "../../config/auth.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../core/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  ttlToDate,
} from "./token.util.js";

/** Everything the caller needs to know about the logged-in user. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Flattens the nested roles→permissions include into simple string arrays. */
function extractRolesAndPermissions(user: {
  roles: {
    role: { name: string; permissions: { permission: { key: string } }[] };
  }[];
}): { roles: string[]; permissions: string[] } {
  const roles = user.roles.map((ur) => ur.role.name);
  const permissionSet = new Set<string>();
  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) permissionSet.add(rp.permission.key);
  }
  return { roles, permissions: [...permissionSet] };
}

export const authService = {
  /**
   * Verify credentials and, on success, issue an access token + refresh token.
   * Implements account lockout after repeated failures.
   */
  async login(rawInput: LoginInput, meta: RequestMeta) {
    const { email, password } = loginSchema.parse(rawInput);

    const user = await authRepository.findUserByEmail(email);

    // Generic error message on purpose — never reveal whether the email exists.
    const invalid = new UnauthorizedError("Invalid email or password.");

    if (!user || !user.isActive) {
      throw invalid;
    }

    // Locked out?
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await authRepository.writeAuditLog({
        userId: user.id,
        action: "auth.login.locked",
        ...meta,
      });
      throw new ForbiddenError(
        "Account is temporarily locked due to failed login attempts. Try again later.",
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      const nextCount = user.failedLoginCount + 1;
      const shouldLock = nextCount >= authConfig.maxFailedLogins;
      await authRepository.recordFailedLogin(
        user.id,
        shouldLock ? 0 : nextCount,
        shouldLock
          ? new Date(Date.now() + authConfig.lockoutMinutes * 60 * 1000)
          : null,
      );
      await authRepository.writeAuditLog({
        userId: user.id,
        action: "auth.login.failed",
        ...meta,
      });
      throw invalid;
    }

    // Success.
    await authRepository.recordSuccessfulLogin(user.id);
    const { roles, permissions } = extractRolesAndPermissions(user);

    const accessToken = signAccessToken({
      sub: user.id,
      tokenVersion: user.tokenVersion,
      permissions,
    });

    const refreshTokenRaw = generateRefreshToken();
    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshTokenRaw),
      expiresAt: ttlToDate(authConfig.refreshTokenTtl),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    await authRepository.writeAuditLog({
      userId: user.id,
      action: "auth.login.success",
      ...meta,
    });

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
      roles,
      permissions,
    };

    return { user: authUser, accessToken, refreshTokenRaw };
  },

  /** Exchange a valid refresh token for a fresh access token. */
  async refresh(refreshTokenRaw: string) {
    if (!refreshTokenRaw) throw new UnauthorizedError("Missing refresh token.");
    const tokenHash = hashRefreshToken(refreshTokenRaw);
    const stored = await authRepository.findValidRefreshToken(tokenHash);
    if (!stored) throw new UnauthorizedError("Invalid or expired session.");

    const user = await authRepository.findUserById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid or expired session.");
    }

    const { permissions } = extractRolesAndPermissions(user);
    const accessToken = signAccessToken({
      sub: user.id,
      tokenVersion: user.tokenVersion,
      permissions,
    });
    return { accessToken };
  },

  /** Revoke a refresh token (logout). */
  async logout(refreshTokenRaw: string | undefined, meta: RequestMeta) {
    if (refreshTokenRaw) {
      const tokenHash = hashRefreshToken(refreshTokenRaw);
      await authRepository.revokeRefreshToken(tokenHash);
    }
    await authRepository.writeAuditLog({ action: "auth.logout", ...meta });
  },

  /** Return the current user's profile, roles, and permissions. */
  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    const { roles, permissions } = extractRolesAndPermissions(user);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
      roles,
      permissions,
    };
  },

  /** Change the current user's own password. */
  async changePassword(
    userId: string,
    rawInput: unknown,
    meta: RequestMeta,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordSchema.parse(rawInput);

    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedError("Current password is incorrect.");

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await authRepository.updatePassword(userId, newHash);
    await authRepository.writeAuditLog({
      userId,
      action: "auth.password.changed",
      ...meta,
    });
  },
};

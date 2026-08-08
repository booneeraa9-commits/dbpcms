# 09 — Security Plan (OWASP-aligned)

Security is not a feature we add at the end; it's woven into every layer. This
plan maps directly to the **OWASP Top 10** (the industry's standard list of the
most dangerous web vulnerabilities).

## 1. Authentication & session security
- Passwords hashed with **argon2id** (memory-hard; strong default).
- Short-lived **access tokens** + revocable **refresh tokens** in **HttpOnly,
  Secure, SameSite** cookies.
- **Account lockout** after repeated failures; **rate limiting** on auth routes.
- Password policy enforced **server-side**; reset via single-use expiring tokens.
- Sessions listable and revocable; password change revokes all sessions.
- **MFA seam** ready for later.

## 2. Authorization (broken-access-control is OWASP #1)
- Every endpoint declares a required **permission**; middleware enforces it.
- Services enforce **row/scope-level** checks (dept head → own department only).
- Users can never escalate their own roles; role changes are admin-only + audited.
- **No trusting the frontend** for anything — the UI hiding a button is
  convenience, not security; the backend re-checks everything.

## 3. Input validation & injection prevention
- **Zod validation** on every request body, query, and param.
- **SQL injection:** prevented by Prisma's parameterized queries (we never build
  SQL by string concatenation).
- **XSS:** React escapes output by default; we avoid `dangerouslySetInnerHTML`;
  we sanitize any rich text; strict Content-Security-Policy header.
- **Mass assignment:** we whitelist allowed fields per endpoint (Zod), so a user
  can't sneak `role: admin` into an update.

## 4. File upload security
- Validate **type** (allow-list: pdf, docx, jpg, png), **size** (per-type caps),
  and verify the real content type (magic bytes), not just the extension.
- Store with a **generated storage key**, never the user's filename, outside the
  web root; serve via authorized, permission-checked download endpoints only.
- Never execute uploads; strip/deny anything executable.

## 5. Secure headers & transport
- **Helmet** sets security headers (CSP, HSTS, X-Content-Type-Options, etc.).
- **HTTPS everywhere** in production (TLS terminated at the VPS / reverse proxy).
- **CORS** locked to known origins only.
- **CSRF:** because refresh token is a cookie, we use SameSite + a CSRF token on
  state-changing cookie-based requests; the access-token API path is bearer-based.

## 6. Rate limiting & abuse protection (concrete defaults)
- Auth endpoints: 10 requests / 15 min / IP.
- Global API: 300 requests / 15 min / user (tunable in `system_settings`).
- Login lockout: 5 failures → 15-min lock (tunable).

## 7. Sensitive data protection
- National ID and TIN flagged **sensitive**: access is permission-gated and
  **logged**; encryption-at-rest seam included (enable via config).
- Secrets (DB password, JWT keys) only in `.env`, never in Git; `.env.example`
  documents required keys with fake values.
- Logs **never** contain passwords, tokens, or full sensitive fields (redacted).

## 8. Auditing & monitoring (detection, not just prevention)
- **Audit log** for every critical action: who, what, when, before/after, IP.
  Append-only.
- **Structured security logs** for logins, lockouts, permission changes, failed
  authorizations.
- `/health` endpoint for uptime monitoring.

## 9. Error handling (information-disclosure prevention)
- One **central error handler**; **custom exception classes**
  (`ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`…).
- Users get safe, generic messages + a `requestId`; full stack/detail goes to
  logs only. Internal errors are **never** exposed.

## 10. Dependency & supply-chain hygiene
- Pin dependency versions; run `npm audit` in CI; keep Node on the current LTS
  (24). Review new dependencies before adding them.

## 11. Backup & recovery (reliability requirement)
- **Automated nightly PostgreSQL backups** (dump + rotate), plus file-storage
  backups. Documented, **tested restore** runbook (a backup you've never restored
  is not a backup). Off-machine copy once on the VPS.

## 12. Data protection & privacy posture
- Principle of least privilege everywhere. Soft deletes preserve records for
  audit; hard purge is admin-only and audited. Retention rules configurable.

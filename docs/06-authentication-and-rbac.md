# 06 — Authentication & Access Control

Two different questions the system must answer on every request:
- **Authentication** = "Who are you?" (login)
- **Authorization (RBAC)** = "Are you allowed to do this?" (permissions)

---

## Part 1 — Authentication (login)

### How login works, step by step

1. User submits email + password over **HTTPS**.
2. Backend finds the user, then compares the password against the stored
   **hash** using **argon2** (a modern, memory-hard hashing algorithm —
   stronger default than bcrypt). We never store the real password.
3. On success the backend issues **two tokens**:
   - **Access token (JWT):** short life (~15 minutes). Sent on every request to
     prove identity. Contains the user id, role, and a token version — but **no
     secrets**.
   - **Refresh token:** longer life (~7 days). Stored in a **secure, HttpOnly
     cookie** (JavaScript can't read it → protects against XSS token theft) and
     also recorded in the database so it can be revoked.
4. When the access token expires, the frontend silently calls
   `POST /auth/refresh`; if the refresh token is still valid and not revoked, a
   new access token is issued. The user never notices.
5. **Logout** deletes/blacklists the refresh token server-side.

### Why two tokens?

Short-lived access tokens limit damage if one is stolen. Refresh tokens let
users stay logged in without re-typing passwords, while remaining **revocable**
(logout, password change, or admin action instantly kills all sessions by
bumping a "token version").

### Security controls built in from day one

- **Account lockout:** after N failed logins (default **5** within 15 min) the
  account is temporarily locked (default **15 min**), defeating password
  guessing. Every failure is logged as a security event.
- **Password policy:** minimum length 12, checked against a common-password list,
  strength meter on the frontend (but the backend enforces the real rules —
  *never trust the frontend*).
- **Password reset:** user requests reset → backend emails a **single-use,
  expiring token** (not the password) → user sets a new password → all existing
  sessions are revoked.
- **Session management:** every active refresh token is a "session" the user (and
  admins) can view and revoke.
- **MFA-ready:** the login service has a deliberate "second-factor" seam. V1
  skips it; enabling later is additive, not a rewrite.

---

## Part 2 — Roles & Permissions (RBAC)

### The model

- A **Permission** is one fine-grained ability, named `resource:action`, e.g.
  `employee:create`, `grade:approve`, `report:view`.
- A **Role** is a named bundle of permissions, e.g. "Instructor".
- A **User** has one or more roles. The user's effective permissions = the union
  of all their roles' permissions.

We check **permissions**, not role names, in the code. Why? Because roles change
("Dean can now also do X"), but if code only ever asks "does this user have
`grade:approve`?", we adjust by editing the role's permission list in the
database — **no code change**. This is far more flexible and is the professional
standard.

### The roles (from your spec) and their core permissions

| Role | Key permissions (abbreviated) |
|------|-------------------------------|
| **System Administrator** | `user:*`, `role:*`, `department:*`, `program:*`, `academic-year:*`, `system-setting:*`, `audit-log:read`, `backup:*` |
| **Human Resource Officer** | `employee:create/read/update`, `document:upload/read`, `employee:print`, `hr-report:view` |
| **Dean** | `report:view`, `analytics:view`, `grading-policy:approve`, `employee:read` (stats) |
| **Registrar** | `student:*`, `semester:*`, `grade:publish`, `transcript:generate`, `grade:unlock`, `graduation:verify` |
| **Department Head** | `instructor:manage`, `instructor:assign`, `grade:approve`, `department-analytics:view`, `grading-rule:configure` (own dept) |
| **Instructor** | `course:read` (assigned), `grade:enter`, `grade:edit-before-approval`, `grade:submit`, `class-stat:view` |
| **Employee** | `own-profile:read`, `own-document:download`, `own-profile:update-limited` |
| **Student** *(future)* | `own-grade:read`, `own-transcript:read`, `gpa:read` |

`*` above expands to explicit permissions in the seed (we never grant literal
wildcards in code).

### Two layers of authorization — both required

1. **Coarse (middleware):** "You need `grade:approve` to touch this endpoint at
   all." Rejects instantly with 403 if missing.
2. **Fine (service, "scoping"):** "A Department Head can approve grades **only
   for their own department**." A Dept Head having `grade:approve` is not enough;
   the service checks the grade belongs to their department. This "row-level"
   check lives in the service layer and is essential — coarse checks alone would
   let one dept head approve another dept's grades.

### How it's enforced in the request pipeline

```
request → [authenticate] → [load user + permissions] → [require permission X]
        → controller → service (does fine-grained scope check) → repository
```

If any checkpoint fails, the central error handler returns a safe 401/403 and
logs a security event. Every permission change is itself audited.

### Seeding

The seed script creates: all permissions, all roles with their permission sets,
and one initial **System Administrator** (credentials from `.env`, forced to
change on first login). This makes a fresh install immediately usable and secure.

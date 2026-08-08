# 02 — Requirements Analysis & Gap Report

This document does three things:
1. Confirms I understood your specification.
2. Flags **missing requirements** a real college will need (you explicitly asked
   me to recommend these before implementation).
3. Recommends what to include in **Version 1** versus later.

---

## Part A — Confirmed scope (from your specification)

**Version 1 delivers two working modules plus the foundation:**

1. **Foundation / platform** (must be built first, before any module):
   - Authentication (login, JWT access + refresh tokens, password reset).
   - Role-Based Access Control + fine-grained permissions.
   - User & role management.
   - Departments, Programs, Academic Years, Semesters (the "academic structure").
   - Audit logging, structured logging, centralized error handling.
   - Standard API envelope (versioning, pagination, filtering, sorting, search).
   - File storage abstraction (local now, cloud later).
   - Notifications framework.

2. **Employee Management module** — full employee records, education,
   qualifications, employment history, documents, search, HR reports.

3. **Student Grading module** — students, courses, sections, instructor
   assignment, configurable grade components, configurable grading scales,
   grade entry → submit → approve → publish workflow, GPA calculation, grade
   locking, transcripts, academic reports.

I will **not** simplify or drop any of these.

---

## Part B — Missing / underspecified requirements (my professional recommendations)

Your spec is strong. These are the gaps a lead engineer would raise **before**
building, so we design for them now instead of retrofitting later.

### B1. Data model gaps (HIGH priority — cheap now, expensive later)

- **Soft deletes, not hard deletes.** For a government-facing college, records
  like employees, students, and grades must almost never be truly deleted.
  Recommendation: every important table gets a `deleted_at` timestamp; "delete"
  hides the record but keeps history. Only Admin can hard-purge, and it's audited.
- **Optimistic concurrency (`version` column).** Two instructors (or an
  instructor and a dept head) could open the same grade sheet at once and
  overwrite each other. Recommendation: a `version` number on editable records
  that rejects a stale save with a clear message.
- **Explicit `created_by` / `updated_by` on records**, in addition to audit
  logs, so "who owns this record" is answerable directly.
- **Money handling.** Salary/salary grade must never use floating-point numbers
  (they cause rounding errors). Recommendation: store money as integer minor
  units or `DECIMAL`, and record the **currency** (ETB). Even though V1 is not a
  finance module, salary grade appears in employee records.

### B2. Grading correctness gaps (HIGH — this is the heart of the system)

- **Immutable grade snapshots on publish.** When grades are published, the exact
  grading scale, weights, and GPA rules used **must be frozen with the record**.
  If a department later changes its grading scale, already-published transcripts
  must not silently change. This is a legal/academic-integrity requirement.
- **Re-take / re-sit / grade-change requests.** Real colleges have students who
  retake courses and instructors who request corrections after locking. We need
  a defined, audited "grade change request" flow, at least in the data model.
- **Rounding & tie-break rules must be configurable and recorded** (e.g. is
  84.5% an A− or B+?). Undefined rounding is a top source of grade disputes.
- **Incomplete / Withdrawn / Audit statuses** for enrollments, not just
  Pass/Fail.

### B3. Security & compliance gaps (HIGH)

- **Password reset via secure token** (your spec lists it under auth but not in
  detail) — must use single-use, expiring tokens, never email the password.
- **Personal data protection.** Employees/students have National IDs and
  personal data. Recommendation: encrypt the most sensitive fields at rest
  (National ID, TIN), restrict who can view them, and log every access to them.
- **Backup & restore is listed as a feature but needs an owner and a tested
  procedure**, not just a button. I'll design a real backup runbook.
- **Rate limiting + account lockout thresholds** need concrete numbers (defined
  in the security plan).

### B4. Operational gaps (MEDIUM — needed for a real deployment)

- **Configuration & secrets management** via `.env` files, with a documented
  `.env.example`. Secrets never in Git.
- **Health-check endpoint** (`/health`) so the VPS / Ethio Telecom monitoring
  can tell if the app is alive.
- **Database connection pooling limits** tuned for the VPS size.
- **Time zone policy.** Store all timestamps in **UTC** in the database; display
  in **Africa/Addis_Ababa**. Mixing these is a classic bug.
- **Localization readiness.** The UI should be built so Amharic (and other
  languages) can be added later without rewriting screens, even if V1 is
  English-only. Also consider the **Ethiopian calendar** for display of academic
  dates — flag this as a decision (see doc 13).

### B5. Product/UX gaps (MEDIUM)

- **Bulk operations** beyond grade upload: bulk student import, bulk employee
  import (colleges start with spreadsheets).
- **"Draft autosave"** for grade entry so an instructor doesn't lose work.
- **Printable/official document watermarking & verification code** on
  transcripts (anti-forgery). At minimum a unique verification code + a public
  "verify this transcript" lookup later.
- **Accessibility (WCAG AA)** as a stated requirement, not an afterthought.

### B6. Things to explicitly DEFER (don't build in V1, but don't block later)

These are designed-for but not implemented now: MFA, mobile app, email
verification (optional), the student self-service portal, and all the future
modules (Finance, Library, Hostel, etc.). The architecture reserves room for
them (see doc 03).

---

## Part C — My recommendation on what goes in Version 1

**Include now (adds little cost, huge future value):**
soft deletes, version columns, created_by/updated_by, UTC timestamps, immutable
grade snapshots on publish, secure password-reset tokens, `.env` config,
`/health` endpoint, audit logging, and the file-storage abstraction.

**Design-for-but-defer:** MFA, encryption-at-rest for sensitive fields
(we'll build the seam; enabling it is a config step), transcript verification
codes, Amharic/Ethiopian-calendar localization, and all future modules.

**Your decision needed** on a few of these — see `13-decisions-and-tradeoffs.md`.

# DBPCMS — Approved Decisions Log

This file records final decisions so they are never lost or re-litigated.
Each entry: the decision, who decided, date, and the consequence for the build.

---

## Phase 0 — Design approved
- **Status:** Design package (docs 00–13) **APPROVED** by the project owner.
- **Date:** 2026-08-07
- **Consequence:** Implementation may begin at Phase 1 of the roadmap.

## B1 — GPA scale
- **Decision:** Default **4.0 scale**.
- **Consequence:** Seed the default GPA rule as 4.0. Scale remains configurable
  in the UI later. Pass mark to be confirmed before Phase 6 (default assumption:
  50% / grade point ≥ 2.0 = pass, adjustable — will confirm at Phase 6).

## B2 — Language & calendar
- **Decision:** **English only** and **Gregorian calendar** for V1.
  Add **Afaan Oromo** localization later (NOT Amharic).
- **Consequence:** UI built localization-ready (i18n scaffolding, no hardcoded
  user-facing strings). Only an English translation file shipped in V1. Oromo
  translation file added in a later phase with zero screen rewrites.

## B3 — Password reset
- **Decision:** **Admin resets passwords manually** in V1. No outgoing email.
- **Consequence:** No SMTP/email dependency in V1. Build the "admin reset
  password" action (generates a temporary password, forces change on next login,
  audited). Email seam designed but not wired.

## B4 — File storage on VPS
- **Decision:** Accept recommendation — configurable storage root on a
  backed-up, persistent disk path outside the app folder.
- **Consequence:** `STORAGE_ROOT` env var; LocalStorageProvider reads it; cloud
  provider swappable later with no business-logic change.

## B5 — First administrator
- **Decision:** Seed first System Administrator email: **booneeraa9@gmail.com**
  (may be changed later).
- **Consequence:** Seed creates this admin with a temporary password from `.env`,
  `must_change_password = true`. Never commit the real password.

## B6 — Encryption at rest for National ID / TIN
- **Decision:** **No encryption** in V1.
- **Consequence:** National ID / TIN stored in plain columns BUT still
  permission-gated and access-logged. Encryption seam left in the design so it
  can be enabled later without a schema rewrite.

---

## Standing technical decisions (from doc 13, accepted)
- Runtime: **Node.js 24 LTS**.
- Architecture: **modular monolith**, clean layers.
- Authz: **permission-based** checks in code (not role-name checks).
- Data: **soft deletes**, **audit logging**, **version** (optimistic locking),
  `created_by`/`updated_by`, **UTC** timestamps everywhere.
- Grading: **immutable snapshots** on publish; versioned scales/rules.
- Passwords: **argon2id**.
- `users` and `employees` are separate tables with a nullable link.

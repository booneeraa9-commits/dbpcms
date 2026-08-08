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

---

## Student Grading Module decisions (recorded before Phase 5)

- **Student ID format:** `DBPC-STU-YYYY-00001` (prefix + year + sequence, never reused). Consistent with employee IDs.
- **Grading scope (V1 start):** ONE college-wide configurable grading scale + GPA rule. Per-department rules are DESIGNED-FOR and can be enabled later without a rewrite (scale/rule records already carry a department scope + version).
- **GPA default:** 4.0 scale, pass mark 50% (grade point >= 2.0 = pass). ALL editable in the UI.
- **CRITICAL REQUIREMENT (user emphasized):** every value/rule I asked about MUST be settable in the UI, not hardcoded. This includes:
  - Student ID prefix/format pieces (in System Settings)
  - Grading scale bands (min%, max%, letter, grade point, is_pass) — editable grading-scale editor
  - GPA rule (scale type, rounding, pass mark) — editable
  - Grade components + weights — editable per set
  These live under an "Academic / Grading Configuration" area, editable by authorized users. No code change needed to adjust them.

- **Phase 5 delivery:** all together (Students + Courses + Sections + Enrollment + instructor assignment), PLUS the configuration screens for the settable values above where they belong.

---

## Phase 6 grading-engine defaults (seeded, all editable in UI)
- Default grading scale (4.0): A+ 90-100=4.0, A 85-89=4.0, A- 80-84=3.75, B+ 75-79=3.5,
  B 70-74=3.0, B- 65-69=2.75, C+ 60-64=2.5, C 50-59=2.0, D 40-49=1.0, F 0-39=0. Pass mark = 50 (>=2.0).
- Default components: Quiz 10%, Assignment 15%, Mid Exam 25%, Final Exam 50% (sum 100).
- Rounding: round half up (84.5 -> 85) before band match. Configurable.
- All of the above editable via UI config screens (grading scale editor, components editor, GPA rule).

---

## Phase 7 grading workflow decisions
- Approval chain (full): Instructor enters -> Submits -> Department Head approves -> Registrar publishes -> LOCKED.
- Approvers (Dept Head, Registrar) can RETURN a grade sheet to the instructor for correction with a reason.
- Who can ENTER marks: the assigned instructor(s) AND the Department Head of that section's department.
- On publish: freeze an immutable snapshot (scale bands + component weights + rounding + pass mark) with each result.
- Delivery split: 7A = grade-entry grid (enter/save draft + live computed result). 7B = submit/approve/return/publish/lock + change requests.

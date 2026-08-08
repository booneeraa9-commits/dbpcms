# 11 — Implementation Roadmap

We build in **phases**. Each phase produces something that *works and is tested*
before we move on. You review at the end of each step. Nothing is built "big
bang".

Legend: 🧱 foundation · 🔐 security · 🗄️ data · 🎨 UI · ✅ tests

---

## PHASE 0 — Design & approval  ← YOU ARE HERE
- [x] Requirements analysis + gap report
- [x] System architecture
- [x] Folder structure
- [x] Database design + ERD
- [x] Auth & RBAC design
- [x] API design
- [x] UI/UX design
- [x] Security plan
- [x] Testing strategy
- [x] This roadmap
- [ ] **Your approval to proceed**

## PHASE 1 — Project skeleton & tooling (no features yet) 🧱
Goal: everything runs locally on your Windows machine and says "hello".
1. Install tools (Node 24, VS Code, Git, Docker Desktop) — guided in doc 12.
2. Create the monorepo, `.gitignore`, README, first Git commit.
3. `docker-compose.yml` to run PostgreSQL locally.
4. Backend skeleton: Express + TypeScript, `/health`, config loader (validates
   `.env`), central error handler, structured logger, standard response helpers.
5. Frontend skeleton: Vite + React + TS + Tailwind + shadcn/ui + Router, app
   shell (sidebar/topbar), a blank dashboard.
6. Shared package for Zod schemas/types.
7. Prisma connected; first empty migration; CI pipeline green.
**Review checkpoint.**

## PHASE 2 — Authentication & RBAC core 🔐🗄️✅
Goal: real users can log in; permissions are enforced.
1. DB: users, roles, permissions, joins, refresh tokens, reset tokens.
2. Seed: all permissions, all roles, first admin.
3. Backend: login, refresh, logout, me, change/forgot/reset password; argon2;
   lockout; auth + permission middleware; audit logging of auth events.
4. Frontend: login page, auth state, protected routes, permission-aware sidebar,
   "force change password on first login".
5. Tests: auth flow, lockout, permission enforcement (403), validation.
**Review checkpoint.**

## PHASE 3 — Admin foundation: users, roles, academic structure 🗄️🎨✅
1. User & role management screens (admin).
2. Departments, Programs, Academic Years, Semesters, Courses, Sections.
3. Reusable **DataTable** (pagination/filter/sort/search) + form patterns.
4. Audit-log viewer (read-only).
**Review checkpoint.**

## PHASE 4 — Employee Management module (full) 🗄️🎨✅
1. DB: employees + education + qualifications + history + emergency contacts.
2. File storage abstraction + document upload/download (local provider).
3. Backend CRUD + search/filter + bulk import + sensitive-field handling.
4. Frontend: employee list, multi-tab profile, create/edit wizard, document
   upload, print-to-PDF profile.
5. HR reports (list, by department, qualification summary, contract expiry,
   retirement, directory) with PDF/Excel/CSV export via reusable report service.
6. Tests across the board.
**Review checkpoint.**

## PHASE 5 — Students, courses, enrollment, instructor assignment 🗄️🎨✅
1. DB + CRUD for students & enrollments; bulk student import.
2. Instructor→course→section→semester assignment.
3. Screens + tests.
**Review checkpoint.**

## PHASE 6 — Grading engine (configurable) 🗄️✅ — the crown jewel
1. DB: grade components, grading scales, GPA rules (all configurable/versioned),
   grade entries, results, submissions, change requests, GPA summaries.
2. Configuration screens (admin/dept head): define components + weights, edit
   grading scale, choose GPA rule — **no code changes**.
3. Grade calculation service with exhaustive **unit tests** (rounding, GPA,
   pass/fail, credits, snapshots).
**Review checkpoint (heavy).**

## PHASE 7 — Grade entry & approval workflow 🎨🔐✅
1. Grade-entry grid with autosave draft + Excel import (preview & confirm).
2. Workflow: submit → dept approve → registrar publish → **lock**; change
   requests; unlock (registrar/admin only). Scope checks + audit at each step.
3. Notifications (grade due/approved/published).
**Review checkpoint.**

## PHASE 8 — Reports, transcripts, dashboards, global search 🎨✅
1. Student grade sheet, transcript (with verification code), semester result,
   GPA report.
2. Department & institution analytics; role dashboards filled with real data.
3. Global search across entities.
**Review checkpoint.**

## PHASE 9 — Hardening & production prep for the Ethio Telecom VPS 🔐
1. Security pass (headers, rate limits, CSP), load-sanity check, query/index review.
2. Backup + tested restore runbook; log rotation; `/health` wired to monitoring.
3. Deployment guide for the VPS (reverse proxy, HTTPS, environment config).
4. Full documentation pass; user manuals per role.
**Release candidate.**

## PHASE 10+ — Future modules (designed-for, not now)
MFA, student self-service portal, mobile app, then Admissions, Finance, Library,
Attendance, Payroll, Hostel, Inventory, Procurement, LMS, Alumni, national
integrations — each added as a new module folder with zero rewrites of the above.

---

### How each feature is delivered (your 10-step rule, every time)
1. Why it exists → 2. Architecture → 3. DB changes → 4. API endpoints →
5. Backend code → 6. Frontend code → 7. Validation → 8. Security →
9. Tests → 10. Review before moving on.

### Git workflow (recommended)
- `main` = always deployable. Work on `feature/<name>` branches → open a Pull
  Request → CI must pass → review → merge.
- **Conventional Commits:** `feat(employees): add profile print`,
  `fix(auth): correct lockout reset`, `docs: add ERD`. Readable history forever.

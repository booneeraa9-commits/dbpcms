# 04 — Folder Structure (Where Everything Lives)

Two golden rules:
1. **Group by feature, not by file type.** Everything about "employees" lives
   together, so you never hunt across ten folders to change one feature.
2. **Shared plumbing lives in `core`/`common`**, written once, reused everywhere.

The project is a **monorepo** (one Git repository containing both apps plus
shared code). This keeps the frontend, backend, and shared validation rules in
sync.

```
dbpcms/
├─ docs/                         # the documents you are reading now
├─ README.md                     # how to run everything (added in Phase 1)
├─ .gitignore                    # tells Git to never commit secrets/junk
├─ docker-compose.yml            # runs PostgreSQL locally (added in Phase 1)
│
├─ packages/
│  └─ shared/                    # code shared by frontend AND backend
│     └─ src/
│        ├─ validation/          # Zod schemas (e.g. employee shape) — one source of truth
│        ├─ constants/           # roles, permissions, enums shared both sides
│        └─ types/               # shared TypeScript types
│
├─ apps/
│  ├─ api/                       # THE BACKEND
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma        # the database blueprint
│  │  │  ├─ migrations/          # versioned DB change history
│  │  │  └─ seed.ts              # starter data (admin user, grading scale…)
│  │  ├─ src/
│  │  │  ├─ main.ts              # starts the server
│  │  │  ├─ app.ts               # wires middleware + routes together
│  │  │  │
│  │  │  ├─ config/              # reads & validates .env on startup
│  │  │  ├─ core/                # cross-cutting plumbing (built once)
│  │  │  │  ├─ errors/           # custom exception classes + central handler
│  │  │  │  ├─ logging/          # structured logger
│  │  │  │  ├─ audit/            # audit-log writer
│  │  │  │  ├─ http/             # response envelope, pagination helpers
│  │  │  │  ├─ storage/          # StorageProvider interface + Local impl
│  │  │  │  └─ db/               # Prisma client singleton
│  │  │  │
│  │  │  ├─ middleware/          # auth, rbac, rate-limit, error, request-log
│  │  │  │
│  │  │  ├─ modules/             # ← FEATURES LIVE HERE, one folder each
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ auth.routes.ts
│  │  │  │  │  ├─ auth.controller.ts
│  │  │  │  │  ├─ auth.service.ts
│  │  │  │  │  ├─ auth.repository.ts
│  │  │  │  │  ├─ auth.validation.ts
│  │  │  │  │  └─ auth.test.ts
│  │  │  │  ├─ users/
│  │  │  │  ├─ roles/            # roles & permissions (RBAC)
│  │  │  │  ├─ departments/
│  │  │  │  ├─ programs/
│  │  │  │  ├─ academic/         # academic years, semesters
│  │  │  │  ├─ employees/        # ← Employee Management module
│  │  │  │  ├─ students/
│  │  │  │  ├─ courses/
│  │  │  │  ├─ grading/          # ← Student Grading module
│  │  │  │  ├─ documents/        # file uploads
│  │  │  │  ├─ reports/          # reusable PDF/Excel/CSV report services
│  │  │  │  ├─ notifications/
│  │  │  │  └─ audit-logs/       # read-only viewing of the audit trail
│  │  │  │
│  │  │  └─ utils/               # tiny generic helpers (dates, ids, etc.)
│  │  └─ tests/                  # integration & API tests
│  │
│  └─ web/                       # THE FRONTEND
│     └─ src/
│        ├─ main.tsx             # boots the React app
│        ├─ app/                 # router, providers, layout shell
│        ├─ components/ui/       # shadcn/ui building blocks (Button, Table…)
│        ├─ components/          # shared app components (DataTable, PageHeader…)
│        ├─ lib/                 # api client, query setup, helpers
│        ├─ hooks/               # reusable React hooks
│        ├─ features/            # ← SCREENS LIVE HERE, one folder per feature
│        │  ├─ auth/
│        │  ├─ dashboard/
│        │  ├─ employees/
│        │  │  ├─ components/    # tables, forms specific to employees
│        │  │  ├─ hooks/         # data hooks (useEmployees, useEmployee)
│        │  │  ├─ api/           # calls to the employee endpoints
│        │  │  └─ pages/         # list page, detail page, create/edit page
│        │  ├─ grading/
│        │  ├─ students/
│        │  ├─ departments/
│        │  ├─ users/
│        │  └─ settings/
│        └─ styles/
```

### Why a feature folder has 5 files (controller/service/repository/validation/test)

Look at `modules/employees/`. Each file has exactly one responsibility:
- `*.routes.ts` — declares the URLs and which middleware guards them.
- `*.controller.ts` — receptionist: read request → call service → send reply.
- `*.service.ts` — the business rules and transactions.
- `*.repository.ts` — the only place that runs database queries.
- `*.validation.ts` — the Zod rules for this feature's inputs.
- `*.test.ts` — proves the feature works.

New developer joins in 2028, needs to fix employee search? They open **one
folder** and everything is there. That is the whole point.

### Where secrets go (and don't)

`.env` files hold secrets (DB password, JWT signing keys). They are listed in
`.gitignore` so they are **never** committed to Git. We commit a `.env.example`
with fake values so others know what settings are required.

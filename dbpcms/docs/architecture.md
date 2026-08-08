# DBPCMS Architecture

## High-Level Overview

DBPCMS is a **monorepo** with three main units:

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                     │
│  React + Vite + TypeScript + Tailwind                    │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS (JWT in Authorization header)
                     ▼
┌──────────────────────────────────────────────────────────┐
│  API (Node.js + Express + TypeScript)                    │
│  Clean architecture: modules per feature                 │
└────────────────────┬─────────────────────────────────────┘
                     │ Prisma ORM
                     ▼
┌──────────────────────────────────────────────────────────┐
│  PostgreSQL 16                                           │
└──────────────────────────────────────────────────────────┘
```

## Architectural Patterns

### Backend: Clean Architecture (per module)

Each backend module follows this structure:

```
modules/students/
├── students.controller.ts   ← HTTP layer (req/res)
├── students.service.ts      ← Business logic
├── students.repository.ts   ← Database access
├── students.routes.ts       ← Route definitions
├── students.schema.ts       ← Zod validation
├── students.types.ts        ← TypeScript types
└── students.errors.ts       ← Custom errors
```

**Dependency direction:** Controller → Service → Repository → Database.
Nothing skips a layer. This makes testing and swapping parts easy.

### Frontend: Feature-based

```
features/students/
├── StudentsPage.tsx        ← List view
├── StudentDetailPage.tsx   ← Detail view
├── StudentForm.tsx         ← Create/edit
├── useStudents.ts          ← React Query hooks
└── students.api.ts         ← API calls
```

## Design Decisions

| Decision | Rationale |
|---|---|
| Monorepo | Single source of truth for types, simpler onboarding |
| Prisma | Generated types = no DB/schema drift |
| JWT + Refresh tokens | Stateless auth scales horizontally |
| Zod everywhere | Same schema validates on both ends |
| TailwindCSS | Fast iteration, consistent design |
| React Query | Server state is hard — let a library do it |
| Zustand | Tiny client state store (vs Redux ceremony) |

## Security Layers

1. **Helmet** — secure HTTP headers
2. **CORS** — explicit allowlist
3. **Rate limiting** — brute force protection
4. **JWT** — stateless auth
5. **RBAC** — permission-based authorization
6. **Zod** — request validation
7. **bcrypt** — password hashing
8. **Audit logs** — every sensitive action tracked

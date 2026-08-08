# Database Design

## Current Schema (Phase 1)

This schema will grow with every phase. Only the foundation is here.

### Tables

#### `users`
The single source of identity. Every person (admin, teacher, student) has a row.
- Key fields: `email` (unique), `passwordHash`, `status`, security flags
- Soft delete via `deletedAt`

#### `roles`
Named sets of permissions. e.g. `super_admin`, `teacher`, `registrar`.
- `isSystem: true` means the role cannot be deleted

#### `permissions`
Atomic capabilities. e.g. `student:create`, `question:approve`.
- Pattern: `<resource>:<action>`

#### `user_roles`
Many-to-many: a user can have multiple roles.

#### `role_permissions`
Many-to-many: a role can have multiple permissions.

#### `refresh_tokens`
Stored server-side so we can revoke them. We never store raw tokens, only `tokenHash`.

#### `user_sessions`
Every login creates a session row. "Active sessions" view reads from here.

#### `password_resets`
One-time tokens for "forgot password" flow.

#### `activity_logs`
Append-only audit trail. Every important action writes a row.

## ER Diagram (Phase 1)

```
┌──────────┐       ┌─────────────┐       ┌──────────┐
│  users   │◄─────►│  user_roles │◄─────►│  roles   │
└──────────┘       └─────────────┘       └──────────┘
     │                                        │
     │                                        ▼
     │                                  ┌──────────────────┐
     │                                  │ role_permissions │
     │                                  └────────┬─────────┘
     │                                           ▼
     │                                    ┌──────────────┐
     │                                    │ permissions  │
     │                                    └──────────────┘
     │
     ├──► refresh_tokens
     ├──► user_sessions
     ├──► password_resets
     └──► activity_logs
```

## Indexing Strategy

Indexes are added on:
- All foreign keys (automatic in Prisma)
- All `unique` fields (automatic)
- All fields used in `WHERE` filters: `email`, `status`, `deletedAt`, `tokenHash`, `createdAt`

## Migration Strategy

- Every schema change = a Prisma migration
- Migrations are committed to git
- Production runs `prisma migrate deploy` (no interactive prompts)
- Never edit existing migrations — always create a new one

## Coming in Future Phases

| Phase | New tables |
|---|---|
| 2 (Auth wiring) | — uses existing tables |
| 3 (Departments) | departments, programs, occupations, levels, courses, competencies |
| 4 (Students) | students, guardians, student_academic_records |
| 5 (Question bank) | questions, question_options, question_versions, question_reviews |
| 6 (Exams) | exams, exam_questions |
| 7 (Results) | results, result_approvals, result_publications |
| 8 (Reports/notifications) | notifications, generated_reports |

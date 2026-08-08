# 10 — Testing Strategy

"Do not skip testing" — agreed. But we test **smartly**: heavy coverage where
bugs are dangerous (grading, auth, permissions), lighter where they're cheap.

## The testing pyramid we follow

```
        ▲  few, slow, high-value
        │   End-to-end (E2E)         → whole flows in a real browser (later)
        │   Integration / API tests  → real DB, real HTTP, real auth
        │   Unit tests                → one function/service in isolation
        ▼  many, fast, cheap
```

## 1. Unit tests (Vitest)
- Pure business logic in **services**: GPA calculation, weight-sum validation,
  letter-grade mapping, lockout counting, workflow state transitions.
- These are the tests that protect the *correctness of grades* — the highest-risk
  part of the whole system. We test edge cases: rounding boundaries (84.5%),
  0 and 100 scores, retakes, missing components, weights that don't sum to 100.

## 2. Integration / API tests (Vitest + Supertest, real test database)
- Spin up a disposable test PostgreSQL (Docker), run migrations, seed, then hit
  real endpoints over HTTP.
- Verify: auth flow (login/refresh/logout/lockout), **permission enforcement**
  (a forbidden user gets 403), pagination/filter/sort, validation rejects bad
  input with 422, soft delete hides records, version-conflict returns 409.
- Verify the **grade workflow end to end**: enter → submit → approve → publish →
  locked → change-request.

## 3. Validation tests
- Every Zod schema tested with valid and invalid samples, since these schemas are
  the gatekeepers on both frontend and backend.

## 4. Frontend tests (Vitest + React Testing Library)
- Key components render loading/empty/error states.
- Forms show validation errors and disable during submit.
- Permission-gated UI hides forbidden actions.

## 5. What "done" means for each feature
A feature isn't finished until:
- happy path works, and is API-tested;
- permissions are enforced and tested;
- validation rejects bad input and is tested;
- loading/empty/error states exist on the UI;
- critical business logic has unit tests;
- an audit log entry is written for mutations.

## 6. Continuous Integration (CI)
- On every push (GitHub Actions): install → typecheck → lint → run all tests →
  `npm audit`. A red build blocks merging. This keeps `main` always deployable.

## 7. Manual test checklists
- Per module, a short human checklist (in `docs/`) for things automation misses:
  printed PDF looks right, Excel export opens in Excel, screen reader can
  navigate. You'll run these before each release.

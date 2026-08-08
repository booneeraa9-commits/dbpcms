# DBPCMS — Demo Mode (localStorage-backed mock API)

> **What:** A complete localStorage-backed fake backend that lets you explore the full UI without a database
> **Risk level:** ZERO. The real API code is untouched. Switch off with one env var.

---

## What you can do now

With `VITE_MOCK_MODE=true` in `apps/web/.env`, the entire app runs in the browser using localStorage:

1. **Log in** with any of the demo accounts (Admin, Teacher, Registrar, etc.)
2. **See real data** — 3 departments, 5 programs, 6 courses, 12 students, 8 demo users
3. **Create/edit/delete** — students, departments, programs, courses, academic years
4. **Search & filter** — everything works
5. **Persist** — refresh the page and your changes are still there
6. **Reset** — click the "Reset" button in the demo banner

---

## How to switch to real API later

When you have your PostgreSQL database running:

**Option 1:** Change one line in `apps/web/.env`:
```env
VITE_MOCK_MODE=false
```

**Option 2:** Delete that line entirely (default is real mode)

**That's it.** The hooks automatically route to the real axios-based API. No code changes.

---

## How it works (for the curious)

1. `src/lib/api.ts` is the single entry point — exports `apiClient.get/post/patch/delete`
2. All hooks (useUsers, useStudents, etc.) call `apiClient` instead of `api` directly
3. `apiClient` checks `MOCK_MODE` and routes to either:
   - `mockApi.*` (localStorage) when `VITE_MOCK_MODE=true`
   - Real axios HTTP call when `VITE_MOCK_MODE=false`
4. Both return the same `{ data: ApiResponse<T> }` shape
5. Both throw the same `ApiException` on errors

**So the rest of the app is completely unaware of which mode it's in.** 🎯

---

## What works in mock mode

| Feature | Status |
|---|---|
| Login (all 8 demo users) | ✅ |
| Logout | ✅ |
| Forgot password (returns dev token) | ✅ |
| Change password | ✅ |
| List/create/delete departments | ✅ |
| List/create/delete programs | ✅ |
| List/create/delete courses | ✅ |
| List occupations, competencies | ✅ |
| Create/list academic years | ✅ |
| List students with search/filter | ✅ |
| Create student (with auto-generated ID!) | ✅ |
| Delete student (soft) | ✅ |
| Bulk import students | ✅ |
| Register for academic year | ✅ |
| List/create users | ✅ |
| Dark mode | ✅ |
| RBAC (different menu items per role) | ✅ |
| Data persists across refreshes | ✅ |
| Reset to fresh state | ✅ (button in banner) |

## What's not implemented in mock mode (yet)

These need a real DB:
- File uploads (photos, attachments)
- Real password hashing (mock uses plain "mock:password" format)
- JWT signing/verification (mock just stores tokens as-is)
- Email sending
- Real QR code generation (placeholder)
- Activity log persistence

---

## File changes

| File | Change |
|---|---|
| `apps/web/src/lib/mockApi.ts` | **NEW** — Complete mock API (700 lines) |
| `apps/web/src/lib/api.ts` | **REWRITTEN** — Now dispatches to mock or real |
| `apps/web/src/hooks/useAuth.ts` | Updated to use `apiClient` |
| `apps/web/src/hooks/useUsers.ts` | Updated to use `apiClient` |
| `apps/web/src/hooks/useStudents.ts` | Updated to use `apiClient` |
| `apps/web/src/hooks/useAcademics.ts` | Updated to use `apiClient` |
| `apps/web/src/components/feedback/DemoBanner.tsx` | Updated with reset button |
| `apps/web/.env` | **NEW** — `VITE_MOCK_MODE=true` |
| `apps/web/.env.example` | Updated with mock mode docs |

**Total: 1 new file, 6 updated files. ~800 lines of new code.**

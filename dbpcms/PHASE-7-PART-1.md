# DBPCMS — Phase 6 Part 2 + Phase 7 Part 1 (Results)

> **What:** Manual question picker + reorder for exams, plus complete results management backend
> **Date:** August 4, 2026

---

## Phase 6 Part 2: Manual Picker + Reorder ✅

### What was added
- `QuestionPicker` — searchable/filterable modal for selecting questions from the bank
- `useReorderQuestions` hook
- Up/down arrow buttons on each question in the exam detail page
- "Add" button on the exam detail page to open the picker

### New API endpoints
- `POST /api/v1/exams/:id/questions` — add questions manually
- `DELETE /api/v1/exams/:id/questions/:questionId` — remove a question
- `POST /api/v1/exams/:id/reorder` — reorder questions

---

## Phase 7 Part 1: Results Management ✅

### The 4-stage approval workflow
```
DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → PENDING_AUTHORIZATION → PUBLISHED
```

Each stage has a specific role:
- **DRAFT** → Teacher entered marks
- **PENDING_VERIFICATION** → Dept Head reviews
- **PENDING_APPROVAL** → Academic Dean approves
- **PENDING_AUTHORIZATION** → Registrar authorizes
- **PUBLISHED** → Visible to students

### Automatic calculations
- **Percentage** = (obtained / total) × 100
- **Grade** = A/B/C/D/E/F based on percentage
- **Pass/Fail** = 50% threshold
- **Competency** = COMPETENT or NOT_YET_COMPETENT (for TVET)
- **GPA** = letter grade on transcript
- **Transcript summary** = average, total passed, total competent

### Backend (4 new files)
- `modules/results/results.schema.ts` — Zod validators
- `modules/results/results.service.ts` — 400+ lines of business logic
- `modules/results/results.controller.ts` — 11 endpoints
- `modules/results/results.routes.ts` — RBAC-enforced routes

### Frontend (2 new pages, 1 hook)
- `ResultsListPage.tsx` — list with filters, search, summary stats
- `ResultEntryPage.tsx` — quick-entry form with live grade calculation
- `useResults.ts` — React Query hooks (10 mutations + 2 queries)

### New API endpoints
```
GET    /api/v1/results                      — list with filters
GET    /api/v1/results/:id                  — get one
GET    /api/v1/results/transcript/:studentId — full transcript
POST   /api/v1/results                       — create single
POST   /api/v1/results/bulk                  — bulk create (up to 500)
PATCH  /api/v1/results/:id                  — update (DRAFT only)
DELETE /api/v1/results/:id                  — delete (DRAFT only)
POST   /api/v1/results/:id/verify           — dept head verifies
POST   /api/v1/results/:id/approve          — dean approves
POST   /api/v1/results/:id/authorize        — registrar authorizes
POST   /api/v1/results/:id/publish          — direct publish
POST   /api/v1/results/:id/reject           — send back to DRAFT
```

### Try this in the browser

1. Login as **Teacher** (`teacher@dbpc.edu.et` / `Teacher@123`)
2. Go to `/app/results`
3. Click "Enter Results"
4. Pick a student, course, semester, assessment type
5. Enter marks (e.g. 85 out of 100)
6. See live preview: "85.0% · Grade B · ✓ Pass"
7. Save
8. Then login as **Department Head** → see the pending result → can verify
9. Login as **Dean** → approve
10. Login as **Registrar** → authorize
11. Status becomes PUBLISHED 🎉

---

## Stats

| Phase | Files | Lines |
|---|---|---|
| **6 Part 2** | 2 new + 3 updated | ~600 |
| **7 Part 1** | 7 new + 4 updated | ~1500 |

**Total backend + frontend now spans ~9,000+ lines.**

## Safety ✅
- Type-checks pass on both backend and frontend
- Production build succeeds
- Only added new routes (no breaking changes)
- Mock + real API both work
- One schema addition (the missing Course↔Exam relation)

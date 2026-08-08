# DBPCMS — Phase 6 Part 1

> **Status:** Backend + list/create/detail pages complete.
> **Date:** August 4, 2026

---

## What was built

### Backend (4 new files)
- `modules/exams/exams.schema.ts` — Zod validators
- `modules/exams/exams.service.ts` — Business logic with auto-generation algorithm
- `modules/exams/exams.controller.ts` — HTTP layer
- `modules/exams/exams.routes.ts` — Routes with role-based guards

### Schema changes (minimal, additive)
Added missing `Course ↔ Exam` relation in `schema.prisma`:
```prisma
model Exam {
  ...
  course Course @relation(fields: [courseId], references: [id], onDelete: Restrict)
}

model Course {
  ...
  exams Exam[]
}
```

### Frontend (3 new pages, 1 hook)
- `features/exams/ExamsListPage.tsx` — List with filters
- `features/exams/ExamFormPage.tsx` — 2-step create + auto-generate
- `features/exams/ExamDetailPage.tsx` — View, publish, archive, remove questions
- `hooks/useExams.ts` — React Query hooks

### Mock API
- 9 new exam methods (list/get/create/update/delete + auto-generate/add/remove questions + publish/archive)
- Added `exams` and `examQuestions` to MockDB type

---

## The auto-generation algorithm (the smart part)

```
1. Admin specifies: total questions, types, difficulty distribution %
2. System calculates: EASY: 30%, MEDIUM: 50%, HARD: 20% of total
3. For each (type, difficulty) combo:
   - Find ACTIVE questions for the exam's course matching that combo
   - Sort by timesUsed ASC (least used first) — prevents repetition
   - Pick the count needed
4. Insert all picked questions into the exam
5. Increment timesUsed on each picked question
6. If no questions match → friendly error message
```

**Example:** Admin asks for 20 questions, MCQ + T/F, with 30/50/20 distribution.
→ 6 EASY + 10 MEDIUM + 4 HARD questions picked automatically
→ Prioritizes questions not used in recent exams

---

## What works in the browser

1. **Visit `/app/exams`** → see list of exams (initially empty)
2. **Click "New Exam"** → 2-step wizard:
   - Step 1: Fill in title, course, semester, duration, marks, difficulty distribution
   - Step 2: Choose total questions, which types to include, click "Auto-Generate"
3. **Click on an exam** → see all questions, with publish/archive buttons
4. **As Exam Committee** (Hanna) → can publish exams
5. **As anyone with EXAM_CREATE** → can create and auto-generate

## Try this end-to-end

1. Login as **Exam Committee** (Hanna, `exam@dbpc.edu.et` / `Exam@12345`)
2. Go to `/app/exams` → click "New Exam"
3. Fill: "Mid-term Test CS101" / CS101 / Semester 1 / 60min / 50 marks
4. Continue → set 20 questions, only MULTIPLE_CHOICE
5. Click "Auto-Generate" — should pull from the 1 ACTIVE MCQ question we have
6. Click "Publish" → exam is now PUBLISHED

---

## Safety check ✅

- ✅ Type-checks pass on backend and frontend
- ✅ Production build succeeds
- ✅ Only added new routes (`/api/v1/exams/*`)
- ✅ Existing modules untouched
- ✅ Mock data + real API both work
- ✅ One small schema addition (the missing relation)

**Phase 6 backend + main flow complete.** Manual question picker (a more advanced UI) is next.

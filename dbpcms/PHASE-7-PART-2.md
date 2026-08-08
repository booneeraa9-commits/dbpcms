# Phase 7 Part 2 — Result Detail, Bulk Entry, Transcript

Built on top of Phase 7 Part 1 (results backend + list/entry pages).

## What was added

### 1. Result Detail Page (`/app/results/:id`)
- **Score card** showing marks, percentage, grade, and pass/fail badge at a glance
- **Workflow timeline** on the right side, built from real workflow timestamps:
  - Entered → Verified → Approved → Authorized → Published
  - Shows who performed each step and when
  - Shows a "Next: <step>" indicator for the current pending stage
- **Role-aware action bar** that shows only the actions this user can perform:
  - Dept Head sees **Verify Marks** when status is PENDING_VERIFICATION
  - Dean sees **Approve** when status is PENDING_APPROVAL
  - Registrar sees **Authorize** + **Publish to Students** when status is PENDING_AUTHORIZATION
  - All of the above can also **Reject** (with a reason modal)
  - Super Admin can do everything
  - Teacher can edit/delete their own DRAFT results
- **Reject modal** requires a written reason, which is appended to the result's remarks
- **Delete** button for DRAFT results (and Super Admin override)
- **Edit** button for DRAFT results (links to the form, future route)
- **Back button** for navigation, **status badge** in the header
- **Student name** is a clickable link to the student detail page
- **Remarks** are displayed if present (great for showing rejection reasons)

### 2. Bulk Result Entry (`/app/results/bulk`)
- **Two-step wizard**:
  - Step 1: Pick course, semester, assessment type, total marks
  - Step 2: Grid of all students with auto-calculating marks input
- **Live calculations** per student (percentage, grade, pass/fail) as you type
- **Sticky save bar** at the bottom shows live stats: total students, entered, pass, fail
- **Header stats** mirror the save bar for visibility
- **Search bar** to filter students
- **Checkboxes** to bulk-toggle all/filtered students
- **Per-row remarks field** (optional)
- **Single bulk-save** call to `/results/bulk` — creates all as DRAFT
- **Real-time error feedback** if bulk save fails

### 3. Transcript Page (`/app/results/transcript` and `/app/results/transcript/:studentId`)
- **Student picker mode** (no `studentId` in URL): search and pick a student
- **Transcript view mode** (with `studentId`):
  - Official college header (with logo + "OFFICIAL ACADEMIC TRANSCRIPT")
  - Student info section (name, ID, program, department)
  - Summary stats: total courses, average %, GPA letter, passed, failed
  - Results **grouped by semester** with per-semester subtotals
  - **Print-friendly** with `window.print()` (uses print:hidden classes)
- **Transcript link** added to:
  - Student detail page header (alongside ID Card and Edit)
  - Results list page (visible to anyone who can enter results)

### 4. Result List Updates
- Added **"Transcripts"** and **"Bulk Entry"** buttons in the header (next to "Enter Result")
- List rows are already clickable to detail page (Eye icon → `/app/results/:id`)

### 5. Student Detail Updates
- Added **"Transcript"** button in the header alongside ID Card and Edit
- Anyone with `report:view` (which is the same permission for the results list) can see it

## Permissions

| Page | Permission Required |
|---|---|
| Result Detail | `report:view` |
| Bulk Entry | `result:entry` |
| Transcript | `report:view` |

## Routes added

- `/app/results/bulk` — bulk entry
- `/app/results/transcript` — student picker
- `/app/results/transcript/:studentId` — transcript view
- `/app/results/:id` — result detail (was already linked, now actually exists)

## Mock-mode verification

All flows work in browser with `VITE_MOCK_MODE=true`:
1. Login as `teacher@dbpc.edu.et` / `Teacher@123`
2. Go to Results → "Enter Result" → submit a DRAFT result
3. Click on it in the list → see the new detail page
4. Login as `dept.head@dbpc.edu.et` / `DeptHead@123` → verify it
5. Login as `dean@dbpc.edu.et` / `Dean@12345` → approve it
6. Login as `registrar@dbpc.edu.et` / `Registrar@123` → authorize + publish
7. View transcript on student detail page

## Production build

`vite build` passes; all 3 new pages are code-split into their own chunks.
`tsc --noEmit` passes with zero errors.

## Files added

- `apps/web/src/features/results/ResultDetailPage.tsx`
- `apps/web/src/features/results/ResultBulkEntryPage.tsx`
- `apps/web/src/features/results/TranscriptPage.tsx`

## Files modified

- `apps/web/src/app/AppRouter.tsx` (3 new routes)
- `apps/web/src/features/results/ResultsListPage.tsx` (added Bulk + Transcripts buttons)
- `apps/web/src/features/students/StudentDetailPage.tsx` (added Transcript link)

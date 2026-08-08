# 08 — UI / UX Design

Goal: a **calm, professional, government-grade** dashboard. Not flashy. Fast,
predictable, and usable by staff who are not tech experts.

## 1. Design language

- **shadcn/ui + Tailwind CSS + Lucide icons.** Clean, accessible components you
  own (they live in your code, not a locked library). Consistent spacing, muted
  professional palette, one accent color, generous whitespace.
- **Typography:** one readable sans-serif, clear hierarchy (page title > section
  > body). No decorative fonts.
- **Accessibility (WCAG AA):** keyboard navigation, focus outlines, color
  contrast, labels on every input, screen-reader friendly. Built in, not bolted
  on.
- **Responsive:** desktop-first (staff work on PCs) but fully usable on tablet
  and phone via a collapsing sidebar and stacking layouts.

## 2. App shell (every screen shares it)

```
┌──────────────────────────────────────────────────────────┐
│ Top bar: DBPCMS logo | global search | notifications | user│
├───────────┬──────────────────────────────────────────────┤
│ Sidebar   │  Page header (title + primary action button)  │
│ (nav,     │  ──────────────────────────────────────────   │
│  filtered │  Content: tables / forms / cards / charts      │
│  by your  │                                                │
│  role)    │                                                │
└───────────┴──────────────────────────────────────────────┘
```
The **sidebar only shows what your role can access** — an Instructor never sees
"User Management". This is driven by the same permissions as the backend, so the
UI and API always agree.

## 3. Role-specific dashboards (landing page after login)

Each role lands on a dashboard tailored to their job (from your spec):
- **Admin:** counts (users, employees, students, departments), activity feed.
- **HR:** total employees, new this month, contracts expiring, recent registrations.
- **Registrar:** grade-submission status, pending approvals, published results,
  academic calendar.
- **Dept Head:** instructor activity, grades awaiting approval, dept GPA, pass rate.
- **Instructor:** assigned courses, pending grade entry, submitted grades, class stats.
- **Dean:** institutional analytics, employee & academic statistics, dept comparison.
- **Employee:** own profile summary and documents.

## 4. The three screen patterns we reuse everywhere

Almost every feature is one of these, so we build each pattern once as a shared
component and reuse it:

1. **List page** — a `DataTable` with server pagination, search box, filter
   chips, column sort, row actions, and a primary "Create" button. Used for
   employees, students, courses, users, audit logs…
2. **Detail page** — tabs for a single record (e.g. Employee: Personal /
   Employment / Education / Documents / History / Activity).
3. **Form page/dialog** — create/edit via **React Hook Form + Zod**, with inline
   field errors, disabled-while-saving buttons, and a success toast.

## 5. UX states — never leave the user guessing

Every data view implements all of these (your explicit requirement):
- **Loading state:** skeleton placeholders, not a frozen blank screen.
- **Empty state:** friendly "No employees yet — add your first one" with the
  action button, not an empty table.
- **Error state:** clear message + a "Retry" button; technical detail goes to
  logs, not the user's face.
- **Confirmation dialogs:** for destructive/irreversible actions (delete,
  publish grades, unlock).
- **Toast notifications:** brief confirmations ("Grade submitted") and error
  alerts.
- **Optimistic-but-safe saves:** buttons disable during save; on version
  conflict the user gets "This record changed since you opened it — reload."

## 6. Data & state handling (frontend architecture)

- **TanStack Query** manages all server data: caching, background refresh,
  loading/error states, and pagination — so lists feel instant and stay fresh
  without manual plumbing.
- **React Hook Form + Zod** for all forms; the **same Zod schemas** from the
  shared package validate on the frontend *and* backend (one source of truth).
- **React Router** for navigation; routes are guarded by permission so users
  can't even reach a page they lack rights for.
- Feature code is grouped in `features/<name>/` (see doc 04): its own
  components, hooks, api calls, and pages.

## 7. Grade-entry screen (the most important UX in the system)

- A spreadsheet-like grid: students down the side, components across the top.
- **Autosave draft** so no work is lost; clear "Draft / Submitted / Approved /
  Published" status badge.
- Live column totals and computed percentage/letter as marks are typed.
- Bulk **Excel import** with a preview-and-confirm step (show what will change
  before committing).
- Locked cells shown clearly once published; changes require a grade-change request.

## 8. Notifications & global search

- **Bell icon** shows unread in-app notifications (grade due, approved, etc.).
- **Global search** in the top bar searches across employees, students, courses,
  departments (respecting your permissions), with grouped results.

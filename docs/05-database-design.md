# 05 — Database Design

> "Design the database before writing business logic." — your instruction, and
> exactly right. This is the foundation everything else stands on.

## 0. Principles we follow (and why)

- **Normalization (3NF).** Store each fact once. A department's name lives in the
  `departments` table only; everything else *points to* it by id. This prevents
  the classic mess where the same department is spelled three different ways.
- **Foreign keys** enforce that a pointer always points at something real (you
  can't assign a course to a department that doesn't exist).
- **Indexes** on every column we search/filter/sort by, so queries stay fast at
  10,000+ students.
- **Constraints** (unique, not-null, check) let the *database itself* refuse bad
  data, even if a bug slips past the code. Defense in depth.
- **Transactions** for multi-step changes (e.g. publishing a grade also writes an
  audit log and a notification — all succeed or all roll back).
- **UUID primary keys** (not simple 1,2,3 integers). Safer to expose in URLs,
  and they don't leak "how many employees do we have?" to outsiders.
- **Standard columns on every table:** `id`, `created_at`, `updated_at`,
  `created_by`, `updated_by`, `deleted_at` (soft delete), and `version`
  (optimistic locking) on editable records.
- **Human-readable business codes** *in addition to* UUIDs where users need them:
  `employee_number` (e.g. DBPC-EMP-2026-00042), `student_number`. Auto-generated,
  unique, never reused.
- **All timestamps in UTC.**

---

## 1. The tables, grouped by area

I'll describe each table's purpose and key columns. The exact Prisma schema is
written in Phase 1; this is the human blueprint.

### A. Identity & Access

- **users** — login identity. `email` (unique), `password_hash`,
  `is_active`, `must_change_password`, `failed_login_count`, `locked_until`,
  `token_version`, `last_login_at`. *Optionally* links to an `employee` (staff who
  log in) — a user is the login; an employee is the HR record. Keeping them
  separate is deliberate (see note below).
- **roles** — `name` (unique), `description`, `is_system` (protects built-in
  roles from deletion).
- **permissions** — `key` (unique, e.g. `grade:approve`), `description`.
- **user_roles** — join table (a user ↔ many roles).
- **role_permissions** — join table (a role ↔ many permissions).
- **refresh_tokens / sessions** — `user_id`, `token_hash`, `expires_at`,
  `revoked_at`, `ip_address`, `user_agent`. Powers session management & logout.
- **password_reset_tokens** — `user_id`, `token_hash`, `expires_at`, `used_at`.

> **Why separate `users` from `employees`?** Not every employee logs in, and some
> logins (a super-admin) aren't employees. Coupling them would force awkward
> exceptions later. A nullable link between them keeps both clean. This is a
> deliberate normalization choice.

### B. Academic Structure

- **departments** — `name`, `code` (unique), `head_user_id` (the Dept Head),
  `is_active`.
- **programs** — belongs to a department. `name`, `code`, `degree_level`,
  `duration_years`.
- **academic_years** — e.g. "2026/2027". `start_date`, `end_date`, `is_current`.
- **semesters** — belong to an academic year. `name` (Semester I/II), `sequence`,
  `start_date`, `end_date`, `status` (planned/active/closed).
- **courses** — belong to a program (or shared). `code` (unique), `title`,
  `credit_hours`, `category`, `is_active`.
- **course_offerings / sections** — a course *taught in a specific semester*, as
  one or more **sections**. `course_id`, `semester_id`, `section_label` (A/B),
  `capacity`. This is what an instructor is assigned to.
- **instructor_assignments** — links an instructor (user) ↔ a section. Enforces
  the Instructor→Course→Section→Semester relationship from your spec.

### C. Employee Management

- **employees** — the master HR record. Personal fields (full name parts,
  gender, date_of_birth, nationality, marital_status, national_id [sensitive],
  tin [sensitive], phone, email, address), plus employment fields
  (department_id, position, employment_type, date_of_employment, contract_type,
  employment_status, salary_grade, office_location, supervisor_employee_id),
  `photo_document_id`, `employee_number` (unique). Sensitive fields flagged for
  encryption-at-rest.
- **emergency_contacts** — one-to-many with employee.
- **employee_education** — many per employee: institution, qualification,
  field_of_study, graduation_year, gpa (nullable).
- **employee_qualifications** — certifications/licenses/workshops/trainings/
  memberships (a `type` column distinguishes them → one flexible table instead of
  five near-identical ones).
- **employment_history** — previous employers, positions, durations,
  responsibilities.

### D. Documents (files)

- **documents** — metadata for every uploaded file: `owner_type`
  (employee/student/…), `owner_id`, `document_type` (degree/cv/national_id/…),
  `original_filename`, `storage_key` (path/key the StorageProvider understands —
  **not** a hardcoded local path), `mime_type`, `size_bytes`, `checksum`,
  `uploaded_by`. Because we store a `storage_key` handled by the storage
  abstraction, moving from local disk to cloud later changes **no** table.

### E. Students & Enrollment

- **students** — `student_number` (unique), name parts, department_id,
  program_id, batch, section, current_semester_id, status
  (active/graduated/withdrawn/suspended), links to a future student `user`.
- **enrollments** — a student ↔ a section (a course they're taking this
  semester). `status` (enrolled/completed/withdrawn/incomplete/audit),
  `attempt_number` (for retakes). This is where grades attach.

### F. Grading (configurable — the heart of the system)

- **grade_components** — configurable component definitions per department (Quiz,
  Mid, Final…): `name`, `is_active`, plus a link to a component *set*. **Not
  hard-coded** — admins/dept heads create and edit these.
- **grade_component_sets** — a named, versioned bundle of components with weights
  that must sum to 100%, scoped to a department/program. Editing creates a new
  version; old versions stay for already-graded records.
- **grading_scales** — configurable letter bands: rows of `min_percent`,
  `max_percent`, `letter`, `grade_point`, `is_pass`. Versioned & scoped. Editable
  by authorized users **without code changes** (your requirement).
- **gpa_rules** — scale type (4.0 / 5.0 / pass-fail / custom), rounding rule,
  tie-break rule, credit rules. Versioned.
- **grade_entries** — the actual marks: `enrollment_id`,
  `component_id`, `score`, `max_score`, `entered_by`, plus draft/edit tracking.
- **grade_results** — the computed outcome per enrollment: `total_marks`,
  `percentage`, `letter_grade`, `grade_point`, `is_pass`, `credit_earned`, and a
  **frozen snapshot** (`applied_scale_version`, `applied_weights`,
  `applied_gpa_rule`) captured at publish time so historical transcripts never
  change if policies change later.
- **grade_submissions / approvals** — the workflow record: `section_id`,
  `status` (draft → submitted → dept_approved → registrar_published), plus who
  and when at each step, and `locked_at`. Drives the approval chain
  Instructor → Dept Head → Registrar → Published, and grade **locking**.
- **grade_change_requests** — audited requests to alter a locked grade, with
  reason and approver (handles corrections & retakes cleanly).
- **gpa_summaries** — cached per-student per-semester GPA and cumulative GPA, so
  transcripts and dashboards are fast (recomputed on publish, inside the
  transaction).

### G. Platform / cross-cutting

- **audit_logs** — `user_id`, `action`, `entity_type`, `entity_id`, `before`
  (JSON), `after` (JSON), `ip_address`, `user_agent`, `created_at`. Append-only;
  never edited or deleted.
- **notifications** — `user_id`, `type`, `title`, `body`, `read_at`, `link`.
- **system_settings** — key/value configuration editable by admins (e.g. lockout
  thresholds, current academic year) without code changes.

---

## 2. Key relationships in words

- A **department** has many **programs**, many **employees**, and one **head**.
- A **program** has many **courses**; a **course** is offered as **sections** in
  a **semester**; an **instructor** is **assigned** to a section.
- A **student** enrolls in **sections** (enrollments); each enrollment collects
  **grade_entries** (per component) which roll up into one **grade_result**,
  which contributes to **gpa_summaries**.
- A **grade_result** is produced through a **grade_submission** workflow and,
  once published, is **locked** and carries a **frozen snapshot** of the scale,
  weights, and GPA rule used.
- **Everything sensitive** that changes writes an **audit_log** row inside the
  same transaction.

## 3. Indexing plan (performance at scale)

We index: every foreign key; `users.email`; `employees.employee_number`,
`employees.department_id`, `employees.employment_status`;
`students.student_number`, `students.program_id`, `students.status`;
`enrollments.(student_id, section_id)` unique per attempt;
`grade_submissions.(section_id, status)`; `audit_logs.(entity_type, entity_id)`
and `audit_logs.created_at`. Full-text/trigram indexes power global search later.

## 4. Data integrity rules enforced by the DB

- Grade component weights **sum to 100%** (validated in service + a check where
  practical).
- A student cannot have two active enrollments in the same section/attempt
  (unique constraint).
- A published grade cannot be edited (enforced by workflow state + app logic;
  changes only via `grade_change_requests`).
- Soft-deleted rows are filtered out by default in the repository layer.

## 5. Migrations & seeds

- **Migrations** (Prisma) version every schema change; running `migrate` brings
  any machine (your laptop, the VPS) to the identical structure.
- **Seed** creates: permissions, roles, admin user, a sample department, a
  default grading scale and GPA rule, and the current academic year — so a fresh
  install is immediately usable for testing.

See `dbpcms-erd.svg` in this folder for the visual diagram.

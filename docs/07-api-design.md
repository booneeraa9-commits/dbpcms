# 07 — API Design (The Backend's "Menu")

The frontend and any future mobile app talk to the backend **only** through this
REST API. Consistency here means every screen behaves predictably.

## 1. Universal rules

- **Base path & versioning:** everything lives under `/api/v1/...`. When we make
  a breaking change years from now, `/api/v2` can exist alongside `/api/v1`, so
  old clients don't break. Never rename or repurpose a shipped endpoint.
- **Nouns, plural, lowercase, kebab-case:** `/employees`,
  `/grade-submissions`. Actions are HTTP verbs, not words in the URL.
- **HTTP verbs:**
  - `GET` = read (never changes data)
  - `POST` = create (or a named action, see below)
  - `PUT`/`PATCH` = update (PATCH = partial)
  - `DELETE` = remove (soft delete in our system)
- **HTTP status codes, used correctly:**
  - `200` OK, `201` Created, `204` No Content
  - `400` bad input, `401` not logged in, `403` logged in but not allowed,
    `404` not found, `409` conflict (e.g. stale version / duplicate),
    `422` validation failed, `429` too many requests
  - `500` server error (details logged, never shown to the user)

## 2. One response shape for everything

Success:
```json
{
  "success": true,
  "data": { },
  "meta": { "requestId": "..." }
}
```
List (with pagination):
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7,
    "requestId": "..."
  }
}
```
Error (never leaks internals):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "details": [ { "field": "email", "message": "Invalid email." } ]
  },
  "meta": { "requestId": "..." }
}
```
Because every reply looks the same, the frontend has **one** place that handles
success and **one** that handles errors. Less code, fewer bugs.

## 3. Lists: pagination, filtering, sorting, searching

All list endpoints accept the same query parameters:
```
GET /api/v1/employees?page=2&pageSize=20&sort=-createdAt&search=abebe
    &department=<uuid>&employmentStatus=active
```
- `page`, `pageSize` (capped, e.g. max 100 — prevents "give me all 10,000 rows")
- `sort` (`field` asc, `-field` desc; only whitelisted fields allowed)
- `search` (matches indexed text fields)
- feature-specific filters (whitelisted; anything else is ignored, not trusted)

This one convention, applied everywhere, is how we stay fast at scale.

## 4. The Version-1 endpoints (representative, not exhaustive)

### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me                # current user + permissions
POST   /api/v1/auth/change-password
```
### Users, roles, permissions (Admin)
```
GET/POST/PATCH/DELETE  /api/v1/users
POST   /api/v1/users/:id/roles
GET/POST/PATCH/DELETE  /api/v1/roles
GET    /api/v1/permissions
GET    /api/v1/users/:id/sessions      # session management
DELETE /api/v1/users/:id/sessions/:sid # revoke a session
```
### Academic structure
```
GET/POST/PATCH/DELETE  /api/v1/departments
GET/POST/PATCH/DELETE  /api/v1/programs
GET/POST/PATCH/DELETE  /api/v1/academic-years
POST   /api/v1/academic-years/:id/set-current
GET/POST/PATCH/DELETE  /api/v1/semesters
GET/POST/PATCH/DELETE  /api/v1/courses
GET/POST/PATCH/DELETE  /api/v1/sections
POST   /api/v1/sections/:id/assign-instructor
```
### Employees
```
GET    /api/v1/employees                 # list (paginated/filter/sort/search)
POST   /api/v1/employees
GET    /api/v1/employees/:id             # full profile
PATCH  /api/v1/employees/:id
DELETE /api/v1/employees/:id             # soft delete
POST   /api/v1/employees/import          # bulk (Excel)
GET    /api/v1/employees/:id/education   (+ POST/PATCH/DELETE)
GET    /api/v1/employees/:id/qualifications  (+ ...)
GET    /api/v1/employees/:id/history         (+ ...)
POST   /api/v1/employees/:id/documents   # upload
GET    /api/v1/employees/:id/print       # PDF profile
```
### Students & enrollment
```
GET/POST/PATCH/DELETE  /api/v1/students
POST   /api/v1/students/import
GET/POST/DELETE        /api/v1/enrollments
```
### Grading (configurable + workflow)
```
GET/POST/PATCH/DELETE  /api/v1/grade-components
GET/POST/PATCH/DELETE  /api/v1/grading-scales
GET/POST/PATCH/DELETE  /api/v1/gpa-rules
GET    /api/v1/sections/:id/gradesheet      # the grid an instructor fills in
PUT    /api/v1/sections/:id/grades          # save/draft marks
POST   /api/v1/sections/:id/grades/import   # bulk Excel upload
POST   /api/v1/sections/:id/grades/submit   # instructor submits
POST   /api/v1/grade-submissions/:id/approve   # dept head
POST   /api/v1/grade-submissions/:id/publish   # registrar (locks)
POST   /api/v1/grade-submissions/:id/unlock    # registrar/admin only
POST   /api/v1/grade-change-requests
```
> **Named actions** like `.../submit`, `.../approve`, `.../publish` are POSTs
> under a resource. They represent *state transitions in a workflow*, which don't
> map cleanly to plain CRUD — this is an accepted, readable REST pattern.

### Reports & exports
```
GET /api/v1/reports/:reportKey?format=pdf|excel|csv&<filters>
GET /api/v1/students/:id/transcript?format=pdf
```
### Platform
```
GET /api/v1/notifications          POST /api/v1/notifications/:id/read
GET /api/v1/audit-logs             # admin, read-only, filterable
GET /health                        # liveness for VPS monitoring (no auth)
```

## 5. Security applied to every endpoint

- Every route except `login`, `refresh`, `forgot/reset-password`, and `/health`
  requires a valid access token.
- Each route declares the **permission** it needs; middleware enforces it.
- Services enforce **scope** (e.g. dept head limited to own department).
- Inputs validated by **Zod** before reaching the service.
- Rate limiting on auth endpoints (stricter) and globally (looser).
- Every mutating call may write an **audit log**.

## 6. Documentation

The API is documented with **OpenAPI (Swagger)**, generated from the same Zod
schemas so the docs never drift from reality. During development you'll browse it
at `/api/docs`.

# DBPCMS — Setup Guide (Local Machine)

> **Donna Barbar Polytechnic College Management System**
> Built with React + Vite + TypeScript + Tailwind (frontend) and Node + Express + Prisma + PostgreSQL (backend).
>
> This guide assumes you are a developer on a Windows / macOS / Linux machine.

---

## TL;DR — Two ways to run it

| Mode | What you need | What works |
|---|---|---|
| **🟢 MOCK MODE** (recommended for first look) | Just Node.js 18+ | Full UI, all 8 roles, all flows. No DB, no backend server. Data lives in your browser's localStorage. |
| **🟡 REAL MODE** (full stack) | Node + Docker + Postgres | Backend API + real database. Requires more setup. |

**You can do BOTH** — start with mock mode (1 minute), then optionally set up real mode (30 minutes).

---

## Prerequisites (install these first)

1. **Node.js 20+** — https://nodejs.org/ (download LTS)
   - Verify: `node --version` should show `v20.x` or higher
2. **npm** — comes with Node
   - Verify: `npm --version` should show `10.x` or higher
3. **Git** — https://git-scm.com/
4. *(Only for REAL mode)* **Docker Desktop** — https://www.docker.com/products/docker-desktop/
   - Verify: `docker --version`

> No code editor is required to run the app, but you'll want one to look at the code. VS Code is recommended: https://code.visualstudio.com/

---

## 1. Extract the zip

```bash
unzip dbpcms-phase8.zip
cd dbpcms
```

You should see:
```
dbpcms/
├── apps/
│   ├── api/          ← backend (Node + Express + Prisma)
│   └── web/          ← frontend (React + Vite)
├── packages/
│   └── shared/       ← types & constants shared between api & web
├── docker-compose.yml
├── README.md
├── MOCK-MODE.md
└── PHASE-*.md
```

---

## 2. Install dependencies (one command)

From the project root (`dbpcms/`):

```bash
npm install --no-audit --no-fund
```

This installs everything for all three workspaces (api, web, shared) via npm workspaces.

> ⏱ Takes 1-3 minutes depending on your internet. You should see `added XXXX packages` at the end.

**If you see errors** about Python or build tools on Windows:
- Windows: install [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) or just use the prebuilt binaries
- macOS: `xcode-select --install`
- Linux: `sudo apt install build-essential python3`

---

## 3. 🟢 MOCK MODE — run the app (no backend needed)

This is the **fastest** way to see the system working.

```bash
# From the project root
npm run dev:web
```

You should see something like:
```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

Open **http://localhost:5173** in your browser.

You'll see the login page. **Log in with any of these demo accounts** (all passwords are pre-seeded):

| Role | Email | Password | What they see |
|---|---|---|---|
| Super Admin | `admin@dbpc.edu.et` | `Admin@12345` | Everything |
| Principal | `principal@dbpc.edu.et` | `Principal@123` | Reports, audit log, results |
| Academic Dean | `dean@dbpc.edu.et` | `Dean@12345` | Course approvals, results |
| Registrar | `registrar@dbpc.edu.et` | `Registrar@123` | Students, transcripts, publishing |
| Department Head | `dept.head@dbpc.edu.et` | `DeptHead@123` | Verifications, questions |
| Teacher | `teacher@dbpc.edu.et` | `Teacher@123` | Enter results, view questions |
| Exam Committee | `exam@dbpc.edu.et` | `Exam@12345` | Exam approvals |

**Try the full results workflow:**
1. Log in as `teacher@dbpc.edu.et` / `Teacher@123`
2. Go to **Results** → "Enter Result" → fill in student + course + marks → save
3. Log out, log in as `dept.head@dbpc.edu.et` / `DeptHead@123`
4. Go to **Notifications** 🔔 (topbar bell) → see "result awaiting verification"
5. Click the notification → opens the result detail page
6. Click "Verify Marks" → status moves to PENDING_APPROVAL
7. Log in as `dean@dbpc.edu.et` / `Dean@12345` → "Approve"
8. Log in as `registrar@dbpc.edu.et` / `Registrar@123` → "Authorize" then "Publish"
9. Log in as a student, go to Students → pick one → "Transcript" → see published result

> 💡 **Data is stored in your browser's localStorage.** Clearing browser data resets everything. Use the "Reset" button on the demo banner at the top of the page to wipe and reseed.

**Mock data pre-seeded:**
- 3 departments, 5 programs, 6 courses
- 12 Ethiopian students (Abel, Hanna, Yonas, Meron, Dawit, Sara, Bereket, Lidya, Tesfaye, Selam, Henok, Rahel)
- 8 demo users (one per role)
- 6 sample questions (in all workflow states)
- 4 sample notifications, 5 sample activity log entries

---

## 4. 🟡 REAL MODE — run with backend + Postgres (optional, more involved)

If you want to test the actual backend + database, follow these extra steps.

### 4.1 Start Postgres with Docker

```bash
# From project root
docker compose up -d postgres
```

You should see:
```
✔ Network dbpcms_default  Created
✔ Container dbpcms-postgres  Started
```

Verify it's running:
```bash
docker ps
```

You should see `dbpcms-postgres` in the list.

### 4.2 Create backend .env

```bash
cd apps/api
cp .env.example .env
```

Open `apps/api/.env` and **edit the JWT secrets** to something random:

```env
DATABASE_URL="postgresql://dbpcms:dbpcms_dev_password@localhost:5432/dbpcms?schema=public"
NODE_ENV=development
PORT=4000
JWT_ACCESS_SECRET=CHANGE_ME_to_a_long_random_string_at_least_32_chars
JWT_REFRESH_SECRET=CHANGE_ME_to_another_long_random_string_at_least_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173,http://localhost:4000
```

> ⚠️ **Don't ship the defaults to production.** Generate real secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 4.3 Run database migrations

```bash
# Still in apps/api/
npx prisma migrate dev --name init
```

This creates all 27 tables in Postgres. You should see:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied:
migrations/
  └─ XXXX_init/
       └─ migration.sql
Your database is now in sync with your schema.
```

### 4.4 Seed demo data

```bash
npm run db:seed
```

You should see something like:
```
✔ Seeded 8 users
✔ Seeded 8 roles
✔ Seeded 30+ permissions
✔ Seeded 3 departments
✔ Seeded 5 programs
✔ Seeded 6 courses
```

### 4.5 Start the backend

```bash
# Still in apps/api/
npm run dev
```

You should see:
```
[INFO] Server listening on http://localhost:4000
[INFO] Health check at http://localhost:4000/health
[INFO] API base at http://localhost:4000/api/v1
```

Test it: open http://localhost:4000/health in your browser. Should return:
```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

### 4.6 Start the frontend in REAL mode

Open a **second terminal**, from project root:

```bash
# Edit apps/web/.env and set:
# VITE_MOCK_MODE=false
# (or just delete that line)

cd apps/web
npm run dev
```

Now your app talks to the real backend at `http://localhost:4000/api/v1` instead of localStorage.

**Try logging in with `admin@dbpc.edu.et` / `Admin@12345`** — same credentials, but now hitting the real DB.

---

## 5. Useful commands (cheat sheet)

| Command | What it does |
|---|---|
| `npm run dev:web` | Start the frontend (mock mode) |
| `npm run dev:api` | Start the backend (needs Postgres) |
| `npm run dev` | Start both (frontend + backend together) |
| `npm run build` | Build production bundles |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm run lint` | ESLint check |
| `npm run db:migrate` | Run new Prisma migrations |
| `npm run db:seed` | Reseed demo data into the database |
| `npm run db:studio` | Open Prisma Studio (DB browser at localhost:5555) |
| `docker compose up -d postgres` | Start Postgres |
| `docker compose down` | Stop and remove containers |

---

## 6. Folder structure (what's where)

```
dbpcms/
├── apps/
│   ├── api/                     ← Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma    ← 27 DB models
│   │   │   ├── seed.ts          ← Demo data
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── modules/         ← 14 feature modules (auth, students, results, etc.)
│   │   │   ├── common/          ← Errors, guards, utils, middleware
│   │   │   ├── infra/           ← Database client, logger
│   │   │   ├── app.ts           ← Express app
│   │   │   ├── routes.ts        ← API routes
│   │   │   └── server.ts        ← Server entry point
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── web/                     ← Frontend
│       ├── src/
│       │   ├── features/        ← 14 feature modules (auth, dashboard, results, etc.)
│       │   ├── components/      ← Reusable UI (Layout, NotificationBell, etc.)
│       │   ├── hooks/           ← React Query hooks
│       │   ├── stores/          ← Zustand stores (auth, theme)
│       │   ├── lib/             ← API client, mock API, helpers
│       │   ├── app/             ← Router, providers
│       │   └── main.tsx         ← Entry point
│       ├── .env
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   └── shared/                  ← Shared types & constants
│       └── src/
│           ├── constants/       ← Roles, permissions, enums
│           ├── types/           ← TypeScript types
│           └── validators/      ← Zod schemas
│
├── docs/                        ← Architecture, API, DB, deployment docs
├── docker-compose.yml
└── package.json                 ← Root, with npm workspaces
```

---

## 7. Troubleshooting

### "Port 5173 is already in use"
Another app is using that port. Either:
- Stop the other app
- Or run on a different port: `cd apps/web && npx vite --port 5174`

### "Cannot find module" or "MODULE_NOT_FOUND"
You skipped the install step. Run:
```bash
cd dbpcms
npm install --no-audit --no-fund
```

### "Port 4000 is already in use" (real mode)
Another app is using the backend port. Either:
- Stop the other app
- Or edit `apps/api/.env` and change `PORT=4001`, then update `apps/web/.env`'s `VITE_API_BASE_URL` to match.

### "ECONNREFUSED 127.0.0.1:5432" (real mode)
Postgres isn't running. Run:
```bash
docker compose up -d postgres
docker ps   # verify it's running
```

### "prisma: command not found" (real mode)
Use `npx prisma` instead of `prisma`:
```bash
cd apps/api
npx prisma migrate dev
```

### "Vite proxy error" / "Network error" in the browser console (real mode)
Your backend isn't running, OR CORS is blocking. Check:
1. Backend is up: `curl http://localhost:4000/health` → should return 200
2. CORS in `apps/api/.env` includes `http://localhost:5173`

### "I see a white page"
The dev server might have crashed. Stop it (Ctrl+C) and re-run:
```bash
cd dbpcms
npm run dev:web
```

### "I want to wipe all data and start fresh" (mock mode)
Click the **"Reset"** button on the orange demo banner at the top of the app.

### "I want to wipe all data and start fresh" (real mode)
```bash
cd apps/api
npx prisma migrate reset    # drops DB, re-runs migrations, re-seeds
```

### Login not working in mock mode?
- Passwords are case-sensitive
- Make sure you're typing the full email (e.g. `teacher@dbpc.edu.et`, not `teacher@dbpc`)

---

## 8. What's actually built (the honest list)

✅ **Fully working in mock mode (no backend needed):**
- Login + JWT-style auth (mock tokens in localStorage)
- 8 roles, 30+ permissions, RBAC working
- 12 students, 6 courses, 6 questions pre-seeded
- Full student CRUD + bulk import + ID cards with QR codes
- Question bank with 6 question types, approval workflow
- Exam generator (auto + manual)
- Results management (4-stage approval workflow)
- Transcripts (printable)
- Notifications (bell + page)
- Activity log / audit trail
- Dashboard with live counts
- CSV export
- Dark mode
- 4-stage results workflow actually works end-to-end (DRAFT → submit → verify → approve → authorize → publish)

⚠️ **Built in backend, never been tested end-to-end with a real DB:**
- Everything in the backend has the same shape as mock, so the flip is just an env var
- But you'll need Docker + the migrate/seed steps to verify

❌ **Not built (would be needed for real production):**
- Email sending (password reset is mocked)
- File uploads (photos, attachments)
- Automated tests
- Sentry / error tracking
- CI/CD pipeline
- Docker image for the API itself (only the DB has one)
- Amharic / i18n

See `PHASE-8-SUMMARY.md` for the full production-readiness audit.

---

## 9. Next steps once you have it running

1. **Browse the app** — log in as different users, see the role-based sidebars
2. **Try the workflow** — enter a result as teacher, watch it flow through to publish
3. **Reset and play** — clear data with the reset button, start over
4. **(Optional) Set up real mode** — follow section 4 above
5. **(Optional) Look at the code** — start with `apps/web/src/features/` and `apps/api/src/modules/`
6. **(Optional) Read the phase summaries** — `PHASE-1-SUMMARY.md` through `PHASE-8-SUMMARY.md` document what's built and why

Have fun! 🚀

# Donna Barbar Polytechnic College Management System (DBPCMS)

Enterprise college management platform — Employee Management & Student Grading,
built to grow into a full institutional system.

> **New here?** Read `docs/00-START-HERE.md` first. The full design lives in `docs/`.

## Tech stack
- **Frontend:** React 19, TypeScript, Vite, React Router, TanStack Query,
  Tailwind CSS, Lucide icons.
- **Backend:** Node.js 24 LTS, TypeScript, Express, Prisma (added in Phase 2).
- **Database:** PostgreSQL 16 (via Docker locally).
- **Monorepo:** pnpm workspaces.

## Repository layout
```
dbpcms/
├─ docs/                 # design & planning documents
├─ apps/
│  ├─ api/               # backend (Express + TypeScript)
│  └─ web/               # frontend (React + Vite)
├─ packages/
│  └─ shared/            # Zod schemas, types, constants shared by both apps
├─ docker-compose.yml    # local PostgreSQL
├─ pnpm-workspace.yaml
└─ package.json          # workspace scripts
```

## Prerequisites (Windows)
See `docs/12-your-windows-setup-guide.md`. In short: Node.js 24 LTS, Git,
Docker Desktop, and pnpm (via `corepack enable`).

## First-time setup
```powershell
# 1. Install dependencies for all packages
pnpm install

# 2. Create your backend environment file and edit values if needed
Copy-Item apps/api/.env.example apps/api/.env

# 3. Start the local PostgreSQL database (needs Docker Desktop running)
pnpm db:up
```

## Running in development
```powershell
# Run backend and frontend together
pnpm dev

# …or individually
pnpm dev:api     # backend at http://localhost:4000  (health: /health)
pnpm dev:web     # frontend at http://localhost:5173
```
The frontend proxies any `/api/...` call to the backend automatically, so the
browser only ever talks to one origin.

## Useful scripts
| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run frontend + backend together |
| `pnpm build` | Type-check and build everything for production |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests |
| `pnpm db:up` / `pnpm db:down` | Start / stop local PostgreSQL |

## Verifying it works
1. `pnpm db:up` (Docker running)
2. `pnpm dev`
3. Open http://localhost:5173 — the dashboard's **Backend status** card should
   say **Connected**.
4. Open http://localhost:4000/health — you should see a JSON `status: ok`.

## Documentation index
All design docs are in `docs/` (architecture, database, auth/RBAC, API, UI/UX,
security, testing, roadmap, decisions log). Start with `docs/00-START-HERE.md`.

## License / ownership
Internal system for Donna Barbar Polytechnic College.

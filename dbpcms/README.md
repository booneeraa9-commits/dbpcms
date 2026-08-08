# Donna Barbar Polytechnic College Management System (DBPCMS)

A production-grade, enterprise-level college management platform for Donna Barbar Polytechnic College, Ethiopia.

## 🎯 What this system does

DBPCMS replaces paper-based processes with a secure, centralized digital platform for:

- **Centralized Question Bank** for exit exams and internal assessments
- **Year-round Student Registration** without recreating profiles
- **Multi-level Result Management** (entry → verification → approval → authorization → publication)
- **Role-based Dashboards** for Super Admin, Principal, Dean, Registrar, Department Heads, Teachers, Exam Committee, and Students
- **Exam Generation** with randomization and difficulty distribution
- **Reports, Notifications, and Audit Trails**

## 🏗️ Architecture

This is a **monorepo** containing:

```
dbpcms/
├── apps/
│   ├── api/      # Node.js + Express + TypeScript + Prisma backend
│   └── web/      # React + Vite + TypeScript + TailwindCSS frontend
├── packages/
│   └── shared/   # Shared types, constants, validators
└── docs/         # Architecture, API, database, deployment docs
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, TailwindCSS, React Router, React Query, React Hook Form, Zod, Framer Motion, Lucide Icons |
| Backend | Node.js 20+, Express.js, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens + RBAC |
| Tooling | ESLint, Prettier, Docker |

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js 20+** ([download](https://nodejs.org))
- **Docker & Docker Compose** ([download](https://www.docker.com))
- **Git**

### Setup

```bash
# 1. Clone the repository
git clone <repo-url> dbpcms
cd dbpcms

# 2. Install dependencies (uses npm workspaces)
npm install

# 3. Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start the database
docker compose up -d postgres

# 5. Run database migrations
npm run db:migrate

# 6. Seed the database with initial data
npm run db:seed

# 7. Start everything (API on :4000, Web on :5173)
npm run dev
```

Visit:
- **Frontend:** http://localhost:5173
- **API Health:** http://localhost:4000/api/v1/health
- **API Docs:** http://localhost:4000/api/v1/docs (coming in Phase 2)

### Default Seeded Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@dbpc.edu.et | Admin@12345 |
| Principal | principal@dbpc.edu.et | Principal@123 |
| Academic Dean | dean@dbpc.edu.et | Dean@12345 |
| Registrar | registrar@dbpc.edu.et | Registrar@123 |
| Department Head | dept.head@dbpc.edu.et | DeptHead@123 |
| Teacher | teacher@dbpc.edu.et | Teacher@123 |
| Exam Committee | exam@dbpc.edu.et | Exam@12345 |

⚠️ **Change these immediately in production.**

## 📚 Documentation

- [Architecture](docs/architecture.md) — system design, patterns, decisions
- [Database](docs/database.md) — schema, ER diagrams, migrations
- [API](docs/api.md) — REST endpoints, auth, error format
- [Deployment](docs/deployment.md) — production, Docker, backups

## 🧪 Testing

```bash
npm test              # All tests
npm run test:api      # API only
npm run test:web      # Frontend only
```

## 📦 Project Status

Currently in active development. See `docs/` for the phase-by-phase build log.

## 📝 License

Proprietary — © Donna Barbar Polytechnic College.

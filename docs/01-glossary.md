# 01 — Glossary (Plain-Language Definitions)

Keep this open in another tab while you read the other documents. Every term is
explained the way you'd explain it to a smart friend, not the way a textbook
would.

## The big pieces

- **Frontend** — The part you *see and click* in the web browser. Buttons,
  forms, tables, dashboards. Built with **React**.
- **Backend** — The part you *don't* see. It runs on a server, holds the
  business rules, talks to the database, and answers the frontend's requests.
  Built with **Node.js + Express**.
- **Database** — The organized filing cabinet where all data is permanently
  stored (employees, grades, users). We use **PostgreSQL**.
- **API (Application Programming Interface)** — The "menu" the backend offers.
  The frontend orders items off the menu ("give me the employee list"), the
  backend cooks and returns them. Communication happens over the internet using
  **HTTP** (the same protocol your browser uses).
- **Server** — A computer (yours now, a rented Ethio Telecom VPS later) that
  keeps the backend and database running so users can reach them.
- **VPS (Virtual Private Server)** — A slice of a powerful computer you rent,
  reachable over the internet. Your production home later.

## Languages & tools

- **JavaScript** — The programming language browsers understand.
- **TypeScript** — JavaScript with a *safety net*. It checks that you're using
  data correctly (e.g. not treating a number like text) **before** the program
  runs, catching many bugs early. We use it everywhere.
- **Node.js** — Lets us run JavaScript/TypeScript on a server, not just in a
  browser. Our backend runs on it. We standardize on **Node.js 24 LTS**.
- **Vite** — A tool that runs the frontend while we build it and packages it for
  release. Fast.
- **React** — A library for building user interfaces out of reusable "components"
  (a component = a self-contained piece of screen, like a "Button" or a
  "StudentTable").
- **Express** — A small framework that makes it easy to build the backend's API.
- **Prisma** — An **ORM** (see below). It lets us talk to the PostgreSQL
  database using clean TypeScript instead of raw database language.
- **ORM (Object-Relational Mapper)** — A translator between your code and the
  database. You write `user.create(...)` in TypeScript; it writes the actual
  database command for you, safely.
- **PostgreSQL** — A powerful, free, industry-standard database. Trusted by
  banks and governments.

## Concepts you'll meet a lot

- **CRUD** — Create, Read, Update, Delete. The four basic things you do to any
  record. "Employee CRUD" means adding, viewing, editing, and removing employees.
- **Migration** — A version-controlled recipe that changes the database's
  structure (e.g. "add a phone_number column"). Migrations let the database
  evolve safely and identically on every machine.
- **Seed script** — Code that fills a fresh database with starter data (e.g. the
  first admin user, the default grading scale) so the system is usable immediately.
- **Schema** — The *shape* of the database: what tables exist, what columns they
  have, how they connect.
- **Endpoint** — One specific item on the API menu, identified by a web address
  and a verb, e.g. `POST /api/v1/employees` = "create an employee".
- **JWT (JSON Web Token)** — A tamper-proof digital wristband handed to you when
  you log in. You show it on every request to prove who you are.
- **Access token / Refresh token** — The access token is a *short-lived*
  wristband (minutes). The refresh token is a *longer-lived* pass used to get a
  new wristband without re-typing your password.
- **RBAC (Role-Based Access Control)** — Permission by job title. An
  "Instructor" can enter marks; a "Registrar" can publish grades. Your role
  decides your buttons.
- **Permission** — A single fine-grained ability, e.g. `grade:approve`. Roles
  are bundles of permissions.
- **Hashing** — A one-way scramble. We store a scrambled version of passwords so
  that even if the database leaks, nobody learns the real passwords.
- **Validation** — Checking that incoming data is sane and safe (e.g. email
  looks like an email, salary isn't negative) **before** we trust it.
- **Middleware** — Small checkpoints a request passes through on the way in
  (e.g. "are you logged in?", "are you allowed?", "log this request").
- **Audit log** — A permanent diary of important actions: who did what, when,
  and what changed. Critical for a government-facing institution.
- **Environment variable** — A setting kept *outside* the code (like a database
  password) so secrets never live in the codebase. Stored in a `.env` file.
- **Repository (repo)** — The project's folder tracked by **Git**.
- **Git** — A time machine + collaboration tool for code. Every change is saved
  as a "commit" you can go back to.

## Architecture layers (you'll see these in the backend)

- **Controller** — Receives a web request, hands off the real work, returns the
  reply. It is a *receptionist*, not a *worker*.
- **Service** — Where the actual business rules live ("a grade can only be
  approved after it is submitted"). The *worker*.
- **Repository / Data layer** — The only place that talks to the database. If we
  ever change databases, only this layer changes.
- **Validation layer** — Defines and enforces the shape of acceptable data (using
  **Zod**).
- **Zod** — A TypeScript tool for describing "what valid data looks like" once,
  and reusing that description on both frontend and backend.

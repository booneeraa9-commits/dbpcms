# 03 — System Architecture (The Big Picture)

## 1. The 30-second mental model

```
   YOU (browser)                    THE SERVER
   ┌───────────────┐   HTTPS   ┌──────────────────────────────┐
   │  Frontend     │ ────────► │  Backend API (Node + Express) │
   │  React app    │ ◄──────── │  ┌────────────────────────┐   │
   │  (what users  │   JSON    │  │ Controller  (reception)│   │
   │   see/click)  │           │  │ Service     (rules)    │   │
   └───────────────┘           │  │ Repository  (db access)│   │
                               │  └───────────┬────────────┘   │
                               │              │ Prisma          │
                               │      ┌───────▼────────┐        │
                               │      │  PostgreSQL DB │        │
                               │      └────────────────┘        │
                               │      ┌────────────────┐        │
                               │      │ File storage   │        │
                               │      │ (local → cloud)│        │
                               │      └────────────────┘        │
                               └──────────────────────────────┘
```

- The **frontend** never touches the database directly. Ever. It only asks the
  backend through the API. This is a security cornerstone.
- The **backend** is split into layers so each piece has one job (see §3).
- **Prisma** is the safe translator between backend code and PostgreSQL.

## 2. Why this shape (and not one big program)

A "monolith split into clean layers" is the right choice for you because:

- It is **simple to run** (one backend, one frontend, one database) — perfect
  for a solo/small team on a single VPS.
- It is **cheap to host** — no need for the complexity/cost of microservices.
- It is **modular inside**: each feature (employees, grading) lives in its own
  self-contained folder ("module"). New modules (finance, library) are added as
  new folders without touching existing ones. You get most benefits of
  microservices without the operational pain.

> I considered and **rejected microservices** for V1: they'd multiply hosting
> cost and operational complexity far beyond what a college of this size needs.
> The clean-layered modular monolith can serve thousands of users on one decent
> VPS, and can be split later *if* a specific module ever needs it. (See doc 13.)

## 3. Backend layers — one job each

A request to "approve a grade" flows like this:

1. **Middleware** (checkpoints): Is the token valid? Does this user have the
   `grade:approve` permission? Is the request within rate limits? Log it.
2. **Controller**: reads the request, calls the right service, formats the reply.
   *No business logic here.*
3. **Validation layer (Zod)**: rejects malformed input before the service runs.
4. **Service**: the brain. "Only a *submitted* grade can be approved; approving
   it records who/when; if this is the last approval, trigger the next workflow
   step." Writes an **audit log** entry. Wrapped in a **database transaction** so
   it's all-or-nothing.
5. **Repository**: the only code that runs the actual Prisma/DB queries.
6. **Reply** travels back out through the layers in the standard envelope.

Benefits: each layer is small, testable in isolation, and replaceable. Business
logic is never trapped inside a controller (your explicit requirement).

## 4. Cross-cutting concerns (used by every module)

These live in a shared `core`/`common` area, built once and reused:

- **Auth & RBAC** — verify identity and permissions.
- **Error handling** — one central handler; users get safe messages, we get full
  detail in logs.
- **Structured logging** — machine-readable logs (JSON) for auth, errors, and
  security events.
- **Audit logging** — the "who changed what" diary.
- **Config** — reads `.env`, validates it on startup (app refuses to start with
  a bad config — fail fast, fail loud).
- **File storage abstraction** — a single `StorageProvider` interface. V1 has a
  `LocalStorageProvider`; later a `S3StorageProvider` is dropped in with **zero
  changes to business logic**. This is the "swap storage later" requirement.
- **Response & pagination helpers** — so every endpoint replies in the same shape.
- **Notification service** — writes in-app notifications now; can send email/SMS
  later behind the same interface.

## 5. How future modules plug in (the extensibility promise)

Adding "Library" later means:
1. Add a `library` folder under modules (its own controller/service/repo/routes).
2. Add its tables via a new **migration** (existing tables untouched).
3. Add its **permissions** to the RBAC seed.
4. Register its routes under `/api/v1/library`.
5. Add its screens as a new frontend feature folder.

Nothing in employees or grading needs to change. That is what "loosely coupled"
buys you.

## 6. Environments

- **Local (now):** everything on your Windows laptop. PostgreSQL runs in
  **Docker** (a lightweight sandbox) so you don't pollute your machine — I'll
  walk you through it in the setup guide. File storage = a local folder.
- **Production (later, Ethio Telecom VPS):** same code, different `.env`.
  PostgreSQL on the VPS (or a managed instance), file storage still local at
  first (as you chose), swappable to object storage later. **No code changes to
  move between environments** — only configuration.

## 7. Non-functional targets (from your spec, made concrete)

- Handle **hundreds of concurrent users** on a modest VPS via connection
  pooling, pagination everywhere, and DB indexes on every column we filter/sort.
- Page loads feel instant for common screens (server pagination + client caching
  with TanStack Query).
- All timestamps stored in **UTC**, shown in **Africa/Addis_Ababa**.
- Automated, tested **backups**; documented **restore** procedure.

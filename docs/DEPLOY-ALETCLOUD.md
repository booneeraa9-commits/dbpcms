# Deploying DBPCMS to AletCloud (App Hosting + Managed Database)

AletCloud (https://aletcloud.com) is an Ethiopian cloud provider that bills in **ETB via
Chapa** — no forex, no international cards. This guide hosts DBPCMS on their **App Hosting**
(runs your app from GitHub, like Render) + **Managed Database** (PostgreSQL).

> **Verified before delivery:** the production build + startup + login + QR verification were
> all run with an AletCloud-style environment (only `PUBLIC_APP_URL` set, no Render variable).
> The decoded QR pointed at `https://dbpcms.aletcloud.app/verify?code=...` — no localhost.

---

## 💰 Cost plan (start FREE, upgrade when the college pays)

| Stage | App Hosting | Managed Database | Total /month |
|-------|-------------|------------------|--------------|
| **Demo (now)** | Solo — **FREE** (256MB) | Solo — **FREE** (PostgreSQL) | **0 ETB** 🎉 |
| **Small production** | Pro — 360 ETB (512MB) | Pro — 150 ETB (5GB + backups) | **~510 ETB (~$4)** |
| **Bigger** | Ultra — 1,440 ETB | Ultra — 500 ETB | ~1,940 ETB |

**Money-saving tips**
1. Use the **FREE** App Hosting + FREE Managed DB for the demo. Pay nothing until the college commits.
2. **Skip Object Storage** for now — uploaded files sit on the app's own disk. Add the 50 ETB tier only when you have many files.
3. **Skip a paid domain** for the demo — use the free AletCloud subdomain. Buy `dbpcms.donnabarbar.edu.et` only when going official.
4. **Right-size RAM.** Node + the build can be memory-hungry; if the FREE 256MB app crashes or is very slow, jump to **Pro (512MB)** — don't over-buy the big tiers for one college.
5. **Alternative to save more later:** run everything (app + PostgreSQL) on ONE **Cloud VPS Nano (2,400 ETB)** with Docker instead of separate App Hosting + DB. Cheaper per-resource, but you maintain it. (See DEPLOY-VPS.md.)

---

## STEP 1 — Push the latest code to GitHub

```bash
cd ~/projects/dbpcms
git add -A
git commit -m "AletCloud deploy config"
git push
```

---

## STEP 2 — Create the Managed Database (PostgreSQL)

1. Sign in to AletCloud → top up your wallet via **Chapa** (for the FREE tier you may not need to).
2. **Managed Databases** → **Solo (Free)** → engine **PostgreSQL** → **Create**.
3. When it's ready, open it and copy the **connection string** (looks like
   `postgresql://USER:PASSWORD@HOST:5432/DBNAME`). Keep it safe — you'll paste it in Step 3.

---

## STEP 3 — Create the App (App Hosting)

1. **App Hosting** → **Solo (Free)** → **Create app** → connect your **GitHub** → pick `dbpcms`, branch `main`.
2. Set the **build** and **start** commands (copy exactly — these are also in `aletcloud.json`):
   - **Build command:**
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm build:prod
     ```
   - **Start command:**
     ```
     pnpm start:prod
     ```
3. Set **Node version** to `24.18.1` (there's usually a runtime/Node version field).
4. **Health check path:** `/health`

---

## STEP 4 — Set the environment variables

In the app's **Environment / Variables** section, add these. (Do NOT commit secrets to git —
type them here.)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the connection string from Step 2 |
| `PUBLIC_APP_URL` | your app's public URL, e.g. `https://dbpcms.aletcloud.app` (see note) |
| `CORS_ORIGINS` | same as `PUBLIC_APP_URL` |
| `JWT_ACCESS_SECRET` | a long random string, 32+ chars |
| `JWT_REFRESH_SECRET` | a DIFFERENT long random string, 32+ chars |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL` | `7d` |
| `STORAGE_ROOT` | `./storage` |
| `SEED_ADMIN_EMAIL` | `booneeraa9@gmail.com` |
| `SEED_ADMIN_PASSWORD` | a strong first-login password |
| `LOG_LEVEL` | `info` |

> **Generate a strong secret** on your machine:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Run it twice — once for each JWT secret.

> **About `PUBLIC_APP_URL`:** this is what QR codes on printed profiles/transcripts encode, so
> it MUST be the address people actually visit. If you don't know the final URL until after the
> first deploy, deploy once, copy the URL AletCloud gives you, then set `PUBLIC_APP_URL` (and
> `CORS_ORIGINS`) to it and redeploy.

---

## STEP 5 — Deploy & watch the logs

Click **Deploy**. In the logs you'll see, in order:
```
corepack ... pnpm install ... pnpm build:prod
[copy-web-to-api] Copied frontend -> apps/api/public
[start] Database reachable at HOST:5432
Applying migration ... (13 migrations)
Seeding complete. ✔
DBPCMS API listening ...
```
When it shows healthy, open your app URL. 🎉

---

## STEP 6 — Log in & finish

1. Open the app URL → log in with `SEED_ADMIN_EMAIL` + the `SEED_ADMIN_PASSWORD` you set.
2. You'll be forced to change the password — do it.
3. Print an employee profile or transcript → **scan the QR with your phone** → it should open
   `https://<your-app-url>/verify?...`. ✅

---

## Everyday operations

- **Deploy an update:** `git push` → AletCloud rebuilds automatically (migrations + seed run each deploy; both are safe to re-run).
- **Backups:** the paid Managed Database tiers include automated backups. On free, run your own with `pnpm backup` pointed at the AletCloud database URL.
- **Custom domain later:** register `dbpcms.donnabarbar.edu.et` in AletCloud **Domains**, point it at the app, then set `PUBLIC_APP_URL` + `CORS_ORIGINS` to it.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Logs stall at `Waiting for database ...` | Wrong `DATABASE_URL`, or the DB isn't ready yet. Recopy the connection string from the database page. |
| App builds then crashes / very slow | 256MB free RAM may be too small. Upgrade App Hosting to **Pro (512MB)**. |
| Login works but QR shows the wrong URL | Set `PUBLIC_APP_URL` to your real app URL and redeploy. |
| Login fails right after deploy | Ensure `CORS_ORIGINS` equals your app URL (no trailing slash). |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Commit an up-to-date `pnpm-lock.yaml` (the build uses `--frozen-lockfile`). |

---

## Why no code changes were needed

DBPCMS already:
- reads `PORT`, `DATABASE_URL`, and all config from environment variables,
- builds to a **single service** (API serves the React app),
- waits for the database on startup, runs migrations + seed automatically,
- builds QR/verification URLs from a **configurable** `PUBLIC_APP_URL` (auto-detects on Render;
  set manually on AletCloud).

So the same codebase runs on Render, AletCloud, or a self-managed VPS — you only change config.
```
```

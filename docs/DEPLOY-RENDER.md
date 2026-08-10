# Deploying DBPCMS to Render — Step by Step

This guide gets DBPCMS **live on the public internet today**, using [Render](https://render.com).
Everything here has been **built and tested end-to-end** before being handed to you:
the production build compiles, migrations + seed run, the API serves the React app, and
admin login works — all as one service.

> **What you get:** one HTTPS URL like `https://dbpcms.onrender.com` that runs the WHOLE
> system (frontend + backend + database). No servers to manage, HTTPS is automatic.

---

## ⚠️ Read this first — free vs. paid

Render's **free tier is perfect for a DEMO** you can show the college, but has two limits:

1. **The web service sleeps** after ~15 minutes of no visitors, and takes ~30–60 seconds
   to wake up on the next visit. Annoying for daily use, fine for demos.
2. **The free database is deleted after 90 days.**

👉 For a **real, always-on college system**, upgrade the web service to **Starter (~$7/mo)**
and the database to a paid plan (**~$7/mo**). You change one word (`plan:`) in `render.yaml`
or flip it in the dashboard. For now, free is great to see it working.

This Render deployment is a great **showroom / demo**. The proper long-term home for real
student data is still the Ethio Telecom VPS (see `DEPLOY-VPS.md` when ready).

---

## What was added to the project for hosting

You don't need to do anything with these — they're already in the code. Listed so you know
what changed:

| File | Purpose |
|------|---------|
| `render.yaml` | The **blueprint** — tells Render to create the database + web service and wire them together. |
| `scripts/copy-web-to-api.mjs` | Copies the built React app into the API so ONE service serves everything. |
| `package.json` → `build:prod` | Builds shared → web → api and copies the frontend in. |
| `package.json` → `start:prod` | On launch: runs DB migrations, seeds baseline data, then starts the API. |
| `apps/api/src/app.ts` | Now serves the built frontend + SPA fallback when running in production. |

---

## STEP 1 — Push the latest code to GitHub

Render deploys from your GitHub repo, so it must have these new files.

```bash
cd ~/projects/dbpcms
git add -A
git commit -m "Add Render deployment (single-service prod build)"
git push
```

> Your repo is `https://github.com/booneeraa9-commits/dbpcms.git`. If `git push` asks for
> credentials, use your GitHub username + a Personal Access Token.

---

## STEP 2 — Create a Render account

1. Go to **https://render.com** and click **Get Started**.
2. Sign up with **GitHub** (easiest — it lets Render see your repos).
3. When asked, **authorise Render** to access your GitHub, and grant access to the
   `dbpcms` repository (you can pick "only select repositories" → choose `dbpcms`).

---

## STEP 3 — Deploy with the Blueprint

1. In the Render dashboard click **New +** (top right) → **Blueprint**.
2. Select your **`dbpcms`** repository from the list.
3. Render reads `render.yaml` and shows you what it will create:
   - a PostgreSQL database named **`dbpcms-db`**
   - a web service named **`dbpcms`**
4. It will ask you to fill in the two secret values marked `sync: false`:
   - **`SEED_ADMIN_PASSWORD`** → type a STRONG first admin password (you'll be forced to
     change it on first login anyway). Example: a long passphrase only you know.
   - **`CORS_ORIGINS`** → **leave blank for now**; we set it in Step 5 after we know the URL.
5. Click **Apply** / **Create**. Render starts building. ☕ First build takes ~3–6 minutes.

---

## STEP 4 — Watch the first deploy

1. Click into the **`dbpcms`** service → **Logs** tab.
2. You'll see, in order:
   - `pnpm install` and the build (`build:prod`) running,
   - `All migrations have been successfully applied.` (the tables get created),
   - `Seeding complete. ✔` (permissions, roles, admin, grading defaults created),
   - `DBPCMS API listening on ...` — **it's up!**
3. At the top of the service page you'll see its public URL, e.g.
   **`https://dbpcms.onrender.com`**. Copy it.

> **Health check:** Render pings `/health` to confirm the app is alive. When the service
> shows a green **"Live"** badge, you're good.

---

## STEP 5 — Set CORS_ORIGINS to the real URL (one-time)

Because the frontend and API share the same URL, CORS just needs that one origin.

1. In the **`dbpcms`** service → **Environment** tab.
2. Find **`CORS_ORIGINS`** and set it to your service URL **with no trailing slash**, e.g.
   `https://dbpcms.onrender.com`
3. Click **Save Changes**. Render redeploys automatically (~1–2 min).

> If you later add a custom domain (Step 7), add it here too, comma-separated:
> `https://dbpcms.onrender.com,https://sms.donnabarbar.edu.et`

---

## STEP 6 — Log in and finish setup

1. Open your URL (e.g. `https://dbpcms.onrender.com`).
2. Log in with:
   - **Email:** `booneeraa9@gmail.com`
   - **Password:** the `SEED_ADMIN_PASSWORD` you set in Step 3.
3. You'll be **forced to change the password** — do it. 🎉 **You are LIVE.**
4. Go to **System Settings** and confirm the institution name, ID prefixes, etc.

---

## STEP 7 — (Optional) Add a custom domain

To use a nice address like `sms.donnabarbar.edu.et` instead of `...onrender.com`:

1. In the **`dbpcms`** service → **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Render shows you a DNS record (a CNAME) to add.
3. In your domain's DNS settings (with your registrar / Ethio Telecom), add that record.
4. Wait for it to verify — Render issues the HTTPS certificate automatically. 🔒
5. Add the new domain to `CORS_ORIGINS` (Step 5).

---

## Everyday operations

- **Deploy an update:** just `git push`. Render rebuilds and redeploys automatically
  (`autoDeploy: true`). Migrations and seed run every deploy (both are safe to re-run).
- **See logs:** service → **Logs**.
- **Restart:** service → **Manual Deploy** → **Restart**.
- **Backups:** on a **paid** database, Render takes automatic daily backups. On free, take
  your own with `pnpm backup` pointed at the Render database URL (find it in the database's
  **Connect** tab → "External Connection").

---

## Troubleshooting

| Symptom | Cause & fix |
|--------|-------------|
| First visit is slow / spins for ~40s | Free tier woke from sleep. Normal. Upgrade to Starter to stop this. |
| Login page loads but login fails | Check `CORS_ORIGINS` exactly matches your URL (no trailing slash). Redeploy. |
| Build fails on `pnpm install` | Ensure `pnpm-lock.yaml` is committed and up to date; the build uses `--frozen-lockfile`. |
| "DATABASE_URL is required" | The blueprint wires this automatically; if you created the service manually, add it from the database's Connect tab. |
| A page refresh gives 404 | Shouldn't happen — the SPA fallback is built in and tested. If you customised routing, ensure non-`/api` GETs return `index.html`. |
| Uploaded files vanish after redeploy | Files live on the persistent disk (`/var/data`, configured in `render.yaml`). Ensure the disk is attached. |

---

## Verified before delivery ✅

The following were run and confirmed in a production configuration (`NODE_ENV=production`,
no `.env` file, env injected like Render does):

- `pnpm install --frozen-lockfile` — OK
- `pnpm build:prod` — shared + web + api built; frontend copied into `apps/api/public`
- `prisma migrate deploy` — all 13 migrations applied
- `prisma/seed.ts` — 38 permissions, 8 roles, admin, 5 settings, grading defaults seeded
- `node apps/api/dist/main.js` — server up on port 10000, one process
- `GET /health` → JSON OK
- `GET /` and `GET /transcripts` → served the React app (SPA deep-links work)
- `GET /assets/*.js` → correct type + long-term caching
- `GET /api/v1/nonexistent` → JSON 404 (API errors not swallowed by the SPA)
- `POST /api/v1/auth/login` → success, returned roles + permissions, set a
  `Secure; HttpOnly; SameSite=Lax` refresh cookie (correct for HTTPS)
```
```

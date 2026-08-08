# DBPCMS — Local Setup Walkthrough (WSL 2 + Ubuntu)

Follow this **one stage at a time**. After each stage, check the "You should
see" note. If it doesn't match, STOP and ask before continuing.

Golden rule: **all project commands run inside the Ubuntu terminal**, not
Windows PowerShell.

---

## STAGE 0 — Open the Ubuntu terminal
- Click the Windows Start menu, type **Ubuntu**, press Enter.
- A black terminal window opens with a prompt like `youruser@PC:~$`.
- This is your workshop. Keep it open.

**You should see:** a prompt ending in `$`.

---

## STAGE 1 — Install Node.js 24 INSIDE Ubuntu (via nvm)

Even though Node is on Windows, WSL needs its own copy. `nvm` is the safe,
standard way to install Node in Linux without admin headaches.

Run these lines one by one (copy, paste, Enter):

```bash
# 1. Install nvm (the Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 2. Load nvm into your current terminal (or just close & reopen Ubuntu)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Install and use Node 24 (the LTS our project targets)
nvm install 24
nvm use 24
nvm alias default 24

# 4. Check it worked
node -v
```

**You should see:** `v24.x.x` (some 24 version).

---

## STAGE 2 — Turn on pnpm (our package manager)

Node 24 includes a helper called corepack that enables pnpm in one step.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

**You should see:** a version like `10.x` or `11.x`.

> If `corepack enable` says "permission denied", run:
> `sudo corepack enable` and type your Ubuntu password.

---

## STAGE 3 — Tell Git who you are (first time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
git config --global init.defaultBranch main
```

Use the same email you'll use on GitHub.

**You should see:** nothing (no output means success).

---

## STAGE 4 — Connect VS Code to Ubuntu (WSL)

1. Open **VS Code** (from Windows).
2. Press `Ctrl+Shift+X` to open Extensions.
3. Search for **WSL** (publisher: Microsoft) and click **Install**.
4. Press `F1`, type **WSL: Connect to WSL**, press Enter.
5. A new VS Code window opens. Bottom-left corner shows a green box:
   **WSL: Ubuntu**. That means VS Code is now "inside" Ubuntu.

**You should see:** green `>< WSL: Ubuntu` in the bottom-left of VS Code.

---

## STAGE 5 — Create your project folder in Ubuntu

Back in the Ubuntu terminal:

```bash
# Make a place for your projects in your Linux home folder
mkdir -p ~/projects
cd ~/projects
pwd
```

**You should see:** `/home/<youruser>/projects`

> IMPORTANT: keep the project in the **Linux** home (`~/projects`), NOT in
> `/mnt/c/...` (your Windows drive). Linux-side is much faster for Node.

---

## STAGE 6 — Get the code from GitHub
(Do the GitHub steps your assistant gives you, then:)

```bash
cd ~/projects
git clone <YOUR_REPO_URL> dbpcms
cd dbpcms
ls
```

**You should see:** folders `apps  docs  packages` and files like
`package.json`, `docker-compose.yml`, `README.md`.

---

## STAGE 7 — Install project dependencies

```bash
cd ~/projects/dbpcms
pnpm install
```

This downloads all the code libraries. Takes a minute the first time.

**You should see:** it ends with something like `Done in ...s`.

---

## STAGE 8 — Create your backend settings file

```bash
cp apps/api/.env.example apps/api/.env
```

**You should see:** nothing (success). This file holds local settings/secrets
and is never shared.

---

## STAGE 9 — Start the database (PostgreSQL via Docker)

Make sure **Docker Desktop is running** (open it from Windows; wait until it
says "Engine running"). Then:

```bash
pnpm db:up
docker ps
```

**You should see:** a container named `dbpcms_db` in the `docker ps` list.

---

## STAGE 10 — Run the project!

```bash
pnpm dev
```

This starts BOTH the backend and the frontend together.

**You should see:** messages that the API is on port 4000 and the web app on
port 5173.

Then open your Windows browser to:
- Frontend: **http://localhost:5173**  → the DBPCMS dashboard
- Backend health: **http://localhost:4000/health** → JSON with `"status":"ok"`

On the dashboard, the **Backend status** card should say **Connected**.

To stop: press `Ctrl+C` in the terminal. To stop the database: `pnpm db:down`.

---

## If anything goes wrong
Copy the EXACT error text and send it to your assistant. Note which stage you
were on. Almost every issue is a quick fix.

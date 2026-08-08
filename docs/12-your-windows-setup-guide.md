# 12 — Your Windows Setup Guide (for Phase 1)

**Do NOT do this yet** — read it so you know what's coming. We'll do it together,
one command at a time, when you approve Phase 1. Nothing here changes your
computer permanently or is hard to undo.

## What we'll install and why (plain language)

| Tool | What it is | Why you need it |
|------|-----------|-----------------|
| **VS Code** | A free code editor by Microsoft | Where you'll read/edit the project. Friendly for beginners. |
| **Node.js 24 LTS** | Runs our JavaScript/TypeScript code | The backend runs on it; the frontend tools need it. |
| **Git** | Code time-machine | Saves every version of your work; required for teamwork/backup. |
| **Docker Desktop** | Runs mini "sandbox" computers | Runs PostgreSQL cleanly without cluttering Windows. |
| **pnpm** | A package manager | Installs the code libraries efficiently (great for monorepos). |

> **Why Docker for the database?** Installing PostgreSQL directly on Windows and
> configuring it is fiddly and easy to break. Docker gives you a clean, disposable
> PostgreSQL with **one command**, identical to what the VPS will run later. This
> is the single biggest headache-saver for a beginner. (If your machine can't run
> Docker, we have a fallback — tell me and I'll adapt.)

## Recommended install method: `winget` (built into Windows 10/11)

`winget` is Microsoft's app installer. Open **PowerShell** (search "PowerShell"
in Start) and we'll run, one by one:

```powershell
winget install --id Microsoft.VisualStudioCode -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
winget install --id Docker.DockerDesktop -e
```

Then enable pnpm (comes with Node 24 via corepack):
```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

## Checking it worked

Close and reopen PowerShell, then:
```powershell
node -v      # expect v24.x
git --version
docker --version
pnpm -v
```
If any command is "not recognized", restart the computer once (PATH needs a
refresh) and try again. If it still fails, send me the exact message and we'll fix it.

## VS Code extensions we'll add (I'll guide you)
- ESLint, Prettier (auto-format & catch mistakes)
- Prisma (database schema help)
- Tailwind CSS IntelliSense
- GitLens (see history inline)

## A few habits that will save you
- **Save often**, and let VS Code auto-format on save (we'll set that up).
- After I hand you code, you'll usually just run a command I give you and tell me
  what you see. Copy any red error text back to me verbatim.
- Never share your `.env` file or paste its contents publicly — it holds secrets.

## What Phase 1 will feel like
You'll run ~10 commands total, and by the end: a browser tab shows a blank
DBPCMS dashboard, and a `/health` page says the backend is alive. That's the
moment the skeleton is standing — then we start adding features.

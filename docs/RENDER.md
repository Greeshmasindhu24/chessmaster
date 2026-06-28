# Deploy ChessMaster Pro on Render.com

This guide covers pushing to GitHub and going live on [Render](https://render.com).

## Before you deploy

1. Create a [GitHub](https://github.com) account (if needed).
2. Create a [Render](https://render.com) account and connect GitHub.

## Step 1 â€” Push code to GitHub

From PowerShell, in your repo root (`GNAMAMAI` or `ChessMasterPro`):

```powershell
cd F:\SindhuReddy\GNAMAMAI

# First time only â€” initialize if not already a git repo with remote
git status

# Stage ChessMaster Pro (never commit secrets)
git add ChessMasterPro/
git status

# Make sure these are NOT staged:
#   ChessMasterPro/.env
#   ChessMasterPro/frontend/.env.local
#   ChessMasterPro/data/
#   ChessMasterPro/backend/.venv/
#   ChessMasterPro/frontend/node_modules/

git commit -m "Add ChessMaster Pro with AI, online play, and billing"

# Create repo on GitHub (replace YOUR_USER and REPO_NAME)
# Then add remote â€” first time only:
git remote add origin https://github.com/YOUR_USER/REPO_NAME.git

# Push
git branch -M main
git push -u origin main
```

If the repo already has a remote:

```powershell
git add ChessMasterPro/
git commit -m "Update ChessMaster Pro for Render deployment"
git push origin main
```

## Step 2 â€” Database (required â€” Render free = 1 DB only)

Render **free tier allows only one PostgreSQL database per account**. If Blueprint fails with  
`cannot have more than one active free tier database`, use **Neon** (free) instead:

1. Go to [neon.tech](https://neon.tech) â†’ sign up â†’ **New Project** â†’ name it `chessmaster`
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. You will paste this as `DATABASE_URL` on **chessmaster-api** in Render (Step 3)

**Alternative:** Delete an unused free Postgres in [Render Dashboard â†’ Databases](https://dashboard.render.com) if you don't need it, then redeploy the Blueprint with a database block (older `render.yaml`).

## Step 3 â€” Deploy on Render (Blueprint)

1. Open [Render Dashboard](https://dashboard.render.com) â†’ **New** â†’ **Blueprint**.
2. Connect your GitHub repo.
3. If the repo root is `GNAMAMAI`, set **Root Directory** to `ChessMasterPro` when prompted (or edit paths in `render.yaml`).
4. Render creates **chessmaster-api** and **chessmaster-web** (no database â€” you add `DATABASE_URL` manually).

5. Set **environment variables**:

### chessmaster-api

| Variable | Value |
|----------|---------|
| `DATABASE_URL` | Your Neon connection string (from Step 2) |
| `FRONTEND_URL` | `https://chessmaster-web.onrender.com` |
| `CORS_ORIGINS` | `["https://chessmaster-web.onrender.com"]` |

(`SECRET_KEY`, `REDIS_ENABLED` come from the blueprint.)

### Email verification (SMTP — required for inbox delivery)

Without SMTP, registration still works but **no email is sent**. The API returns a `verify_url` in the JSON response and the UI shows an amber banner with a clickable link.

Add these on **chessmaster-api** (Render Dashboard → chessmaster-api → Environment):

| Variable | Example (Gmail) |
|----------|-----------------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your@gmail.com` |
| `SMTP_PASSWORD` | `xxxx xxxx xxxx xxxx` (16-char Google App Password) |
| `SMTP_FROM` | `your@gmail.com` |

**Gmail setup (copy-paste checklist):**

1. Google Account → **Security** → enable **2-Step Verification**
2. Security → **App passwords** → app: Mail, device: Other → name it `ChessMaster Render`
3. Copy the 16-character password (spaces optional)
4. Paste env vars above on **chessmaster-api**, then **Manual Deploy** → Deploy latest commit
5. Register a new account (or Settings → Resend verification) and check inbox + spam

**Verify send works:** Render → chessmaster-api → **Logs**. After resend you should see `Email sent to=...` (not `Email not sent (SMTP not configured)`). If SMTP is set but login fails, logs show `Failed to send email`.

### chessmaster-web

| Variable | Value |
|----------|---------|
| `VITE_API_URL` | `https://chessmaster-api.onrender.com` |

6. **Redeploy** both services after setting env vars (especially `DATABASE_URL` and `VITE_API_URL`).

## Step 3b — Database migrations (Neon / PostgreSQL)

On first deploy (or after Phase 1 auth/profile changes), apply SQL migrations against your production database.

**Option A — Neon SQL Editor** (easiest):

1. Open your Neon project → **SQL Editor**.
2. Run the contents of `database/migrations/001_initial.sql` (skip if tables already exist from `create_all`).
3. Run `database/migrations/002_phase1_foundation.sql` (idempotent — safe to re-run).
4. Run `database/migrations/003_profile_demographics.sql` (adds `date_of_birth`, `gender` on `profiles` — idempotent).

**Fresh Neon database:** You can skip 001–003 if tables do not exist yet — the API runs `create_all` on startup and creates the full schema from SQLAlchemy models. Run migrations when upgrading an **existing** production database or if `create_all` already ran with an older schema.

**Option B — `psql` from your PC:**

```powershell
cd F:\SindhuReddy\GNAMAMAI\ChessMasterPro
$DB = "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
psql $DB -f database\migrations\001_initial.sql
psql $DB -f database\migrations\002_phase1_foundation.sql
psql $DB -f database\migrations\003_profile_demographics.sql
```

After migrations, restart **chessmaster-api** and confirm `/api/v1/health` is healthy.

## Step 3c — View or clear production users (PostgreSQL)

Use the admin script instead of manual SQL when you need to wipe test accounts on production.

**Database URL:** Use the same `DATABASE_URL` as **chessmaster-api** — Render Postgres (`dpg-*`) or a dedicated Neon project. Do **not** use shared Supabase (APAD / EnterpriseKnowledgeBot); that database has a different schema and the script will refuse to run.

1. Copy `DATABASE_URL` from Render → **chessmaster-api** → **Environment** (Render Postgres external URL or Neon connection string from Step 2).
2. From PowerShell:

```powershell
cd F:\SindhuReddy\GNAMAMAI\ChessMasterPro

# List emails and usernames (no changes)
$env:DATABASE_URL = "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
.\scripts\clear-users-postgres.ps1 --list-only

# Delete all users — prompts: type DELETE
.\scripts\clear-users-postgres.ps1

# Skip prompt (automation only — use carefully)
.\scripts\clear-users-postgres.ps1 --confirm
```

The script refuses `localhost` URLs unless you pass `--force`. It deletes child tables (games, sessions, profiles, etc.) before `users`, matching the local SQLite admin script.

See `scripts/README.md` for more options (`--database-url`, `--force`).

## Step 4 â€” Open your live app

- **Frontend:** `https://chessmaster-web.onrender.com`
- **API docs:** `https://chessmaster-api.onrender.com/docs`
- **Health:** `https://chessmaster-api.onrender.com/api/v1/health`

Register an account on the live site and test AI + online play.

## Manual deploy (without Blueprint)

### Backend â€” Web Service

- **Root Directory:** `ChessMasterPro/backend` (or `backend` if repo root is ChessMasterPro)
- **Runtime:** Docker
- **Health check:** `/api/v1/health`
- Add PostgreSQL from Render dashboard and link `DATABASE_URL`.

### Frontend â€” Static Site

- **Root Directory:** `ChessMasterPro/frontend`
- **Build:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Rewrite rule:** `/*` â†’ `/index.html` (SPA routing)

## Notes

- **Free tier:** Services spin down after inactivity; first load may take 30â€“60 seconds.
- **WebSockets:** Online play uses `wss://your-api.onrender.com/api/v1/ws/game` â€” works on Render web services.
- **Redis:** Optional; default is in-memory cache (`REDIS_ENABLED=false`).
- **Secrets:** Never commit `.env` files. Set `SECRET_KEY` in Render only.

## Billing tiers (AI + Online)

| Product | Free | Paid unlocks |
|---------|------|----------------|
| **AI** | Beginner | Intermediate $4.99, Advanced $9.99, Expert $14.99 |
| **Online** | Blitz 3+2 | Bullet $4.99, Rapid $9.99, Classical $14.99 |

Dummy test card: `4242 4242 4242 4242`, expiry `12/30`, CVC `123`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend can't reach API | Set `VITE_API_URL` on static site and redeploy |
| CORS errors | Set `CORS_ORIGINS` and `FRONTEND_URL` on API to your static URL |
| 502 on API | Check logs; confirm PostgreSQL is linked |
| WebSocket fails | Use `https://` frontend with `VITE_API_URL=https://...` (not localhost) |


## Troubleshooting sign-in / "Cannot reach server"

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Error mentions `https://chessmaster-api.onrender.com` while you use **http://localhost:5173** | `VITE_API_URL` points at Render; browser blocks cross-origin (CORS) | Set `VITE_API_URL=` (empty) in `frontend/.env.local`, stop Vite, run `.\run_frontend.ps1` and `.\run_backend.ps1` |
| Same error on **https://chessmaster-web.onrender.com** | Free API cold start (~30–60s) or service down | Open `https://chessmaster-api.onrender.com/api/v1/health` once, wait, retry; check Render logs and `DATABASE_URL` |
| Local proxy fails | Backend not on **8001** | Start `.\run_backend.ps1`; confirm `http://localhost:5173/api/v1/health` returns JSON |

**Verify API:** `curl https://chessmaster-api.onrender.com/api/v1/health` should return `"status":"healthy"`.

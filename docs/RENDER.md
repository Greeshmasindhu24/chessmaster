# Deploy ChessMaster Pro on Render.com

This guide covers pushing to GitHub and going live on [Render](https://render.com).

## Before you deploy

1. Create a [GitHub](https://github.com) account (if needed).
2. Create a [Render](https://render.com) account and connect GitHub.

## Step 1 — Push code to GitHub

From PowerShell, in your repo root (`GNAMAMAI` or `ChessMasterPro`):

```powershell
cd F:\SindhuReddy\GNAMAMAI

# First time only — initialize if not already a git repo with remote
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
# Then add remote — first time only:
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

## Step 2 — Deploy on Render (Blueprint)

1. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo.
3. If the repo root is `GNAMAMAI`, set **Root Directory** to `ChessMasterPro` when prompted (or edit paths in `render.yaml`).
4. Render reads `render.yaml` and creates:
   - **chessmaster-db** — PostgreSQL (free tier)
   - **chessmaster-api** — FastAPI backend (Docker)
   - **chessmaster-web** — React static frontend

5. After the first deploy, set these **environment variables** manually:

### chessmaster-api

| Variable | Example |
|----------|---------|
| `FRONTEND_URL` | `https://chessmaster-web.onrender.com` |
| `CORS_ORIGINS` | `["https://chessmaster-web.onrender.com"]` |

(`DATABASE_URL`, `SECRET_KEY`, `REDIS_ENABLED` come from the blueprint.)

### chessmaster-web

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://chessmaster-api.onrender.com` |

6. **Redeploy** both services after setting env vars (frontend must rebuild with `VITE_API_URL`).

## Step 3 — Open your live app

- **Frontend:** `https://chessmaster-web.onrender.com`
- **API docs:** `https://chessmaster-api.onrender.com/docs`
- **Health:** `https://chessmaster-api.onrender.com/api/v1/health`

Register an account on the live site and test AI + online play.

## Manual deploy (without Blueprint)

### Backend — Web Service

- **Root Directory:** `ChessMasterPro/backend` (or `backend` if repo root is ChessMasterPro)
- **Runtime:** Docker
- **Health check:** `/api/v1/health`
- Add PostgreSQL from Render dashboard and link `DATABASE_URL`.

### Frontend — Static Site

- **Root Directory:** `ChessMasterPro/frontend`
- **Build:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Rewrite rule:** `/*` → `/index.html` (SPA routing)

## Notes

- **Free tier:** Services spin down after inactivity; first load may take 30–60 seconds.
- **WebSockets:** Online play uses `wss://your-api.onrender.com/api/v1/ws/game` — works on Render web services.
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

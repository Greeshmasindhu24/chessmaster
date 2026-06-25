# ChessMaster Pro on Windows (native — no Docker, no WSL)

Run the full app with **Python + Node.js only**. SQLite and an in-memory cache are the defaults — no PostgreSQL or Redis install required.

---

## Prerequisites

| Component | Version | Required? |
|-----------|---------|-----------|
| Python    | 3.12 or 3.13 | Yes — [python.org](https://www.python.org/downloads/) (check **Add to PATH**) |
| Node.js   | 20+ | Yes — [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 16+ | Optional — production or multi-user dev |
| Redis / Memurai | 7.x | Optional — shared cache across processes |

**Ports (avoid conflicts with EnterpriseKnowledgeBot):**

| Service  | Port | Notes |
|----------|------|-------|
| Backend  | **8001** | EKB backend often uses 8000 |
| Frontend | **5173** | Vite dev server |
| PostgreSQL | 5433 or 5432 | Only if using Postgres |
| Redis    | 6380 or 6379 | Only if `REDIS_ENABLED=true` |

---

## Quick start (recommended)

```powershell
cd f:\SindhuReddy\GNAMAMAI\ChessMasterPro
copy .env.example .env
.\setup-windows.ps1
```

**Terminal 1 — backend:**

```powershell
.\run_backend.ps1
# or: run_backend.bat
```

**Terminal 2 — frontend:**

```powershell
.\run_frontend.ps1
# or: run_frontend.bat
```

Open http://localhost:5173 — health check: http://localhost:8001/api/v1/health

Expected health response: `database: ok`, `redis: memory` (in-memory cache).

---

## How it works

### SQLite (default database)

`.env.example` sets:

```env
SQLITE_DATABASE_URL=sqlite+aiosqlite:///./data/chessmaster.db
```

The backend creates `data/` and the database file on first start. Schema is applied via SQLAlchemy `create_all` — no manual migration step for SQLite.

To switch to PostgreSQL, remove or comment `SQLITE_DATABASE_URL` and set:

```env
DATABASE_URL=postgresql+asyncpg://chess:chess@localhost:5433/chessmaster
```

Then apply the PostgreSQL schema:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U chess -h localhost -p 5433 -d chessmaster -f database\migrations\001_initial.sql
```

### In-memory cache (default)

With `REDIS_ENABLED=false` (default), game state and matchmaking use an in-process cache. This is fine for single-user local dev and testing on one machine.

For Redis (optional):

```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6380/0
```

Install [Memurai](https://www.memurai.com/) or [Redis for Windows](https://github.com/tporadowski/redis/releases).

### Stockfish (optional)

Download the Windows build from [stockfishchess.org](https://stockfishchess.org/download/) and place the executable at:

```
ChessMasterPro\stockfish\stockfish.exe
```

Set in `.env`: `STOCKFISH_PATH=stockfish/stockfish.exe`

### Local uploads

User uploads (when implemented) go to `uploads/` (`UPLOADS_DIR=uploads` in `.env`).

---

## Manual setup (without scripts)

**Backend:**

```powershell
cd ChessMasterPro\backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ..
copy .env.example .env
cd backend
$env:SQLITE_DATABASE_URL = "sqlite+aiosqlite:///./data/chessmaster.db"
$env:REDIS_ENABLED = "false"
$env:SECRET_KEY = "dev-secret-change-in-production"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**Frontend:**

```powershell
cd ChessMasterPro\frontend
npm install
$env:VITE_API_URL = "http://localhost:8001"
npm run dev
```

---

## PostgreSQL setup (optional)

If you prefer Postgres over SQLite:

1. Install [PostgreSQL for Windows](https://www.postgresql.org/download/windows/) or reuse an existing instance on port 5432.
2. Create database and user (SQL Shell / psql):

```sql
CREATE USER chess WITH PASSWORD 'chess';
CREATE DATABASE chessmaster OWNER chess;
GRANT ALL PRIVILEGES ON DATABASE chessmaster TO chess;
\c chessmaster
GRANT ALL ON SCHEMA public TO chess;
```

3. Apply schema from project root:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U chess -h localhost -p 5432 -d chessmaster -f database\migrations\001_initial.sql
```

4. In `.env`, comment out `SQLITE_DATABASE_URL` and set `DATABASE_URL` to your connection string.

---

## SQLite vs PostgreSQL

| Feature | SQLite (default) | PostgreSQL |
|---------|------------------|------------|
| Auth (register/login) | Yes | Yes |
| Local / online games | Yes | Yes |
| WebSocket multiplayer | Yes (single backend process) | Yes |
| Matchmaking queue | In-memory only | Redis recommended for multi-instance |
| Production deployment | Not recommended | Recommended |
| Manual SQL migration | Not needed (`create_all`) | Use `001_initial.sql` or Alembic |

---

## Troubleshooting

### "Cannot reach server on port 8001"

- Start the backend first: `.\run_backend.ps1`
- Check the terminal for Python errors (wrong Python version, missing venv).
- Ensure nothing else binds port 8001.

### Python 3.14+ / `asyncpg` build errors

Use **Python 3.12 or 3.13** only: `py -3.13 --version`

### Health shows `database: error`

- SQLite: ensure `data/` is writable; delete `data/chessmaster.db` to reset.
- Postgres: verify service is running (`Get-Service postgresql*`) and `DATABASE_URL` port is correct.

### Health shows `redis: error`

Set `REDIS_ENABLED=false` in `.env` to use in-memory cache, or start Redis/Memurai and verify `REDIS_URL`.

---

## Optional: Docker (requires WSL 2)

Docker Desktop on Windows needs WSL 2. If you have WSL installed, you can use the optional Docker path:

```powershell
docker compose up --build -d
```

See the main [README](../README.md) for Docker service URLs.

---

## Script reference

| Script | Purpose |
|--------|---------|
| `setup-windows.ps1` | One-time: `.env`, venv, pip, npm, folders |
| `run_backend.ps1` / `.bat` | Start FastAPI with reload |
| `run_frontend.ps1` / `.bat` | Start Vite dev server |
| `scripts/start-windows.ps1` | Backend starter with Postgres/SQLite preflight |

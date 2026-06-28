# Admin scripts

## Clear local users (SQLite dev)

```powershell
cd F:\SindhuReddy\GNAMAMAI\ChessMasterPro
.\scripts\clear-users.ps1
.\scripts\clear-users.ps1 -y
```

Uses `data/chessmaster.db` or `SQLITE_DATABASE_URL` from `.env`.

## Clear production users (PostgreSQL)

Use this when **chessmaster-web** registration returns **409** / *Email or username already exists* because accounts still exist in the production database.

Requires `psycopg2-binary` (installed automatically by the PowerShell wrapper into `backend\.venv`).

### Which DATABASE_URL to use

**Use the URL from Render → chessmaster-api → Environment → `DATABASE_URL`.**

That value must point at the **ChessMaster** database — one of:

| Source | Host pattern | OK for ChessMaster? |
|--------|--------------|---------------------|
| Render Postgres (chessmaster DB) | `dpg-*.render.com` or internal `dpg-*` | Yes |
| Dedicated Neon project for ChessMaster | `ep-*.neon.tech` | Yes |
| Shared Supabase (APAD / EnterpriseKnowledgeBot) | `*.supabase.com` / `pooler.supabase.com` | **No — wrong schema** |

> **Warning:** Never use the APAD or EnterpriseKnowledgeBot Supabase URL for ChessMaster admin scripts or for `chessmaster-api` `DATABASE_URL`. That database has a different `users` table (no `username` column). The clear-users script detects this and refuses to run.

**chessmaster-api** on Render should use **Render Postgres (`dpg-*`)** or a **dedicated Neon** project — not shared Supabase.

### Before clearing users

1. Confirm **chessmaster-api** → **Environment** → `DATABASE_URL` is the ChessMaster database (not Supabase/APAD).
2. Run migrations on that same database if the API health check or registration fails (see `docs/RENDER.md` Step 3b).
3. Restart **chessmaster-api** after migrations.

### Run the script

In PowerShell (session only — do not commit the URL):

```powershell
cd F:\SindhuReddy\GNAMAMAI\ChessMasterPro
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

Copy the value from **Render → chessmaster-api → Environment → DATABASE_URL** (External Database URL if using Neon, or the Render Postgres connection string).

**List accounts only:**

```powershell
.\scripts\clear-users-postgres.ps1 --list-only
```

**Delete all users** (interactive — type `DELETE`):

```powershell
.\scripts\clear-users-postgres.ps1
```

**Delete without prompt:**

```powershell
.\scripts\clear-users-postgres.ps1 --confirm
```

**Pass URL on the command line** (instead of env):

```powershell
.\scripts\clear-users-postgres.ps1 --database-url "postgresql://..." --list-only
```

Safety:

- Refuses non-ChessMaster schemas (checks `public.users.username` via `information_schema`).
- Refuses `localhost` / `127.0.0.1` unless `--force` is passed.

After a successful clear (`Users remaining: 0`), register again on production **chessmaster-web**.

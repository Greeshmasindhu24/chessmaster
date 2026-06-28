# ChessMaster Pro

Enterprise-grade online chess platform with live multiplayer, AI opponents, tournaments, puzzles, and Stockfish analysis.

## Architecture

```
ChessMasterPro/
├── backend/          # FastAPI + SQLAlchemy + WebSockets
├── frontend/         # React + Vite + TypeScript + Tailwind
├── database/         # SQL migrations (PostgreSQL)
├── data/             # SQLite database (local dev, gitignored)
├── uploads/          # Local file storage
├── stockfish/        # Stockfish Windows executable (optional)
├── docs/             # Documentation
└── docker-compose.yml  # Optional — Docker path (requires WSL 2 on Windows)
```

## Phase 1 Foundation (Current)

Phase 1 extends auth, profiles, preferences, settings UI, and Play Store MVP scaffolding. Phase 2 multiplayer (WebSockets, matchmaking) remains in place.

**Android / Play Store:** See [docs/PLAY_STORE.md](docs/PLAY_STORE.md) for AAB build, signing, and submission steps.

### New in Phase 1

| Area | Endpoints / UI |
|------|----------------|
| Auth | Guest login, forgot/reset password (scaffold), email verify (scaffold), Google OAuth stub |
| Profile | `GET/PATCH /users/me/profile`, `GET /users/{username}` |
| Preferences | `GET/PATCH /users/me/preferences` (theme, board, sound flags) |
| Frontend | `/settings`, dark/light theme toggle, forgot/reset password pages |

Apply PostgreSQL migration on Render (after `001_initial.sql`):

```bash
psql $DATABASE_URL -f database/migrations/002_phase1_foundation.sql
```

SQLite dev: tables are created automatically on backend start (`create_all`).

## Premium Platform Roadmap

| Spec section | Status | Notes |
|--------------|--------|-------|
| **Auth — email/password + JWT** | Done | Register, login, refresh, logout, `/auth/me` |
| **Auth — guest accounts** | Done | `POST /auth/guest` |
| **Auth — forgot / reset password** | In Progress | API + UI; email send when SMTP configured |
| **Auth — email verification** | In Progress | Token tables + API; SMTP wiring Phase 2 |
| **Auth — Google OAuth** | Planned | Stub at `/auth/google`; callback Phase 2 |
| **User profiles (ELO, stats, avatar)** | Done | Profile model + PATCH API + dashboard stats |
| **Settings & theme (dark/light)** | Done | `/settings`, Redux + DB sync |
| **Gameplay — local 2P board** | Done | `/play` |
| **Gameplay — vs AI** | Done | `/play/ai`, Stockfish optional |
| **Gameplay — full rules** | In Progress | python-chess validation online; expand local |
| **Multiplayer — WebSocket** | Done | Matchmaking, rooms, chat, draw/resign |
| **Multiplayer — spectator** | Planned | Phase 3 |
| **Clock modes** | In Progress | Time controls in online games |
| **Game history / PGN** | In Progress | REST history + DB persistence |
| **Analysis (Stockfish)** | Planned | Phase 3 |
| **Daily puzzles** | Planned | Phase 3 |
| **Rankings / leaderboards** | Planned | Phase 4 |
| **Friends & social** | Planned | Phase 4 |
| **Notifications** | Planned | Model exists; API Phase 4 |
| **Premium UI (boards, audio)** | In Progress | Board themes + sound effects done (Phase 2); premium boards deferred |
| **Admin dashboard** | Planned | Phase 5 |
| **Security hardening** | In Progress | JWT sessions, rate limit; audit Phase 5 |
| **Documentation** | In Progress | README + `/docs` OpenAPI |

## Phase 2 — Multiplayer & Analysis (Next)

- Real-time multiplayer via native WebSockets
- Game state cache (Redis in production, in-memory for local dev)
- Room codes for private games
- Random matchmaking by time control
- Move validation with python-chess, persisted to database
- Live board sync, chat, draw offers, resignation
- REST game API (create, join, get, history)

Phase 1 features (auth, local board, health checks) remain available.

## Quick Start — Windows (native, no Docker)

**Prerequisites:** Python 3.12 or 3.13, Node.js 20+. No PostgreSQL or Redis required for local dev.

```powershell
cd ChessMasterPro
copy .env.example .env
.\setup-windows.ps1

# Terminal 1 — backend
.\run_backend.ps1

# Terminal 2 — frontend
.\run_frontend.ps1
```

Or use the `.bat` wrappers: `run_backend.bat` and `run_frontend.bat`.

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8001        |
| API Docs | http://localhost:8001/docs   |
| WebSocket| ws://localhost:8001/api/v1/ws/game?token=JWT |

> Backend uses **port 8001** to avoid conflicts with other apps on 8000.

**Full Windows guide:** [docs/WINDOWS-NO-WSL.md](docs/WINDOWS-NO-WSL.md)

### What runs where

| Component | Default (Windows dev) | Optional upgrade |
|-----------|----------------------|------------------|
| Database  | SQLite (`data/chessmaster.db`) | PostgreSQL |
| Cache     | In-memory | Redis / Memurai |
| Stockfish | Not required yet | `stockfish/stockfish.exe` |

Tables are created automatically on first backend start (`SQLAlchemy create_all`). For PostgreSQL on Render, apply migrations in order: `001_initial.sql`, then `002_phase1_foundation.sql`.

### Environment (.env)

Copy `.env.example` to `.env`. Key settings:

```env
SQLITE_DATABASE_URL=sqlite+aiosqlite:///./data/chessmaster.db
REDIS_ENABLED=false
VITE_API_URL=http://localhost:8001
STOCKFISH_PATH=stockfish/stockfish.exe
UPLOADS_DIR=uploads
```

To use PostgreSQL instead, comment out `SQLITE_DATABASE_URL` and set `DATABASE_URL=postgresql+asyncpg://chess:chess@localhost:5433/chessmaster`.

To use Redis, set `REDIS_ENABLED=true` and `REDIS_URL=redis://localhost:6380/0`.

## Optional: Docker (requires WSL 2 on Windows)

Docker is supported but **not required**. On Windows, Docker Desktop needs WSL 2.

```powershell
cd ChessMasterPro
copy .env.example .env
docker compose up --build -d
```

| Service  | URL (Docker)                 |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8001        |
| Postgres | localhost:5433               |
| Redis    | localhost:6380               |

## API Endpoints

### Auth & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/login | Login (JWT) |
| POST | /api/v1/auth/guest | Guest account |
| POST | /api/v1/auth/refresh | Refresh token |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Current user |
| DELETE | /api/v1/auth/account | Delete account (JWT) |
| POST | /api/v1/auth/forgot-password | Request reset link |
| POST | /api/v1/auth/reset-password | Set new password |
| POST | /api/v1/auth/verify-email/request | Send verify email (JWT) |
| POST | /api/v1/auth/verify-email/confirm | Confirm email token |
| GET | /api/v1/auth/google | Google OAuth stub |

### Users & Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users/me/profile | Your profile |
| PATCH | /api/v1/users/me/profile | Update avatar, country, bio |
| GET | /api/v1/users/me/preferences | Theme & UI preferences |
| PATCH | /api/v1/users/me/preferences | Update preferences |
| GET | /api/v1/users/{username} | Public profile |

### Games (JWT required)

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| POST   | /api/v1/games         | Create private game (room code)|
| POST   | /api/v1/games/join    | Join game by room code         |
| GET    | /api/v1/games/history | List your recent games         |
| GET    | /api/v1/games/{id}    | Get game with moves            |

## WebSocket — `/api/v1/ws/game`

Connect with JWT: `ws://localhost:8001/api/v1/ws/game?token=<access_token>`

### Client → Server messages

Send JSON: `{ "type": "<type>", "data": { ... } }`

| type               | data fields                                      |
|--------------------|--------------------------------------------------|
| find_match         | time_control_seconds, increment_seconds          |
| cancel_matchmaking | time_control_seconds, increment_seconds          |
| join_game          | game_id                                          |
| move               | game_id, uci, time_remaining_ms (optional)     |
| draw_offer         | game_id                                          |
| draw_response      | game_id, accepted (bool)                         |
| resign             | game_id                                          |
| chat_message       | game_id, text                                    |
| timer_sync         | game_id, white_time_ms, black_time_ms           |

### Server → Client events

Payload shape: `{ "event": "<event>", "data": { ... } }`

| event          | Description                              |
|----------------|------------------------------------------|
| connected      | WebSocket authenticated                  |
| matchmaking    | Queue status (waiting / cancelled)       |
| match_found    | Paired opponent, game_id, your_color     |
| player_joined  | Opponent joined room or reconnect sync   |
| move_played    | Move applied (uci, fen, san, result)     |
| timer_update   | Opponent clock sync                      |
| draw_offer     | Draw offered or declined                 |
| game_finished  | Game ended (result, reason)              |
| chat_message   | In-game chat                             |
| error          | Validation or auth error                 |

## Development Phases (Summary)

| Phase | Focus |
|-------|--------|
| 1 | Auth foundation, profiles, preferences, settings UI |
| 2 | Google OAuth, SMTP email, board themes, sound effects (billing deferred) |
| 3 | Stockfish analysis, puzzles, spectator mode |
| 4 | Rankings, friends, notifications |
| 5 | Admin panel, analytics, security audit |

See **Premium Platform Roadmap** above for per-feature status.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind, Redux Toolkit, Framer Motion, chess.js, react-chessboard
- **Backend:** FastAPI, SQLAlchemy, python-chess, optional Redis, optional Stockfish
- **DevOps:** Docker (optional), GitHub Actions

## License

Proprietary — ChessMaster Pro

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

## Phase 2 (Current)

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

Tables are created automatically on first backend start (`SQLAlchemy create_all`). For PostgreSQL, you can also apply `database/migrations/001_initial.sql`.

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

### Phase 1 — Auth & Health

| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| GET    | /api/v1/health        | Health check       |
| POST   | /api/v1/auth/register | Register user      |
| POST   | /api/v1/auth/login    | Login (JWT)        |
| POST   | /api/v1/auth/refresh  | Refresh token      |
| POST   | /api/v1/auth/logout   | Logout             |
| GET    | /api/v1/auth/me       | Current user       |

### Phase 2 — Games (JWT required)

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

## Roadmap

| Phase | Features                                              |
|-------|-------------------------------------------------------|
| 2     | WebSocket multiplayer, matchmaking, game persistence  |
| 3     | Stockfish AI, game analysis, puzzles                  |
| 4     | Tournaments, friends, chat, notifications             |
| 5     | Admin panel, analytics, Google OAuth, email verify    |

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind, Redux Toolkit, Framer Motion, chess.js, react-chessboard
- **Backend:** FastAPI, SQLAlchemy, python-chess, optional Redis, optional Stockfish
- **DevOps:** Docker (optional), GitHub Actions

## License

Proprietary — ChessMaster Pro

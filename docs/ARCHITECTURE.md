# ChessMaster Pro — Architecture

## System Overview

```mermaid
flowchart TB
    Client[React Frontend] --> Nginx[Nginx Reverse Proxy]
    Nginx --> API[FastAPI Backend]
    Nginx --> WS[WebSocket Manager]
    API --> PG[(PostgreSQL)]
    API --> Redis[(Redis Cache)]
    API --> S3[AWS S3]
    API --> SF[Stockfish Engine]
    Celery[Celery Workers] --> Redis
    Celery --> PG
```

## Backend Layers (Clean Architecture)

```
app/
├── api/v1/       # HTTP route handlers
├── core/         # Config, security, database, dependencies
├── models/       # SQLAlchemy ORM models
├── schemas/      # Pydantic request/response DTOs
├── services/     # Business logic
├── repositories/ # Data access (Phase 2+)
├── websocket/    # Real-time events (Phase 2+)
└── tasks/        # Celery background jobs (Phase 2+)
```

## Database Schema (Phase 1)

- `users` — authentication, roles, OAuth
- `profiles` — ratings, stats, avatar
- `sessions` — refresh token tracking
- `games` — game state, FEN, PGN
- `moves` — move history
- `notifications` — in-app alerts
- `audit_logs` — security audit trail

## Authentication Flow

```mermaid
sequenceDiagram
    Client->>API: POST /auth/login
    API->>DB: Verify credentials
    API->>DB: Create session (refresh JTI)
    API-->>Client: access_token + refresh_token + user
    Client->>API: GET /auth/me (Bearer token)
    API-->>Client: User profile
    Note over Client,API: On 401, client refreshes via POST /auth/refresh
```

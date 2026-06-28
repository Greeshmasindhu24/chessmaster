import ssl
from functools import cached_property, lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

# libpq URL query params that asyncpg.connect() does not accept
_ASYNCPG_UNSUPPORTED_QUERY_KEYS = frozenset(
    {
        "sslmode",
        "sslcert",
        "sslkey",
        "sslrootcert",
        "sslcrl",
        "channel_binding",
        "options",
        "target_session_attrs",
    }
)


def _ssl_connect_arg(sslmode: str | None) -> dict:
    """Map libpq sslmode to asyncpg ``ssl`` connect_arg."""
    if not sslmode:
        return {}
    mode = sslmode.lower()
    if mode == "disable":
        return {"ssl": False}
    if mode in ("require", "prefer", "allow"):
        return {"ssl": True}
    if mode == "verify-ca":
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        return {"ssl": ctx}
    if mode == "verify-full":
        return {"ssl": ssl.create_default_context()}
    return {"ssl": True}


def normalize_postgres_url(url: str) -> tuple[str, dict]:
    """
    Ensure asyncpg driver URL and strip libpq-only query params.

    Render / Neon / Heroku often append ``?sslmode=require``; asyncpg expects
    ``ssl=True`` via connect_args instead.
    """
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if not url.startswith("postgresql+asyncpg://"):
        return url, {}

    parsed = make_url(url)
    query = dict(parsed.query)
    sslmode = query.pop("sslmode", None)
    for key in list(query):
        if key in _ASYNCPG_UNSUPPORTED_QUERY_KEYS:
            query.pop(key)

    connect_args = _ssl_connect_arg(sslmode)
    cleaned = parsed.set(query=query).render_as_string(hide_password=False)
    return cleaned, connect_args

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ChessMaster Pro"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # PostgreSQL (production / optional local dev)
    DATABASE_URL: str = "postgresql+asyncpg://chess:chess@localhost:5433/chessmaster"
    # SQLite (recommended for Windows dev without Postgres)
    SQLITE_DATABASE_URL: str = ""

    REDIS_URL: str = ""
    REDIS_ENABLED: bool = True

    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8001/api/v1/auth/google/callback"

    FRONTEND_URL: str = "http://localhost:5173"
    # Optional extra origins (e.g. localhost for testing prod API from Render dashboard env)
    CORS_DEV_ORIGINS: List[str] = []

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@chessmaster.pro"
    # Deprecated alias — prefer SMTP_FROM
    EMAIL_FROM: str = ""

    @property
    def smtp_from_address(self) -> str:
        return (self.SMTP_FROM or self.EMAIL_FROM or "noreply@chessmaster.pro").strip()

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"

    UPLOADS_DIR: str = "uploads"
    STOCKFISH_PATH: str = "stockfish/stockfish.exe"
    RATE_LIMIT: str = "100/minute"

    @cached_property
    def _postgres_url_and_connect_args(self) -> tuple[str, dict]:
        return normalize_postgres_url(self.DATABASE_URL)

    @property
    def resolved_database_url(self) -> str:
        if self.SQLITE_DATABASE_URL.strip():
            url = self.SQLITE_DATABASE_URL.strip()
        else:
            url = self._postgres_url_and_connect_args[0]

        if url.startswith("sqlite") and ":///" in url:
            db_path = url.split(":///", 1)[1]
            if db_path not in (":memory:",) and not Path(db_path).is_absolute():
                abs_path = (PROJECT_ROOT / db_path).resolve()
                url = f"sqlite+aiosqlite:///{abs_path.as_posix()}"
        return url

    @property
    def postgres_connect_args(self) -> dict:
        if self.uses_sqlite:
            return {}
        return self._postgres_url_and_connect_args[1]

    @property
    def uses_sqlite(self) -> bool:
        return self.resolved_database_url.startswith("sqlite")

    @property
    def redis_configured(self) -> bool:
        return self.REDIS_ENABLED and bool(self.REDIS_URL.strip())

    @property
    def effective_cors_origins(self) -> List[str]:
        """Include FRONTEND_URL, CORS_DEV_ORIGINS, and localhost/127.0.0.1 pairs in dev."""
        origins = list(self.CORS_ORIGINS)
        for origin in self.CORS_DEV_ORIGINS:
            o = origin.rstrip("/")
            if o and o not in origins:
                origins.append(o)
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL.rstrip("/"))
        if not self.DEBUG:
            return origins
        expanded: list[str] = []
        for origin in origins:
            if "://localhost" in origin:
                expanded.append(origin.replace("://localhost", "://127.0.0.1", 1))
            elif "://127.0.0.1" in origin:
                expanded.append(origin.replace("://127.0.0.1", "://localhost", 1))
        for origin in expanded:
            if origin not in origins:
                origins.append(origin)
        return origins

    @property
    def uploads_path(self) -> Path:
        path = Path(self.UPLOADS_DIR)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()

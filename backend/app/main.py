from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import api_router
from app.core.config import PROJECT_ROOT, get_settings
from app.core.database import Base, engine
from app.core.redis import close_redis, init_cache
from app.core.sqlite_migrations import apply_sqlite_migrations

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


def _ensure_runtime_dirs() -> None:
    settings.uploads_path.mkdir(parents=True, exist_ok=True)

    stockfish_path = Path(settings.STOCKFISH_PATH)
    if not stockfish_path.is_absolute():
        stockfish_path = PROJECT_ROOT / stockfish_path
    stockfish_path.parent.mkdir(parents=True, exist_ok=True)

    if settings.uses_sqlite and ":///" in settings.resolved_database_url:
        db_path = Path(settings.resolved_database_url.split(":///", 1)[1])
        if db_path.name != ":memory:":
            if not db_path.is_absolute():
                db_path = PROJECT_ROOT / db_path
            db_path.parent.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_runtime_dirs()
    await init_cache()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if settings.uses_sqlite:
            await apply_sqlite_migrations(conn)
    yield
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise chess platform API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, _exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={"detail": "Email or username already exists"},
    )

_cors_kwargs: dict = {
    "allow_origins": settings.effective_cors_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.DEBUG:
    _cors_kwargs["allow_origin_regex"] = (
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"
    )

app.add_middleware(CORSMiddleware, **_cors_kwargs)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


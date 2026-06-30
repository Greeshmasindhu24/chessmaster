import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError

from app.api.v1.health import get_health_status
from app.api.v1.router import api_router
from app.core.config import PROJECT_ROOT, get_settings
from app.core.database import Base, engine, get_db
from app.schemas.auth import HealthResponse
from app.core.redis import close_redis, init_cache
from app.core.postgres_migrations import apply_postgres_migrations
from app.core.sqlite_migrations import apply_sqlite_migrations

logger = logging.getLogger(__name__)

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
        else:
            await apply_postgres_migrations(conn)
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




@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled server error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

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


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "health_v1": f"{settings.API_V1_PREFIX}/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_root(db: AsyncSession = Depends(get_db)):
    return await get_health_status(db)


app.include_router(api_router, prefix=settings.API_V1_PREFIX)



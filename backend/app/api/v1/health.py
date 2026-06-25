from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_cache
from app.schemas.auth import HealthResponse

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)):
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    cache = await get_cache()
    try:
        await cache.ping()
        redis_status = "ok" if cache.backend_name == "redis" else "memory"
    except Exception:
        redis_status = "error"

    overall = "healthy" if db_status == "ok" and redis_status in ("ok", "memory") else "degraded"

    return HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        database=db_status,
        redis=redis_status,
    )

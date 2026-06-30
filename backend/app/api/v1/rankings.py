from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.rankings import LeaderboardResponse
from app.services.rankings_service import RankingsService

router = APIRouter(prefix="/rankings", tags=["Rankings"])


@router.get("/blitz", response_model=LeaderboardResponse)
async def blitz_leaderboard(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    entries = await RankingsService.leaderboard(db, limit=limit)
    return {"entries": entries, "rating_type": "blitz"}

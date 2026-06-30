from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import RequirePlayer, get_current_user
from app.models import User
from app.schemas.analysis import (
    AnalyzeGameRequest,
    AnalyzeGameResponse,
    AnalyzePositionRequest,
    AnalyzePositionResponse,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/position", response_model=AnalyzePositionResponse)
async def analyze_position(
    data: AnalyzePositionRequest,
    _user: User = Depends(get_current_user),
):
    result = AnalysisService.analyze_position(data.fen, depth=data.depth, multipv=data.multipv)
    return result


@router.post("/game", response_model=AnalyzeGameResponse)
async def analyze_game(
    data: AnalyzeGameRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    if data.game_id:
        result = await AnalysisService.analyze_stored_game(db, data.game_id, user.id, depth=data.depth)
        return result

    pgn, moves = AnalysisService.analyze_pgn(data.pgn or "", depth=data.depth)
    from app.services.ai_service import get_stockfish_path

    return {
        "game_id": None,
        "pgn": pgn,
        "moves": moves,
        "average_cp_loss": AnalysisService._average_loss(moves),
        "engine": "stockfish" if get_stockfish_path() else "minimax",
    }


@router.get("/game/{game_id}", response_model=AnalyzeGameResponse)
async def analyze_game_by_id(
    game_id: UUID,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await AnalysisService.analyze_stored_game(db, game_id, user.id)

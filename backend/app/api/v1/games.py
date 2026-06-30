from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import RequirePlayer, get_current_user
from app.models import Game, User
from app.schemas.game import (
    AiGameCreateRequest,
    AiGameCreateResponse,
    AiMoveRequest,
    AiMoveResponse,
    GameCreateRequest,
    GameJoinRequest,
    GameResponse,
    GameSummaryResponse,
)
from app.services.game_service import GameService
from app.websocket.manager import manager

router = APIRouter(prefix="/games", tags=["Games"])


async def _load_game_for_response(db: AsyncSession, game_id: UUID) -> Game:
    result = await db.execute(
        select(Game).where(Game.id == game_id).options(selectinload(Game.moves))
    )
    return result.scalar_one()


@router.post("/ai", response_model=AiGameCreateResponse, status_code=201)
async def create_ai_game(
    data: AiGameCreateRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    game, ai_opening = await GameService.create_ai_game(
        db, user, data.difficulty, data.player_color
    )
    game = await _load_game_for_response(db, game.id)
    return AiGameCreateResponse(game=game, ai_opening_move=ai_opening)


@router.post("/{game_id}/ai/move", response_model=AiMoveResponse)
async def play_ai_move(
    game_id: UUID,
    data: AiMoveRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    game = await GameService.get_game(db, game_id, user)
    payload = await GameService.apply_ai_player_move(db, game, user, data.uci)
    return payload


@router.post("", response_model=GameResponse, status_code=201)
async def create_game(
    data: GameCreateRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    game = await GameService.create_game(
        db, user, data.time_control_seconds, data.increment_seconds
    )
    game = await _load_game_for_response(db, game.id)
    return game


@router.post("/join", response_model=GameResponse)
async def join_game(
    data: GameJoinRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    game = await GameService.join_game(db, user, data.room_code.upper())
    game = await _load_game_for_response(db, game.id)

    host_id = str(game.white_player_id) if game.white_player_id else None
    if host_id and host_id in manager.active_connections:
        state = await GameService.get_redis_state(game.id) or {}
        await manager.send_event(
            host_id,
            "player_joined",
            {
                "game_id": str(game.id),
                "room_code": game.room_code,
                "fen": game.fen,
                "username": user.username,
                "user_id": str(user.id),
                "status": game.status.value,
                "your_color": "white",
                "white_time_ms": state.get("white_time_ms", game.time_control_seconds * 1000),
                "black_time_ms": state.get("black_time_ms", game.time_control_seconds * 1000),
            },
        )

    return game


@router.get("/history", response_model=list[GameSummaryResponse])
async def list_game_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await GameService.list_history(db, user)


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    game = await GameService.get_game(db, game_id, user)
    return game

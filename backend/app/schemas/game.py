from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GameCreateRequest(BaseModel):
    time_control_seconds: int = Field(default=600, ge=60, le=7200)
    increment_seconds: int = Field(default=0, ge=0, le=60)


class GameJoinRequest(BaseModel):
    room_code: str = Field(min_length=4, max_length=8)


class MoveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    move_number: int
    san: str
    uci: str
    fen_after: str
    time_remaining_ms: int | None = None
    created_at: datetime


class GameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    white_player_id: UUID | None
    black_player_id: UUID | None
    status: str
    mode: str
    time_control_seconds: int
    increment_seconds: int
    fen: str
    pgn: str | None
    result: str | None
    room_code: str | None
    winner_id: UUID | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    moves: list[MoveResponse] = []


class GameSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    white_player_id: UUID | None
    black_player_id: UUID | None
    status: str
    mode: str
    time_control_seconds: int
    increment_seconds: int
    result: str | None
    room_code: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class MatchmakingRequest(BaseModel):
    time_control_seconds: int = Field(default=600, ge=60, le=7200)
    increment_seconds: int = Field(default=0, ge=0, le=60)


class AiGameCreateRequest(BaseModel):
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced|expert)$")
    player_color: str = Field(default="white", pattern="^(white|black)$")


class AiMoveRequest(BaseModel):
    uci: str = Field(min_length=4, max_length=7)


class AiMoveResponse(BaseModel):
    game_id: str
    player_move: dict
    ai_move: dict | None
    fen: str
    status: str
    result: str | None


class AiGameCreateResponse(BaseModel):
    game: GameResponse
    ai_opening_move: dict | None = None

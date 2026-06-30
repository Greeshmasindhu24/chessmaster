from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AnalyzePositionRequest(BaseModel):
    fen: str = Field(min_length=10, max_length=120)
    depth: int = Field(default=12, ge=1, le=22)
    multipv: int = Field(default=1, ge=1, le=3)


class PrincipalVariation(BaseModel):
    moves_uci: list[str]
    eval_cp: int | None = None
    mate: int | None = None


class AnalyzePositionResponse(BaseModel):
    fen: str
    turn: str
    eval_cp: int | None = None
    mate: int | None = None
    best_move_uci: str | None = None
    best_move_san: str | None = None
    lines: list[PrincipalVariation] = []
    engine: str


class MoveAnalysis(BaseModel):
    move_number: int
    san: str
    uci: str
    fen_before: str
    eval_before_cp: int | None = None
    best_move_uci: str | None = None
    eval_after_cp: int | None = None
    cp_loss: int | None = None
    quality: str


class AnalyzeGameRequest(BaseModel):
    pgn: str | None = None
    game_id: UUID | None = None
    depth: int = Field(default=10, ge=1, le=18)

    @model_validator(mode="after")
    def require_pgn_or_game(self):
        if not self.pgn and not self.game_id:
            raise ValueError("Provide pgn or game_id")
        return self


class AnalyzeGameResponse(BaseModel):
    game_id: UUID | None = None
    pgn: str | None = None
    moves: list[MoveAnalysis] = []
    average_cp_loss: float | None = None
    engine: str

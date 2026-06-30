from uuid import UUID

from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    username: str
    avatar_url: str | None = None
    rating_blitz: int
    games_played: int
    wins: int


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    rating_type: str = "blitz"

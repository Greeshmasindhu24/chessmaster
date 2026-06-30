from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class FriendUserSummary(BaseModel):
    id: UUID
    username: str
    avatar_url: str | None = None
    rating_blitz: int = 1200


class FriendshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    friend_id: UUID
    status: str
    created_at: datetime
    friend: FriendUserSummary | None = None


class FriendRequestCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)


class UserSearchResult(BaseModel):
    id: UUID
    username: str
    avatar_url: str | None = None
    rating_blitz: int = 1200
    friendship_status: str | None = None

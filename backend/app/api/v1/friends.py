from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import RequirePlayer, get_current_user
from app.models import User
from app.schemas.friends import FriendRequestCreate, FriendshipResponse, UserSearchResult
from app.services.friends_service import FriendsService

router = APIRouter(prefix="/friends", tags=["Friends"])


@router.get("", response_model=list[FriendshipResponse])
async def list_friends(
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.list_friends(db, user)


@router.get("/requests", response_model=list[FriendshipResponse])
async def list_incoming_requests(
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.list_pending_incoming(db, user)


@router.post("/requests", response_model=FriendshipResponse, status_code=201)
async def send_friend_request(
    data: FriendRequestCreate,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.send_request(db, user, data.username)


@router.post("/requests/{friendship_id}/accept", response_model=FriendshipResponse)
async def accept_friend_request(
    friendship_id: UUID,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.respond_to_request(db, user, friendship_id, accept=True)


@router.post("/requests/{friendship_id}/decline", response_model=FriendshipResponse)
async def decline_friend_request(
    friendship_id: UUID,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.respond_to_request(db, user, friendship_id, accept=False)


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    q: str = Query(min_length=2, max_length=50),
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await FriendsService.search_users(db, user, q)

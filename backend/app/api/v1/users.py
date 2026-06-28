from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.auth import ProfileResponse
from app.schemas.profile import (
    ProfileUpdateRequest,
    PublicProfileResponse,
    UserPreferencesResponse,
    UserPreferencesUpdate,
)
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/profile", response_model=ProfileResponse)
async def get_my_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.profile:
        await ProfileService.ensure_user_defaults(db, user)
        await db.refresh(user, ["profile"])
    return user.profile


@router.patch("/me/profile", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ProfileService.update_profile(db, user, data)


@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_my_preferences(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ProfileService.get_preferences(db, user)


@router.patch("/me/preferences", response_model=UserPreferencesResponse)
async def update_my_preferences(
    data: UserPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ProfileService.update_preferences(db, user, data)


@router.get("/{username}", response_model=PublicProfileResponse)
async def get_public_profile(username: str, db: AsyncSession = Depends(get_db)):
    profile = await ProfileService.get_by_username(db, username)
    return PublicProfileResponse(
        username=profile.user.username,
        avatar_url=profile.avatar_url,
        country=profile.country,
        gender=profile.gender,
        biography=profile.biography,
        rating_bullet=profile.rating_bullet,
        rating_blitz=profile.rating_blitz,
        rating_rapid=profile.rating_rapid,
        rating_classical=profile.rating_classical,
        games_played=profile.games_played,
        wins=profile.wins,
        losses=profile.losses,
        draws=profile.draws,
    )

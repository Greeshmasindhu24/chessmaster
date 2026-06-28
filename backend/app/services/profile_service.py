from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Profile, User, UserPreferences
from app.schemas.profile import ProfileUpdateRequest, UserPreferencesUpdate


class ProfileService:
    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Profile:
        result = await db.execute(
            select(Profile)
            .options(selectinload(Profile.user))
            .join(User)
            .where(User.username == username.lower())
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return profile

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, data: ProfileUpdateRequest) -> Profile:
        if not user.profile:
            user.profile = Profile(user_id=user.id)
            db.add(user.profile)
            await db.flush()

        if data.avatar_url is not None:
            user.profile.avatar_url = data.avatar_url
        if data.country is not None:
            user.profile.country = data.country.upper()
        if data.biography is not None:
            user.profile.biography = data.biography

        await db.flush()
        await db.refresh(user.profile)
        return user.profile

    @staticmethod
    async def get_preferences(db: AsyncSession, user: User) -> UserPreferences:
        if user.preferences:
            return user.preferences

        prefs = UserPreferences(user_id=user.id)
        db.add(prefs)
        await db.flush()
        await db.refresh(prefs)
        return prefs

    @staticmethod
    async def update_preferences(
        db: AsyncSession, user: User, data: UserPreferencesUpdate
    ) -> UserPreferences:
        prefs = await ProfileService.get_preferences(db, user)

        if data.theme is not None:
            prefs.theme = data.theme
        if data.board_theme is not None:
            prefs.board_theme = data.board_theme
        if data.sound_enabled is not None:
            prefs.sound_enabled = data.sound_enabled
        if data.move_confirmation is not None:
            prefs.move_confirmation = data.move_confirmation

        await db.flush()
        await db.refresh(prefs)
        return prefs

    @staticmethod
    async def ensure_user_defaults(db: AsyncSession, user: User) -> None:
        if not user.profile:
            db.add(Profile(user_id=user.id))
        if not user.preferences:
            db.add(UserPreferences(user_id=user.id))
        await db.flush()

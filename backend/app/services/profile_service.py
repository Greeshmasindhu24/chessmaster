from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Country, Gender, Profile, User, UserPreferences
from app.schemas.auth import UserRegister
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
        result = await db.execute(select(Profile).where(Profile.user_id == user.id))
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = Profile(user_id=user.id)
            db.add(profile)
            await db.flush()

        if data.avatar_url is not None:
            profile.avatar_url = data.avatar_url
        if data.biography is not None:
            profile.biography = data.biography

        await db.flush()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_preferences(db: AsyncSession, user: User) -> UserPreferences:
        result = await db.execute(select(UserPreferences).where(UserPreferences.user_id == user.id))
        prefs = result.scalar_one_or_none()
        if prefs:
            return prefs

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
        profile_result = await db.execute(select(Profile).where(Profile.user_id == user.id))
        if profile_result.scalar_one_or_none() is None:
            db.add(Profile(user_id=user.id))
        prefs_result = await db.execute(select(UserPreferences).where(UserPreferences.user_id == user.id))
        if prefs_result.scalar_one_or_none() is None:
            db.add(UserPreferences(user_id=user.id))
        await db.flush()

    @staticmethod
    async def create_profile_on_register(db: AsyncSession, user: User, data: UserRegister) -> None:
        profile = Profile(
            user_id=user.id,
            country=Country(data.country.value) if data.country else None,
            date_of_birth=data.date_of_birth,
            gender=Gender(data.gender.value),
        )
        db.add(profile)
        db.add(UserPreferences(user_id=user.id))
        await db.flush()

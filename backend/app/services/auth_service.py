from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models import Profile, Session, User, UserRole
from app.schemas.auth import UserLogin, UserRegister


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: UserRegister) -> User:
        existing = await db.execute(
            select(User).where((User.email == data.email) | (User.username == data.username))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already exists")

        user = User(
            email=data.email.lower(),
            username=data.username.lower(),
            hashed_password=hash_password(data.password),
            role=UserRole.PLAYER,
        )
        db.add(user)
        await db.flush()

        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.flush()
        await db.refresh(user, ["profile"])
        return user

    @staticmethod
    async def login(db: AsyncSession, data: UserLogin, user_agent: str | None, ip: str | None) -> tuple[User, str, str]:
        result = await db.execute(select(User).where(User.email == data.email.lower()))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if user.is_banned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")

        access = create_access_token(str(user.id), user.role.value)
        refresh, jti = create_refresh_token(str(user.id))

        session = Session(
            user_id=user.id,
            refresh_jti=jti,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=timezone.utc),
            user_agent=user_agent,
            ip_address=ip,
        )
        from app.core.config import get_settings

        settings = get_settings()
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        user_result = await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user.id)
        )
        user = user_result.scalar_one()
        return user, access, refresh

    @staticmethod
    async def refresh(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
        from jose import JWTError

        from app.core.security import decode_token, verify_token_type

        try:
            payload = decode_token(refresh_token)
            if not verify_token_type(payload, "refresh"):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
            jti = payload.get("jti")
            user_id = payload.get("sub")
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

        result = await db.execute(
            select(Session).where(Session.refresh_jti == jti, Session.is_revoked == False)  # noqa: E712
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")

        user_result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active or user.is_banned:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

        session.is_revoked = True
        access = create_access_token(str(user.id), user.role.value)
        new_refresh, new_jti = create_refresh_token(str(user.id))
        new_session = Session(
            user_id=user.id,
            refresh_jti=new_jti,
            expires_at=session.expires_at,
        )
        db.add(new_session)
        return access, new_refresh

    @staticmethod
    async def logout(db: AsyncSession, refresh_token: str) -> None:
        from jose import JWTError

        from app.core.security import decode_token

        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
        except JWTError:
            return

        result = await db.execute(select(Session).where(Session.refresh_jti == jti))
        session = result.scalar_one_or_none()
        if session:
            session.is_revoked = True

import logging
import re
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from urllib.parse import urlencode
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_oauth_state_token,
    hash_password,
    verify_oauth_state_token,
    verify_password,
)
from app.models import Country, EmailVerificationToken, Game, Gender, PasswordResetToken, Profile, Session, User, UserRole
from app.schemas.auth import UserLogin, UserRegister
from app.services.email_service import EmailService
from app.services.profile_service import ProfileService

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: UserRegister) -> User:
        email_norm = data.email.strip().lower()
        username_norm = data.username.strip().lower()
        existing = await db.execute(
            select(User).where((User.email == email_norm) | (User.username == username_norm))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already exists")

        user = User(
            email=data.email.lower(),
            username=data.username.lower(),
            hashed_password=hash_password(data.password),
            role=UserRole.PLAYER,
            is_verified=False,
        )
        db.add(user)
        await db.flush()
        await ProfileService.create_profile_on_register(db, user, data)
        await db.flush()
        # Eager-load relationships; db.refresh(..., ["profile"]) triggers sync lazy-load (MissingGreenlet).
        result = await db.execute(
            select(User)
            .options(selectinload(User.profile), selectinload(User.preferences))
            .where(User.id == user.id)
        )
        return result.scalar_one()

    @staticmethod
    async def issue_session(
        db: AsyncSession, user: User, user_agent: str | None, ip: str | None
    ) -> tuple[User, str, str]:
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
        db.add(session)
        user_result = await db.execute(
            select(User)
            .options(selectinload(User.profile), selectinload(User.preferences))
            .where(User.id == user.id)
        )
        user = user_result.scalar_one()
        return user, access, refresh

    @staticmethod
    async def login(db: AsyncSession, data: UserLogin, user_agent: str | None, ip: str | None) -> tuple[User, str, str]:
        login_id = data.email.strip().lower()
        result = await db.execute(
            select(User).where((User.email == login_id) | (User.username == login_id))
        )
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if user.is_banned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")

        return await AuthService.issue_session(db, user, user_agent, ip)

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

    @staticmethod
    def _hash_token(raw: str) -> str:
        return sha256(raw.encode()).hexdigest()

    @staticmethod
    async def create_guest(db: AsyncSession, user_agent: str | None, ip: str | None) -> tuple[User, str, str]:
        guest_id = uuid4().hex[:8]
        user = User(
            email=f"guest_{guest_id}@guest.chessmaster.local",
            username=f"guest_{guest_id}",
            hashed_password=None,
            role=UserRole.GUEST,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        await ProfileService.ensure_user_defaults(db, user)

        access = create_access_token(str(user.id), user.role.value)
        refresh, jti = create_refresh_token(str(user.id))

        from app.core.config import get_settings

        settings = get_settings()
        session = Session(
            user_id=user.id,
            refresh_jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            user_agent=user_agent,
            ip_address=ip,
        )
        db.add(session)

        result = await db.execute(
            select(User)
            .options(selectinload(User.profile), selectinload(User.preferences))
            .where(User.id == user.id)
        )
        user = result.scalar_one()
        return user, access, refresh

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> str | None:
        """Create reset token. Returns reset URL when SMTP is off (local dev)."""
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password or user.role == UserRole.GUEST:
            return None

        raw_token = token_urlsafe(32)
        token = PasswordResetToken(
            user_id=user.id,
            token_hash=AuthService._hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(token)

        from app.core.config import get_settings

        settings = get_settings()
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
        sent = await EmailService.send_email(
            user.email,
            "Reset your ChessMaster Pro password",
            f"Use this link to reset your password (expires in 1 hour):\n{reset_url}",
        )
        return None if sent else reset_url

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
        token_hash = AuthService._hash_token(token)
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
        )
        reset = result.scalar_one_or_none()
        if not reset:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

        user_result = await db.execute(select(User).where(User.id == reset.user_id))
        user = user_result.scalar_one_or_none()
        if not user or user.role == UserRole.GUEST:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

        user.hashed_password = hash_password(new_password)
        reset.used_at = now

    @staticmethod
    async def request_email_verification(db: AsyncSession, user: User) -> str | None:
        """Send verification email when SMTP is configured. Returns verify URL when email was not sent."""
        if user.is_verified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
        if user.role == UserRole.GUEST:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest accounts cannot verify email")

        raw_token = token_urlsafe(32)
        token = EmailVerificationToken(
            user_id=user.id,
            token_hash=AuthService._hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(token)

        from app.core.config import get_settings

        settings = get_settings()
        verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
        sent = await EmailService.send_email(
            user.email,
            "Verify your ChessMaster Pro email",
            f"Confirm your email address (expires in 24 hours):\n{verify_url}",
        )
        return None if sent else verify_url

    @staticmethod
    async def confirm_email_verification(db: AsyncSession, token: str) -> None:
        token_hash = AuthService._hash_token(token)
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at.is_(None),
                EmailVerificationToken.expires_at > now,
            )
        )
        verify = result.scalar_one_or_none()
        if not verify:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

        user_result = await db.execute(select(User).where(User.id == verify.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

        user.is_verified = True
        verify.used_at = now

    @staticmethod
    async def delete_account(db: AsyncSession, user: User) -> None:
        """Delete user and related data (Google Play account deletion requirement)."""
        user_id = user.id
        await db.execute(
            update(Game).where(Game.white_player_id == user_id).values(white_player_id=None)
        )
        await db.execute(
            update(Game).where(Game.black_player_id == user_id).values(black_player_id=None)
        )
        await db.execute(
            update(Game).where(Game.winner_id == user_id).values(winner_id=None)
        )
        await db.execute(delete(Session).where(Session.user_id == user_id))
        await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
        await db.execute(delete(EmailVerificationToken).where(EmailVerificationToken.user_id == user_id))
        await db.delete(user)

    @staticmethod
    def _google_oauth_settings():
        from app.core.config import get_settings

        settings = get_settings()
        if not settings.GOOGLE_CLIENT_ID.strip() or not settings.GOOGLE_CLIENT_SECRET.strip():
            return None
        return settings

    @staticmethod
    def google_oauth_status() -> dict:
        oauth_settings = AuthService._google_oauth_settings()
        if oauth_settings is None:
            return {
                "message": "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
                "status": "not_configured",
                "authorize_url": None,
            }
        state = create_oauth_state_token()
        params = urlencode(
            {
                "client_id": oauth_settings.GOOGLE_CLIENT_ID,
                "redirect_uri": oauth_settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "online",
                "prompt": "select_account",
            }
        )
        return {
            "message": "Redirect the user to authorize_url to sign in with Google.",
            "status": "configured",
            "authorize_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}",
        }

    @staticmethod
    async def _unique_username(db: AsyncSession, base: str) -> str:
        cleaned = re.sub(r"[^a-z0-9_]", "", base.lower())[:40] or "player"
        candidate = cleaned
        suffix = 0
        while True:
            result = await db.execute(select(User).where(User.username == candidate))
            if result.scalar_one_or_none() is None:
                return candidate
            suffix += 1
            candidate = f"{cleaned}_{suffix}"

    @staticmethod
    async def google_oauth_login(
        db: AsyncSession,
        code: str,
        state: str,
        user_agent: str | None,
        ip: str | None,
    ) -> tuple[User, str, str]:
        oauth_settings = AuthService._google_oauth_settings()
        if oauth_settings is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured",
            )
        if not verify_oauth_state_token(state):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": oauth_settings.GOOGLE_CLIENT_ID,
                    "client_secret": oauth_settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": oauth_settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                logger.warning("Google token exchange failed: %s", token_resp.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange Google authorization code",
                )

            access_token = token_resp.json().get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google did not return an access token",
                )

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch Google profile",
                )

        profile_data = userinfo_resp.json()
        google_id = profile_data.get("sub")
        email = (profile_data.get("email") or "").strip().lower()
        email_verified = profile_data.get("email_verified", False)
        name = (profile_data.get("name") or "").strip()
        picture = profile_data.get("picture")

        if not google_id or not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete Google profile")
        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google email is not verified",
            )

        by_google = await db.execute(select(User).where(User.google_id == google_id))
        user = by_google.scalar_one_or_none()
        if user:
            if user.is_banned:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")
            return await AuthService.issue_session(db, user, user_agent, ip)

        by_email = await db.execute(select(User).where(User.email == email))
        user = by_email.scalar_one_or_none()
        if user:
            if user.role == UserRole.GUEST:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email belongs to a guest account. Register with a password first.",
                )
            if user.google_id and user.google_id != google_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already linked to a different Google account",
                )
            user.google_id = google_id
            if not user.is_verified:
                user.is_verified = True
            if picture:
                await ProfileService.ensure_user_defaults(db, user)
                profile_result = await db.execute(select(Profile).where(Profile.user_id == user.id))
                profile = profile_result.scalar_one_or_none()
                if profile and not profile.avatar_url:
                    profile.avatar_url = picture
            return await AuthService.issue_session(db, user, user_agent, ip)

        username_base = name.replace(" ", "_") if name else email.split("@", 1)[0]
        username = await AuthService._unique_username(db, username_base)
        user = User(
            email=email,
            username=username,
            hashed_password=None,
            role=UserRole.PLAYER,
            is_verified=True,
            google_id=google_id,
        )
        db.add(user)
        await db.flush()
        db.add(
            Profile(
                user_id=user.id,
                avatar_url=picture,
                gender=Gender.PREFER_NOT_TO_SAY,
                country=Country.PREFER_NOT_TO_SAY,
            )
        )
        from app.models import UserPreferences

        db.add(UserPreferences(user_id=user.id))
        await db.flush()
        return await AuthService.issue_session(db, user, user_agent, ip)

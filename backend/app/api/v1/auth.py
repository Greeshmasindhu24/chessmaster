from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginResponse,
    MessageResponse,
    OAuthStubResponse,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyEmailConfirmRequest,
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(data: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register(db, data)
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    user, access, refresh = await AuthService.issue_session(db, user, user_agent, ip)
    verify_url = None
    if EmailService.is_configured():
        verify_url = await AuthService.request_email_verification(db, user)
    return LoginResponse(
        access_token=access,
        refresh_token=refresh,
        user=user,
        verify_url=verify_url,
    )


@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    user, access, refresh = await AuthService.login(db, data, user_agent, ip)
    return LoginResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/guest", response_model=LoginResponse)
async def guest_login(request: Request, db: AsyncSession = Depends(get_db)):
    """Create a temporary guest account (Phase 1 scaffold)."""
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    user, access, refresh = await AuthService.create_guest(db, user_agent, ip)
    return LoginResponse(access_token=access, refresh_token=refresh, user=user)


@router.get("/google", response_model=OAuthStubResponse)
async def google_oauth_start():
    """Google OAuth entry point — returns authorize URL when configured."""
    return OAuthStubResponse(**AuthService.google_oauth_status())


@router.get("/google/callback", response_model=OAuthStubResponse)
async def google_oauth_callback():
    """Google OAuth callback — full token exchange in Phase 2."""
    status = AuthService.google_oauth_status()
    status["message"] = "Google OAuth callback not implemented yet (Phase 2)."
    return OAuthStubResponse(**status)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    reset_url = await AuthService.request_password_reset(db, data.email)
    return MessageResponse(
        message="If that email exists, a reset link has been sent.",
        reset_url=reset_url,
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.reset_password(db, data.token, data.new_password)
    return MessageResponse(message="Password updated successfully. You can sign in now.")


@router.post("/verify-email/request", response_model=MessageResponse)
async def request_verify_email(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    smtp_on = EmailService.is_configured()
    await AuthService.request_email_verification(db, user)
    if smtp_on:
        return MessageResponse(message="Verification link sent. Check your inbox and spam folder.")
    return MessageResponse(message="Email verification not required.")


@router.post("/verify-email/confirm", response_model=MessageResponse)
async def confirm_verify_email(data: VerifyEmailConfirmRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.confirm_email_verification(db, data.token)
    return MessageResponse(message="Email verified successfully.")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    access, refresh_token = await AuthService.refresh(db, data.refresh_token)
    return TokenResponse(access_token=access, refresh_token=refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(data: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.logout(db, data.refresh_token)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.delete("/account", response_model=MessageResponse)
async def delete_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await AuthService.delete_account(db, user)
    return MessageResponse(message="Account deleted successfully")

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.auth import LoginResponse, MessageResponse, TokenRefreshRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register(db, data)
    return user


@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    user, access, refresh = await AuthService.login(db, data, user_agent, ip)
    return LoginResponse(access_token=access, refresh_token=refresh, user=user)


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

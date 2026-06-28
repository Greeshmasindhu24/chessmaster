from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    avatar_url: str | None = None
    country: str | None = None
    biography: str | None = None
    rating_bullet: int
    rating_blitz: int
    rating_rapid: int
    rating_classical: int
    rating_puzzle: int
    highest_rating: int
    games_played: int
    wins: int
    losses: int
    draws: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
    role: str
    is_verified: bool
    created_at: datetime
    profile: ProfileResponse | None = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailConfirmRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class OAuthStubResponse(BaseModel):
    message: str
    status: str = "not_configured"
    authorize_url: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    redis: str

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

MIN_REGISTRATION_AGE = 13


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class Country(str, Enum):
    INDIAN = "indian"
    OUTSIDE_INDIAN = "outside_indian"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


def validate_date_of_birth(value: date) -> date:
    today = date.today()
    if value > today:
        raise ValueError("Date of birth cannot be in the future")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < MIN_REGISTRATION_AGE:
        raise ValueError(f"You must be at least {MIN_REGISTRATION_AGE} years old to register")
    return value


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    avatar_url: str | None = None
    country: Country | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
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
    verify_url: str | None = None


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    date_of_birth: date
    gender: Gender
    country: Country | None = None

    @field_validator("date_of_birth")
    @classmethod
    def check_age(cls, value: date) -> date:
        return validate_date_of_birth(value)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255, description="Email or username")
    password: str = Field(min_length=1, max_length=128)


class MessageResponse(BaseModel):
    message: str
    reset_url: str | None = None
    verify_url: str | None = None


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

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdateRequest(BaseModel):
    avatar_url: str | None = Field(default=None, max_length=512)
    country: str | None = Field(default=None, min_length=2, max_length=2, pattern=r"^[A-Z]{2}$")
    biography: str | None = Field(default=None, max_length=2000)


class PublicProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    avatar_url: str | None = None
    country: str | None = None
    biography: str | None = None
    rating_bullet: int
    rating_blitz: int
    rating_rapid: int
    rating_classical: int
    games_played: int
    wins: int
    losses: int
    draws: int


class UserPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    theme: str
    board_theme: str
    sound_enabled: bool
    move_confirmation: bool


class UserPreferencesUpdate(BaseModel):
    theme: str | None = Field(default=None, pattern=r"^(dark|light)$")
    board_theme: str | None = Field(default=None, max_length=30)
    sound_enabled: bool | None = None
    move_confirmation: bool | None = None

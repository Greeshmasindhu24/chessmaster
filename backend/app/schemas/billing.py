from pydantic import BaseModel, Field


class AiTierResponse(BaseModel):
    id: str
    label: str
    description: str
    price_cents: int
    price_display: str
    level: int
    unlocked: bool
    requires_payment: bool


class OnlineTierResponse(AiTierResponse):
    time_control_seconds: int
    increment_seconds: int


class DummyPurchaseRequest(BaseModel):
    card_number: str = Field(min_length=13, max_length=23)
    expiry: str = Field(min_length=5, max_length=5, pattern=r"^\d{2}/\d{2}$")
    cvc: str = Field(min_length=3, max_length=4, pattern=r"^\d{3,4}$")
    cardholder_name: str = Field(min_length=2, max_length=100)


class PurchaseResponse(BaseModel):
    tier: str
    unlocked: bool
    transaction_id: str | None = None
    amount_cents: int | None = None
    price_display: str | None = None
    message: str

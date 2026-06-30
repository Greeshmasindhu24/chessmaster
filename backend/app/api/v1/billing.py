from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import RequirePlayer
from app.models import User
from app.schemas.billing import (
    AiTierResponse,
    DummyPurchaseRequest,
    OnlineTierResponse,
    PurchaseResponse,
    SubscriptionPlanResponse,
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["Billing"])

MONTHLY_SUBSCRIPTION_PRICE_CENTS = 999


@router.get("/subscription-plan", response_model=SubscriptionPlanResponse)
async def subscription_plan():
    settings = get_settings()
    stripe_ready = settings.stripe_configured
    return SubscriptionPlanResponse(
        id="monthly",
        label="Monthly subscription",
        description="Unlock premium features with a simple monthly plan.",
        price_cents=MONTHLY_SUBSCRIPTION_PRICE_CENTS,
        price_display=f"${MONTHLY_SUBSCRIPTION_PRICE_CENTS / 100:.2f}/mo",
        stripe_configured=stripe_ready,
        available=stripe_ready,
    )


@router.get("/ai-tiers", response_model=list[AiTierResponse])
async def list_ai_tiers(
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await BillingService.list_ai_tiers(db, user)


@router.post("/ai-tiers/{tier}/purchase", response_model=PurchaseResponse)
async def purchase_ai_tier(
    tier: str,
    data: DummyPurchaseRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    result = await BillingService.purchase_ai_tier(
        db,
        user,
        tier,
        data.card_number,
        data.expiry,
        data.cvc,
        data.cardholder_name,
    )
    return PurchaseResponse(**result)


@router.get("/online-tiers", response_model=list[OnlineTierResponse])
async def list_online_tiers(
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    return await BillingService.list_online_tiers(db, user)


@router.post("/online-tiers/{tier}/purchase", response_model=PurchaseResponse)
async def purchase_online_tier(
    tier: str,
    data: DummyPurchaseRequest,
    user: User = Depends(RequirePlayer),
    db: AsyncSession = Depends(get_db),
):
    result = await BillingService.purchase_online_tier(
        db,
        user,
        tier,
        data.card_number,
        data.expiry,
        data.cvc,
        data.cardholder_name,
    )
    return PurchaseResponse(**result)

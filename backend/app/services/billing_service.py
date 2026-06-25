import re
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AiTierPurchase, OnlineTierPurchase, User

# --- AI tiers ---
FREE_AI_TIER = "beginner"
AI_VALID_TIERS = ("beginner", "intermediate", "advanced", "expert")

AI_TIER_CATALOG: dict[str, dict] = {
    "beginner": {
        "label": "Beginner",
        "description": "Makes occasional mistakes — free for everyone",
        "price_cents": 0,
        "level": 1,
    },
    "intermediate": {
        "label": "Intermediate",
        "description": "Solid club-level play",
        "price_cents": 499,
        "level": 2,
    },
    "advanced": {
        "label": "Advanced",
        "description": "Strong tactical play",
        "price_cents": 999,
        "level": 3,
    },
    "expert": {
        "label": "Expert",
        "description": "Best available engine strength",
        "price_cents": 1499,
        "level": 4,
    },
}

# --- Online time-control tiers ---
FREE_ONLINE_TIER = "blitz"
ONLINE_VALID_TIERS = ("bullet", "blitz", "rapid", "classical")

ONLINE_TIER_CATALOG: dict[str, dict] = {
    "bullet": {
        "label": "Bullet 1+0",
        "description": "Ultra-fast 1 minute games",
        "price_cents": 499,
        "level": 1,
        "time_control_seconds": 60,
        "increment_seconds": 0,
    },
    "blitz": {
        "label": "Blitz 3+2",
        "description": "Quick blitz — free for everyone",
        "price_cents": 0,
        "level": 2,
        "time_control_seconds": 180,
        "increment_seconds": 2,
    },
    "rapid": {
        "label": "Rapid 10+0",
        "description": "Standard rapid time control",
        "price_cents": 999,
        "level": 3,
        "time_control_seconds": 600,
        "increment_seconds": 0,
    },
    "classical": {
        "label": "Classical 30+0",
        "description": "Long classical games",
        "price_cents": 1499,
        "level": 4,
        "time_control_seconds": 1800,
        "increment_seconds": 0,
    },
}

ONLINE_PRESET_TO_TIER: dict[tuple[int, int], str] = {
    (meta["time_control_seconds"], meta["increment_seconds"]): tier_id
    for tier_id, meta in ONLINE_TIER_CATALOG.items()
}


class BillingService:
    @staticmethod
    def format_price(cents: int) -> str:
        if cents == 0:
            return "Free"
        return f"${cents / 100:.2f}"

    @staticmethod
    def _validate_dummy_card(card_number: str, expiry: str, cvc: str, cardholder_name: str) -> str:
        digits = re.sub(r"\D", "", card_number)
        if len(digits) < 13 or len(digits) > 19:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid card number")
        if not re.match(r"^\d{2}/\d{2}$", expiry):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expiry must be MM/YY")
        if not re.match(r"^\d{3,4}$", cvc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CVC")
        if len(cardholder_name.strip()) < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cardholder name required")
        if digits.startswith("0000"):
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Payment declined")
        return digits[-4:]

    @staticmethod
    def _tier_payload(tier_id: str, meta: dict, unlocked: set[str]) -> dict:
        return {
            "id": tier_id,
            "label": meta["label"],
            "description": meta["description"],
            "price_cents": meta["price_cents"],
            "price_display": BillingService.format_price(meta["price_cents"]),
            "level": meta["level"],
            "unlocked": tier_id in unlocked,
            "requires_payment": meta["price_cents"] > 0,
        }

    # --- AI ---
    @staticmethod
    def _normalize_ai_tier(tier: str) -> str:
        normalized = tier.lower().strip()
        if normalized not in AI_VALID_TIERS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid AI tier")
        return normalized

    @staticmethod
    async def get_unlocked_ai_tiers(db: AsyncSession, user_id: UUID) -> set[str]:
        unlocked = {FREE_AI_TIER}
        result = await db.execute(select(AiTierPurchase.tier).where(AiTierPurchase.user_id == user_id))
        unlocked.update(row[0] for row in result.all())
        return unlocked

    @staticmethod
    async def list_ai_tiers(db: AsyncSession, user: User) -> list[dict]:
        unlocked = await BillingService.get_unlocked_ai_tiers(db, user.id)
        return [
            BillingService._tier_payload(tier_id, AI_TIER_CATALOG[tier_id], unlocked)
            for tier_id in AI_VALID_TIERS
        ]

    @staticmethod
    async def require_tier_access(db: AsyncSession, user: User, tier: str) -> None:
        tier = BillingService._normalize_ai_tier(tier)
        if tier == FREE_AI_TIER:
            return
        unlocked = await BillingService.get_unlocked_ai_tiers(db, user.id)
        if tier not in unlocked:
            meta = AI_TIER_CATALOG[tier]
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "message": f"Upgrade required to play {meta['label']} AI",
                    "tier": tier,
                    "product": "ai",
                    "price_cents": meta["price_cents"],
                    "price_display": BillingService.format_price(meta["price_cents"]),
                },
            )

    @staticmethod
    async def purchase_ai_tier(
        db: AsyncSession,
        user: User,
        tier: str,
        card_number: str,
        expiry: str,
        cvc: str,
        cardholder_name: str,
    ) -> dict:
        tier = BillingService._normalize_ai_tier(tier)
        return await BillingService._purchase_tier(
            db,
            user,
            tier,
            AI_TIER_CATALOG,
            AiTierPurchase,
            await BillingService.get_unlocked_ai_tiers(db, user.id),
            card_number,
            expiry,
            cvc,
            cardholder_name,
            "AI",
        )

    # --- Online ---
    @staticmethod
    def _normalize_online_tier(tier: str) -> str:
        normalized = tier.lower().strip()
        if normalized not in ONLINE_VALID_TIERS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid online tier")
        return normalized

    @staticmethod
    def resolve_online_tier(time_control_seconds: int, increment_seconds: int) -> str:
        tier = ONLINE_PRESET_TO_TIER.get((time_control_seconds, increment_seconds))
        if not tier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported time control for online play",
            )
        return tier

    @staticmethod
    async def get_unlocked_online_tiers(db: AsyncSession, user_id: UUID) -> set[str]:
        unlocked = {FREE_ONLINE_TIER}
        result = await db.execute(
            select(OnlineTierPurchase.tier).where(OnlineTierPurchase.user_id == user_id)
        )
        unlocked.update(row[0] for row in result.all())
        return unlocked

    @staticmethod
    async def list_online_tiers(db: AsyncSession, user: User) -> list[dict]:
        unlocked = await BillingService.get_unlocked_online_tiers(db, user.id)
        tiers = []
        for tier_id in ONLINE_VALID_TIERS:
            meta = ONLINE_TIER_CATALOG[tier_id]
            payload = BillingService._tier_payload(tier_id, meta, unlocked)
            payload["time_control_seconds"] = meta["time_control_seconds"]
            payload["increment_seconds"] = meta["increment_seconds"]
            tiers.append(payload)
        return tiers

    @staticmethod
    async def require_online_tier_access(
        db: AsyncSession,
        user: User,
        time_control_seconds: int,
        increment_seconds: int,
    ) -> None:
        tier = BillingService.resolve_online_tier(time_control_seconds, increment_seconds)
        if tier == FREE_ONLINE_TIER:
            return
        unlocked = await BillingService.get_unlocked_online_tiers(db, user.id)
        if tier not in unlocked:
            meta = ONLINE_TIER_CATALOG[tier]
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "message": f"Upgrade required for {meta['label']} online",
                    "tier": tier,
                    "product": "online",
                    "price_cents": meta["price_cents"],
                    "price_display": BillingService.format_price(meta["price_cents"]),
                },
            )

    @staticmethod
    async def purchase_online_tier(
        db: AsyncSession,
        user: User,
        tier: str,
        card_number: str,
        expiry: str,
        cvc: str,
        cardholder_name: str,
    ) -> dict:
        tier = BillingService._normalize_online_tier(tier)
        return await BillingService._purchase_tier(
            db,
            user,
            tier,
            ONLINE_TIER_CATALOG,
            OnlineTierPurchase,
            await BillingService.get_unlocked_online_tiers(db, user.id),
            card_number,
            expiry,
            cvc,
            cardholder_name,
            "online",
        )

    @staticmethod
    async def _purchase_tier(
        db: AsyncSession,
        user: User,
        tier: str,
        catalog: dict,
        purchase_model: type,
        unlocked: set[str],
        card_number: str,
        expiry: str,
        cvc: str,
        cardholder_name: str,
        product_label: str,
    ) -> dict:
        meta = catalog[tier]

        if meta["price_cents"] == 0:
            return {
                "tier": tier,
                "unlocked": True,
                "transaction_id": None,
                "message": f"{meta['label']} is already free",
            }

        if tier in unlocked:
            return {
                "tier": tier,
                "unlocked": True,
                "transaction_id": None,
                "message": f"{meta['label']} is already unlocked",
            }

        card_last4 = BillingService._validate_dummy_card(card_number, expiry, cvc, cardholder_name)
        transaction_id = f"dummy_{secrets.token_hex(8)}"

        purchase = purchase_model(
            user_id=user.id,
            tier=tier,
            amount_cents=meta["price_cents"],
            transaction_id=transaction_id,
            card_last4=card_last4,
        )
        db.add(purchase)
        await db.flush()

        return {
            "tier": tier,
            "unlocked": True,
            "transaction_id": transaction_id,
            "amount_cents": meta["price_cents"],
            "price_display": BillingService.format_price(meta["price_cents"]),
            "message": f"Successfully unlocked {meta['label']} {product_label}",
        }

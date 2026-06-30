"""One-time purchase product catalog — source of truth for tier prices and Play Store IDs."""

FREE_AI_TIER = "beginner"
AI_VALID_TIERS = ("beginner", "intermediate", "advanced", "expert")

AI_TIER_CATALOG: dict[str, dict] = {
    "beginner": {
        "label": "Beginner",
        "description": "Makes occasional mistakes — free for everyone",
        "price_cents": 0,
        "level": 1,
        "google_play_product_id": None,
    },
    "intermediate": {
        "label": "Intermediate",
        "description": "Solid club-level play",
        "price_cents": 499,
        "level": 2,
        "google_play_product_id": "cmp_ai_intermediate",
    },
    "advanced": {
        "label": "Advanced",
        "description": "Strong tactical play",
        "price_cents": 999,
        "level": 3,
        "google_play_product_id": "cmp_ai_advanced",
    },
    "expert": {
        "label": "Expert",
        "description": "Strongest computer opponent",
        "price_cents": 1499,
        "level": 4,
        "google_play_product_id": "cmp_ai_expert",
    },
}

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
        "google_play_product_id": "cmp_online_bullet",
    },
    "blitz": {
        "label": "Quick play 3+2",
        "description": "Fast timed games — free for everyone",
        "price_cents": 0,
        "level": 2,
        "time_control_seconds": 180,
        "increment_seconds": 2,
        "google_play_product_id": None,
    },
    "rapid": {
        "label": "Rapid 10+0",
        "description": "Standard rapid time control",
        "price_cents": 999,
        "level": 3,
        "time_control_seconds": 600,
        "increment_seconds": 0,
        "google_play_product_id": "cmp_online_rapid",
    },
    "classical": {
        "label": "Classical 30+0",
        "description": "Long classical games",
        "price_cents": 1499,
        "level": 4,
        "time_control_seconds": 1800,
        "increment_seconds": 0,
        "google_play_product_id": "cmp_online_classical",
    },
}

ONLINE_PRESET_TO_TIER: dict[tuple[int, int], str] = {
    (meta["time_control_seconds"], meta["increment_seconds"]): tier_id
    for tier_id, meta in ONLINE_TIER_CATALOG.items()
}

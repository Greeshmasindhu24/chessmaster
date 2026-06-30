from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Profile, User


class RankingsService:
    @staticmethod
    async def leaderboard(db: AsyncSession, limit: int = 50) -> list[dict]:
        result = await db.execute(
            select(User, Profile)
            .join(Profile, Profile.user_id == User.id)
            .where(User.is_active.is_(True), User.is_banned.is_(False))
            .order_by(Profile.rating_blitz.desc(), Profile.games_played.desc())
            .limit(limit)
        )

        entries: list[dict] = []
        for rank, (user, profile) in enumerate(result.all(), start=1):
            entries.append(
                {
                    "rank": rank,
                    "user_id": user.id,
                    "username": user.username,
                    "avatar_url": profile.avatar_url,
                    "rating_blitz": profile.rating_blitz,
                    "games_played": profile.games_played,
                    "wins": profile.wins,
                }
            )
        return entries

import json
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models import User
from app.services.game_service import GameService

QUEUE_PREFIX = "matchmaking:queue"


class MatchmakingService:
    @staticmethod
    def _queue_key(time_control_seconds: int, increment_seconds: int) -> str:
        return f"{QUEUE_PREFIX}:{time_control_seconds}:{increment_seconds}"

    @staticmethod
    async def enqueue(
        user: User,
        time_control_seconds: int = 600,
        increment_seconds: int = 0,
    ) -> tuple[str, User | None, int, int]:
        """Add player to queue. Returns (status, opponent|None, tc, increment)."""
        redis = get_redis()
        key = MatchmakingService._queue_key(time_control_seconds, increment_seconds)
        entry = json.dumps({"user_id": str(user.id), "username": user.username})

        await redis.lrem(key, 0, entry)

        raw_opponent = await redis.lpop(key)
        if raw_opponent:
            opponent_data = json.loads(raw_opponent)
            if opponent_data["user_id"] == str(user.id):
                await redis.rpush(key, raw_opponent)
                await redis.rpush(key, entry)
                return "waiting", None, time_control_seconds, increment_seconds

            opponent = User(id=UUID(opponent_data["user_id"]), username=opponent_data["username"])
            return "matched", opponent, time_control_seconds, increment_seconds

        await redis.rpush(key, entry)
        await redis.expire(key, 300)
        return "waiting", None, time_control_seconds, increment_seconds

    @staticmethod
    async def dequeue(user: User, time_control_seconds: int, increment_seconds: int) -> None:
        redis = get_redis()
        key = MatchmakingService._queue_key(time_control_seconds, increment_seconds)
        entry = json.dumps({"user_id": str(user.id), "username": user.username})
        await redis.lrem(key, 0, entry)

    @staticmethod
    async def create_match_from_queue(
        db: AsyncSession,
        white: User,
        black: User,
        time_control_seconds: int,
        increment_seconds: int,
    ):
        return await GameService.create_match_game(
            db, white, black, time_control_seconds, increment_seconds
        )

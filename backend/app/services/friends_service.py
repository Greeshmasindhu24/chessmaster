from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Friendship, FriendshipStatus, NotificationType, Profile, User
from app.services.notifications_service import NotificationsService


class FriendsService:
    @staticmethod
    async def _friend_summary(db: AsyncSession, user_id: UUID) -> dict:
        result = await db.execute(
            select(User, Profile)
            .join(Profile, Profile.user_id == User.id)
            .where(User.id == user_id)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user, profile = row
        return {
            "id": user.id,
            "username": user.username,
            "avatar_url": profile.avatar_url,
            "rating_blitz": profile.rating_blitz,
        }

    @staticmethod
    async def list_friends(db: AsyncSession, user: User) -> list[dict]:
        result = await db.execute(
            select(Friendship)
            .where(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(Friendship.user_id == user.id, Friendship.friend_id == user.id),
            )
            .order_by(Friendship.updated_at.desc())
        )
        friendships = result.scalars().all()
        items: list[dict] = []
        for f in friendships:
            other_id = f.friend_id if f.user_id == user.id else f.user_id
            friend = await FriendsService._friend_summary(db, other_id)
            items.append(
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "friend_id": f.friend_id,
                    "status": f.status.value,
                    "created_at": f.created_at,
                    "friend": friend,
                }
            )
        return items

    @staticmethod
    async def list_pending_incoming(db: AsyncSession, user: User) -> list[dict]:
        result = await db.execute(
            select(Friendship)
            .where(
                Friendship.friend_id == user.id,
                Friendship.status == FriendshipStatus.PENDING,
            )
            .order_by(Friendship.created_at.desc())
        )
        items: list[dict] = []
        for f in result.scalars().all():
            requester = await FriendsService._friend_summary(db, f.user_id)
            items.append(
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "friend_id": f.friend_id,
                    "status": f.status.value,
                    "created_at": f.created_at,
                    "friend": requester,
                }
            )
        return items

    @staticmethod
    async def _existing_friendship(
        db: AsyncSession, user_a: UUID, user_b: UUID
    ) -> Friendship | None:
        result = await db.execute(
            select(Friendship).where(
                or_(
                    and_(Friendship.user_id == user_a, Friendship.friend_id == user_b),
                    and_(Friendship.user_id == user_b, Friendship.friend_id == user_a),
                )
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def send_request(db: AsyncSession, user: User, username: str) -> dict:
        target_result = await db.execute(
            select(User).where(func.lower(User.username) == username.strip().lower())
        )
        target = target_result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if target.id == user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot friend yourself")

        existing = await FriendsService._existing_friendship(db, user.id, target.id)
        if existing:
            if existing.status == FriendshipStatus.ACCEPTED:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already friends")
            if existing.status == FriendshipStatus.PENDING:
                if existing.user_id == user.id:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request already sent")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This user already sent you a request — accept it instead",
                )

        friendship = Friendship(
            user_id=user.id,
            friend_id=target.id,
            status=FriendshipStatus.PENDING,
        )
        db.add(friendship)
        await db.flush()

        await NotificationsService.create(
            db,
            target.id,
            NotificationType.FRIEND_REQUEST,
            "Friend request",
            f"{user.username} sent you a friend request",
            {"friendship_id": str(friendship.id), "from_user_id": str(user.id), "from_username": user.username},
        )

        friend = await FriendsService._friend_summary(db, target.id)
        return {
            "id": friendship.id,
            "user_id": friendship.user_id,
            "friend_id": friendship.friend_id,
            "status": friendship.status.value,
            "created_at": friendship.created_at,
            "friend": friend,
        }

    @staticmethod
    async def respond_to_request(
        db: AsyncSession, user: User, friendship_id: UUID, accept: bool
    ) -> dict:
        result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
        friendship = result.scalar_one_or_none()
        if not friendship:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        if friendship.friend_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request to answer")
        if friendship.status != FriendshipStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

        if accept:
            friendship.status = FriendshipStatus.ACCEPTED
            await NotificationsService.create(
                db,
                friendship.user_id,
                NotificationType.SYSTEM,
                "Friend request accepted",
                f"{user.username} accepted your friend request",
                {"friendship_id": str(friendship.id), "user_id": str(user.id), "username": user.username},
            )
        else:
            friendship.status = FriendshipStatus.DECLINED

        await db.flush()
        other_id = friendship.user_id if accept else friendship.friend_id
        friend = await FriendsService._friend_summary(db, other_id if accept else friendship.user_id)
        return {
            "id": friendship.id,
            "user_id": friendship.user_id,
            "friend_id": friendship.friend_id,
            "status": friendship.status.value,
            "created_at": friendship.created_at,
            "friend": friend,
        }

    @staticmethod
    async def search_users(db: AsyncSession, user: User, query: str, limit: int = 10) -> list[dict]:
        q = query.strip()
        if len(q) < 2:
            return []

        pattern = f"%{q.lower()}%"
        result = await db.execute(
            select(User, Profile)
            .join(Profile, Profile.user_id == User.id)
            .where(
                User.id != user.id,
                User.is_active.is_(True),
                func.lower(User.username).like(pattern),
            )
            .limit(limit)
        )

        items: list[dict] = []
        for target, profile in result.all():
            existing = await FriendsService._existing_friendship(db, user.id, target.id)
            status_value = None
            if existing:
                if existing.status == FriendshipStatus.ACCEPTED:
                    status_value = "accepted"
                elif existing.status == FriendshipStatus.PENDING:
                    status_value = "pending_sent" if existing.user_id == user.id else "pending_received"
                else:
                    status_value = "declined"

            items.append(
                {
                    "id": target.id,
                    "username": target.username,
                    "avatar_url": profile.avatar_url,
                    "rating_blitz": profile.rating_blitz,
                    "friendship_status": status_value,
                }
            )
        return items

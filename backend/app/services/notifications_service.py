from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationType


class NotificationsService:
    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        ntype: NotificationType,
        title: str,
        message: str,
        data: dict | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=ntype,
            title=title,
            message=message,
            data=data,
        )
        db.add(notification)
        await db.flush()
        return notification

    @staticmethod
    async def list_for_user(db: AsyncSession, user_id: UUID, limit: int = 30) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def unread_count(db: AsyncSession, user_id: UUID) -> int:
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return len(result.scalars().all())

    @staticmethod
    async def mark_read(
        db: AsyncSession,
        user_id: UUID,
        notification_ids: list[UUID] | None = None,
    ) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        if notification_ids:
            stmt = stmt.where(Notification.id.in_(notification_ids))

        result = await db.execute(stmt)
        return result.rowcount or 0

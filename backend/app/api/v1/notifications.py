from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.notifications import MarkNotificationsReadRequest, NotificationResponse
from app.services.notifications_service import NotificationsService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationsService.list_for_user(db, user.id)


@router.get("/unread-count")
async def unread_notification_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await NotificationsService.unread_count(db, user.id)
    return {"count": count}


@router.post("/mark-read")
async def mark_notifications_read(
    data: MarkNotificationsReadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await NotificationsService.mark_read(db, user.id, data.notification_ids)
    return {"updated": updated}

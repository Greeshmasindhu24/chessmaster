from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    message: str
    data: dict | None = None
    is_read: bool
    created_at: datetime


class MarkNotificationsReadRequest(BaseModel):
    notification_ids: list[UUID] | None = None

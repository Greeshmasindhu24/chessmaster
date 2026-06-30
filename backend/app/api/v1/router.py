from fastapi import APIRouter

from app.api.v1 import analysis, auth, billing, friends, games, health, notifications, rankings, users
from app.websocket import events as ws_events

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(billing.router)
api_router.include_router(games.router)
api_router.include_router(analysis.router)
api_router.include_router(friends.router)
api_router.include_router(notifications.router)
api_router.include_router(rankings.router)
api_router.include_router(ws_events.router)

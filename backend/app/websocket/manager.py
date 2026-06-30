import json
from uuid import UUID

from fastapi import WebSocket

from app.core.redis import get_redis


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}
        self.user_games: dict[str, str] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
            except Exception:
                pass
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str, websocket: WebSocket | None = None) -> None:
        if websocket is not None and self.active_connections.get(user_id) is not websocket:
            return
        self.active_connections.pop(user_id, None)
        self.user_games.pop(user_id, None)

    def bind_game(self, user_id: str, game_id: str) -> None:
        self.user_games[user_id] = game_id

    async def send_event(self, user_id: str, event: str, payload: dict) -> None:
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_json({"event": event, "data": payload})

    async def broadcast_game(self, game_id: str, event: str, payload: dict, exclude: str | None = None) -> None:
        for user_id, bound_game in self.user_games.items():
            if bound_game == game_id and user_id != exclude:
                await self.send_event(user_id, event, payload)

    async def notify_game_players(
        self,
        white_id: UUID | None,
        black_id: UUID | None,
        event: str,
        payload: dict,
    ) -> None:
        if white_id:
            await self.send_event(str(white_id), event, payload)
        if black_id:
            await self.send_event(str(black_id), event, payload)

    async def set_game_room(self, game_id: str, white_id: str | None, black_id: str | None) -> None:
        redis = get_redis()
        players = [p for p in (white_id, black_id) if p]
        if players:
            await redis.sadd(f"game:room:{game_id}", *players)
            await redis.expire(f"game:room:{game_id}", 86400)
        if white_id:
            self.bind_game(white_id, game_id)
        if black_id:
            self.bind_game(black_id, game_id)

    async def get_game_state(self, game_id: str) -> dict | None:
        redis = get_redis()
        raw = await redis.get(f"game:state:{game_id}")
        if not raw:
            return None
        return json.loads(raw)


manager = ConnectionManager()

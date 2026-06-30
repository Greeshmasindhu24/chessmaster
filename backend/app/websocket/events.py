import json
from uuid import UUID

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token, verify_token_type
from app.models import Game, User
from app.services.game_service import GameService
from app.services.matchmaking_service import MatchmakingService
from app.websocket.manager import manager

router = APIRouter(tags=["WebSocket"])


async def _authenticate_ws(token: str) -> User | None:
    try:
        payload = decode_token(token)
        if not verify_token_type(payload, "access"):
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active or user.is_banned:
            return None
        return user


async def _load_game(db: AsyncSession, game_id: UUID) -> Game | None:
    result = await db.execute(
        select(Game).where(Game.id == game_id).options(selectinload(Game.moves))
    )
    return result.scalar_one_or_none()


@router.websocket("/ws/game")
async def game_websocket(websocket: WebSocket, token: str = ""):
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user = await _authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = str(user.id)
    await manager.connect(user_id, websocket)
    last_matchmaking: dict = {"time_control_seconds": 600, "increment_seconds": 0}

    try:
        await manager.send_event(user_id, "connected", {"user_id": user_id, "username": user.username})

        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_event(user_id, "error", {"message": "Invalid JSON"})
                continue

            msg_type = message.get("type")
            data = message.get("data", {})

            if msg_type == "find_match":
                last_matchmaking = {
                    "time_control_seconds": data.get("time_control_seconds", 600),
                    "increment_seconds": data.get("increment_seconds", 0),
                }

            if msg_type == "join_game":
                await _handle_join_game(user, data)
            elif msg_type == "find_match":
                await _handle_find_match(user, data)
            elif msg_type == "cancel_matchmaking":
                await _handle_cancel_matchmaking(user, data)
            elif msg_type == "move":
                await _handle_move(user, data)
            elif msg_type == "draw_offer":
                await _handle_draw_offer(user, data)
            elif msg_type == "draw_response":
                await _handle_draw_response(user, data)
            elif msg_type == "resign":
                await _handle_resign(user, data)
            elif msg_type == "chat_message":
                await _handle_chat(user, data)
            elif msg_type == "timer_sync":
                await _handle_timer_sync(user, data)
            else:
                await manager.send_event(user_id, "error", {"message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        await MatchmakingService.dequeue(
            user,
            last_matchmaking["time_control_seconds"],
            last_matchmaking["increment_seconds"],
        )
    except Exception:
        manager.disconnect(user_id, websocket)


async def _handle_join_game(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    if not game_id:
        await manager.send_event(str(user.id), "error", {"message": "game_id required"})
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            await manager.send_event(str(user.id), "error", {"message": "Game not found"})
            return
        if user.id not in (game.white_player_id, game.black_player_id):
            await manager.send_event(str(user.id), "error", {"message": "Not a participant"})
            return

        await manager.set_game_room(
            str(game.id),
            str(game.white_player_id) if game.white_player_id else None,
            str(game.black_player_id) if game.black_player_id else None,
        )

        state = await GameService.get_redis_state(game.id) or {}
        await manager.send_event(
            str(user.id),
            "player_joined",
            {
                "game_id": str(game.id),
                "room_code": game.room_code,
                "fen": game.fen,
                "white_player_id": str(game.white_player_id) if game.white_player_id else None,
                "black_player_id": str(game.black_player_id) if game.black_player_id else None,
                "status": game.status.value,
                "your_color": "white" if user.id == game.white_player_id else "black",
                "white_time_ms": state.get("white_time_ms", game.time_control_seconds * 1000),
                "black_time_ms": state.get("black_time_ms", game.time_control_seconds * 1000),
            },
        )

        opponent_id = (
            str(game.black_player_id)
            if user.id == game.white_player_id
            else str(game.white_player_id)
        )
        if opponent_id and opponent_id in manager.active_connections:
            await manager.send_event(
                opponent_id,
                "player_joined",
                {
                    "game_id": str(game.id),
                    "room_code": game.room_code,
                    "fen": game.fen,
                    "username": user.username,
                    "user_id": str(user.id),
                    "status": game.status.value,
                    "your_color": "white" if UUID(opponent_id) == game.white_player_id else "black",
                    "white_time_ms": state.get("white_time_ms", game.time_control_seconds * 1000),
                    "black_time_ms": state.get("black_time_ms", game.time_control_seconds * 1000),
                },
            )


async def _handle_find_match(user: User, data: dict) -> None:
    tc = data.get("time_control_seconds", 600)
    inc = data.get("increment_seconds", 0)

    async with AsyncSessionLocal() as db:
        try:
            from app.services.billing_service import BillingService

            await BillingService.require_online_tier_access(db, user, tc, inc)
        except HTTPException as exc:
            if isinstance(exc.detail, dict):
                detail = exc.detail.get("message", "Payment required")
            else:
                detail = str(exc.detail)
            await manager.send_event(str(user.id), "error", {"message": detail, "code": "payment_required"})
            return

        status, opponent, tc, inc = await MatchmakingService.enqueue(user, tc, inc)

        if status == "waiting":
            await manager.send_event(
                str(user.id),
                "matchmaking",
                {"status": "waiting", "time_control_seconds": tc, "increment_seconds": inc},
            )
            return

        white, black = (user, opponent) if str(user.id) < str(opponent.id) else (opponent, user)
        game = await MatchmakingService.create_match_from_queue(db, white, black, tc, inc)
        await db.commit()

        match_payload = {
            "game_id": str(game.id),
            "room_code": game.room_code,
            "fen": game.fen,
            "time_control_seconds": tc,
            "increment_seconds": inc,
            "white_player_id": str(game.white_player_id),
            "black_player_id": str(game.black_player_id),
        }

        await manager.set_game_room(
            str(game.id),
            str(game.white_player_id),
            str(game.black_player_id),
        )

        await manager.send_event(
            str(white.id),
            "match_found",
            {**match_payload, "your_color": "white", "opponent": black.username},
        )
        await manager.send_event(
            str(black.id),
            "match_found",
            {**match_payload, "your_color": "black", "opponent": white.username},
        )


async def _handle_cancel_matchmaking(user: User, data: dict) -> None:
    tc = data.get("time_control_seconds", 600)
    inc = data.get("increment_seconds", 0)
    await MatchmakingService.dequeue(user, tc, inc)
    await manager.send_event(str(user.id), "matchmaking", {"status": "cancelled"})


async def _handle_move(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    uci = data.get("uci")
    time_remaining_ms = data.get("time_remaining_ms")

    if not game_id or not uci:
        await manager.send_event(str(user.id), "error", {"message": "game_id and uci required"})
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            await manager.send_event(str(user.id), "error", {"message": "Game not found"})
            return

        try:
            move, payload = await GameService.apply_move(db, game, user, uci, time_remaining_ms)
            await db.commit()
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            await manager.send_event(str(user.id), "error", {"message": detail})
            return
        except Exception as exc:
            await manager.send_event(str(user.id), "error", {"message": str(exc)})
            return

        await manager.notify_game_players(
            game.white_player_id,
            game.black_player_id,
            "move_played",
            payload,
        )

        if payload.get("result"):
            await manager.notify_game_players(
                game.white_player_id,
                game.black_player_id,
                "game_finished",
                {"game_id": str(game.id), "result": payload["result"]},
            )


async def _handle_draw_offer(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    if not game_id:
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            return

        opponent_id = (
            game.black_player_id if user.id == game.white_player_id else game.white_player_id
        )
        if opponent_id:
            await manager.send_event(
                str(opponent_id),
                "draw_offer",
                {"game_id": str(game.id), "from_user_id": str(user.id), "username": user.username},
            )


async def _handle_draw_response(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    accepted = data.get("accepted", False)
    if not game_id:
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            return

        if accepted:
            await GameService.finish_game(db, game, "1/2-1/2")
            await db.commit()
            await manager.notify_game_players(
                game.white_player_id,
                game.black_player_id,
                "game_finished",
                {"game_id": str(game.id), "result": "1/2-1/2", "reason": "draw_agreement"},
            )
        else:
            opponent_id = (
                game.black_player_id if user.id == game.white_player_id else game.white_player_id
            )
            if opponent_id:
                await manager.send_event(
                    str(opponent_id),
                    "draw_offer",
                    {"game_id": str(game.id), "declined": True},
                )


async def _handle_resign(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    if not game_id:
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            return

        if user.id == game.white_player_id:
            result, winner = "0-1", game.black_player_id
        elif user.id == game.black_player_id:
            result, winner = "1-0", game.white_player_id
        else:
            return

        await GameService.finish_game(db, game, result, winner)
        await db.commit()
        await manager.notify_game_players(
            game.white_player_id,
            game.black_player_id,
            "game_finished",
            {"game_id": str(game.id), "result": result, "reason": "resignation"},
        )


async def _handle_chat(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    text = data.get("text", "").strip()
    if not game_id or not text:
        return

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            return

        payload = {
            "game_id": str(game.id),
            "user_id": str(user.id),
            "username": user.username,
            "text": text[:500],
        }
        await manager.notify_game_players(
            game.white_player_id,
            game.black_player_id,
            "chat_message",
            payload,
        )


async def _handle_timer_sync(user: User, data: dict) -> None:
    game_id = data.get("game_id")
    if not game_id:
        return

    payload = {
        "game_id": game_id,
        "white_time_ms": data.get("white_time_ms"),
        "black_time_ms": data.get("black_time_ms"),
    }

    async with AsyncSessionLocal() as db:
        game = await _load_game(db, UUID(game_id))
        if not game:
            return

        opponent_id = (
            game.black_player_id if user.id == game.white_player_id else game.white_player_id
        )
        if opponent_id:
            await manager.send_event(str(opponent_id), "timer_update", payload)

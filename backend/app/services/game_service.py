import json
import secrets
import string
from datetime import datetime, timezone
from uuid import UUID

import chess
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.redis import get_redis
from app.models import Game, GameMode, GameStatus, Move, Profile, User
from app.services.ai_service import AiService
from app.services.billing_service import BillingService

START_FEN = chess.STARTING_FEN
ELO_K = 32


def _elo_expected(my_rating: int, opp_rating: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opp_rating - my_rating) / 400.0))


def _elo_delta(my_rating: int, opp_rating: int, score: float) -> int:
    return round(ELO_K * (score - _elo_expected(my_rating, opp_rating)))


def _generate_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def validate_move(fen: str, uci: str) -> tuple[chess.Move, str, str]:
    """Validate a UCI move against a FEN. Returns (move, san, fen_after)."""
    board = chess.Board(fen)
    try:
        move = chess.Move.from_uci(uci)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UCI move") from exc

    if move not in board.legal_moves:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal move")

    san = board.san(move)
    board.push(move)
    return move, san, board.fen()


class GameService:
    @staticmethod
    async def _record_player_result(
        db: AsyncSession,
        player_id: UUID | None,
        outcome: str,
    ) -> None:
        if not player_id:
            return
        result = await db.execute(select(Profile).where(Profile.user_id == player_id))
        profile = result.scalar_one_or_none()
        if not profile:
            return
        profile.games_played += 1
        if outcome == "win":
            profile.wins += 1
        elif outcome == "loss":
            profile.losses += 1
        else:
            profile.draws += 1

    @staticmethod
    async def record_game_stats(db: AsyncSession, game: Game) -> None:
        if game.status != GameStatus.FINISHED or not game.result:
            return
        if getattr(game, "_stats_recorded", False):
            return

        if game.result == "1/2-1/2":
            await GameService._record_player_result(db, game.white_player_id, "draw")
            await GameService._record_player_result(db, game.black_player_id, "draw")
        elif game.result == "1-0":
            await GameService._record_player_result(db, game.white_player_id, "win")
            await GameService._record_player_result(db, game.black_player_id, "loss")
        elif game.result == "0-1":
            await GameService._record_player_result(db, game.white_player_id, "loss")
            await GameService._record_player_result(db, game.black_player_id, "win")

        if game.mode == GameMode.ONLINE and game.white_player_id and game.black_player_id:
            await GameService._update_blitz_ratings(db, game)

        game._stats_recorded = True  # type: ignore[attr-defined]

    @staticmethod
    async def _update_blitz_ratings(db: AsyncSession, game: Game) -> None:
        white_result = await db.execute(select(Profile).where(Profile.user_id == game.white_player_id))
        black_result = await db.execute(select(Profile).where(Profile.user_id == game.black_player_id))
        white_profile = white_result.scalar_one_or_none()
        black_profile = black_result.scalar_one_or_none()
        if not white_profile or not black_profile:
            return

        if game.result == "1/2-1/2":
            white_score, black_score = 0.5, 0.5
        elif game.result == "1-0":
            white_score, black_score = 1.0, 0.0
        elif game.result == "0-1":
            white_score, black_score = 0.0, 1.0
        else:
            return

        white_delta = _elo_delta(white_profile.rating_blitz, black_profile.rating_blitz, white_score)
        black_delta = _elo_delta(black_profile.rating_blitz, white_profile.rating_blitz, black_score)

        white_profile.rating_blitz = max(100, white_profile.rating_blitz + white_delta)
        black_profile.rating_blitz = max(100, black_profile.rating_blitz + black_delta)
        white_profile.highest_rating = max(white_profile.highest_rating, white_profile.rating_blitz)
        black_profile.highest_rating = max(black_profile.highest_rating, black_profile.rating_blitz)

    @staticmethod
    async def create_ai_game(
        db: AsyncSession,
        user: User,
        difficulty: str = "intermediate",
        player_color: str = "white",
    ) -> tuple[Game, dict | None]:
        await BillingService.require_tier_access(db, user, difficulty)
        is_white = player_color == "white"
        game = Game(
            white_player_id=user.id if is_white else None,
            black_player_id=None if is_white else user.id,
            status=GameStatus.ACTIVE,
            mode=GameMode.AI,
            ai_difficulty=difficulty,
            time_control_seconds=600,
            increment_seconds=0,
            fen=START_FEN,
            room_code=_generate_room_code(),
            started_at=datetime.now(timezone.utc),
        )
        db.add(game)
        await db.flush()

        ai_payload: dict | None = None
        if not is_white:
            board = chess.Board(START_FEN)
            ai_move = AiService.get_move(board, difficulty)
            uci = ai_move.uci()
            san = board.san(ai_move)
            board.push(ai_move)
            fen_after = board.fen()
            move = Move(
                game_id=game.id,
                move_number=1,
                san=san,
                uci=uci,
                fen_after=fen_after,
            )
            db.add(move)
            game.fen = fen_after
            await db.flush()
            ai_payload = {"uci": uci, "san": san, "fen": fen_after}

        await GameService.sync_redis_state(game)
        return game, ai_payload

    @staticmethod
    async def apply_ai_player_move(
        db: AsyncSession,
        game: Game,
        user: User,
        uci: str,
    ) -> dict:
        if game.mode != GameMode.AI or game.status != GameStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not active")

        human_is_white = game.white_player_id == user.id
        human_is_black = game.black_player_id == user.id
        if not human_is_white and not human_is_black:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

        board = chess.Board(game.fen)
        if (board.turn == chess.WHITE and not human_is_white) or (
            board.turn == chess.BLACK and not human_is_black
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not your turn")

        _, san, fen_after = validate_move(game.fen, uci)
        move_number = len(game.moves) + 1
        move = Move(
            game_id=game.id,
            move_number=move_number,
            san=san,
            uci=uci,
            fen_after=fen_after,
        )
        db.add(move)
        game.fen = fen_after

        board = chess.Board(fen_after)
        result = GameService._detect_result(board, game)
        ai_payload: dict | None = None

        if not result and not board.is_game_over():
            difficulty = game.ai_difficulty or "intermediate"
            ai_move = AiService.get_move(board, difficulty)
            ai_uci = ai_move.uci()
            ai_san = board.san(ai_move)
            board.push(ai_move)
            ai_fen = board.fen()
            ai_move_number = move_number + 1
            ai_record = Move(
                game_id=game.id,
                move_number=ai_move_number,
                san=ai_san,
                uci=ai_uci,
                fen_after=ai_fen,
            )
            db.add(ai_record)
            game.fen = ai_fen
            board = chess.Board(ai_fen)
            result = GameService._detect_result(board, game)
            ai_payload = {"uci": ai_uci, "san": ai_san, "fen": ai_fen}

        await db.flush()
        await GameService.sync_redis_state(game)
        if result:
            await GameService.record_game_stats(db, game)

        return {
            "game_id": str(game.id),
            "player_move": {"uci": uci, "san": san, "fen": fen_after},
            "ai_move": ai_payload,
            "fen": game.fen,
            "status": game.status.value,
            "result": game.result,
        }

    @staticmethod
    def _detect_result(board: chess.Board, game: Game) -> str | None:
        if board.is_checkmate():
            game.status = GameStatus.FINISHED
            game.result = "1-0" if board.turn == chess.BLACK else "0-1"
            game.winner_id = game.white_player_id if board.turn == chess.BLACK else game.black_player_id
            game.finished_at = datetime.now(timezone.utc)
            return game.result
        if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
            game.status = GameStatus.FINISHED
            game.result = "1/2-1/2"
            game.finished_at = datetime.now(timezone.utc)
            return game.result
        return None

    @staticmethod
    async def create_game(
        db: AsyncSession,
        user: User,
        time_control_seconds: int = 600,
        increment_seconds: int = 0,
    ) -> Game:
        await BillingService.require_online_tier_access(db, user, time_control_seconds, increment_seconds)
        room_code = _generate_room_code()
        game = Game(
            white_player_id=user.id,
            status=GameStatus.WAITING,
            mode=GameMode.ONLINE,
            time_control_seconds=time_control_seconds,
            increment_seconds=increment_seconds,
            fen=START_FEN,
            room_code=room_code,
        )
        db.add(game)
        await db.flush()
        await GameService.sync_redis_state(game)
        return game

    @staticmethod
    async def join_game(db: AsyncSession, user: User, room_code: str) -> Game:
        result = await db.execute(
            select(Game).where(Game.room_code == room_code.upper()).options(selectinload(Game.moves))
        )
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
        if game.status != GameStatus.WAITING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not joinable")
        if game.white_player_id == user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot join your own game")
        if game.black_player_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is full")

        await BillingService.require_online_tier_access(
            db, user, game.time_control_seconds, game.increment_seconds
        )

        game.black_player_id = user.id
        game.status = GameStatus.ACTIVE
        game.started_at = datetime.now(timezone.utc)
        await db.flush()
        await GameService.sync_redis_state(game)
        return game

    @staticmethod
    async def get_game(db: AsyncSession, game_id: UUID, user: User | None = None) -> Game:
        result = await db.execute(
            select(Game).where(Game.id == game_id).options(selectinload(Game.moves))
        )
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
        if user and user.id not in (game.white_player_id, game.black_player_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")
        return game

    @staticmethod
    async def list_history(db: AsyncSession, user: User, limit: int = 20) -> list[Game]:
        result = await db.execute(
            select(Game)
            .where(
                or_(Game.white_player_id == user.id, Game.black_player_id == user.id),
                Game.status.in_([GameStatus.FINISHED, GameStatus.ABORTED, GameStatus.ACTIVE]),
            )
            .order_by(Game.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_match_game(
        db: AsyncSession,
        white: User,
        black: User,
        time_control_seconds: int,
        increment_seconds: int,
    ) -> Game:
        game = Game(
            white_player_id=white.id,
            black_player_id=black.id,
            status=GameStatus.ACTIVE,
            mode=GameMode.ONLINE,
            time_control_seconds=time_control_seconds,
            increment_seconds=increment_seconds,
            fen=START_FEN,
            room_code=_generate_room_code(),
            started_at=datetime.now(timezone.utc),
        )
        db.add(game)
        await db.flush()
        await GameService.sync_redis_state(game)
        return game

    @staticmethod
    async def sync_redis_state(game: Game) -> None:
        redis = get_redis()
        state = {
            "game_id": str(game.id),
            "room_code": game.room_code,
            "fen": game.fen,
            "white_player_id": str(game.white_player_id) if game.white_player_id else None,
            "black_player_id": str(game.black_player_id) if game.black_player_id else None,
            "white_time_ms": game.time_control_seconds * 1000,
            "black_time_ms": game.time_control_seconds * 1000,
            "increment_ms": game.increment_seconds * 1000,
            "last_move_at": None,
            "status": game.status.value,
            "result": game.result,
        }
        await redis.set(f"game:state:{game.id}", json.dumps(state), ex=86400)

    @staticmethod
    async def get_redis_state(game_id: UUID) -> dict | None:
        redis = get_redis()
        raw = await redis.get(f"game:state:{game_id}")
        if not raw:
            return None
        return json.loads(raw)

    @staticmethod
    async def apply_move(
        db: AsyncSession,
        game: Game,
        user: User,
        uci: str,
        time_remaining_ms: int | None = None,
    ) -> tuple[Move, dict]:
        if game.status != GameStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not active")

        is_white = user.id == game.white_player_id
        is_black = user.id == game.black_player_id
        if not is_white and not is_black:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

        board = chess.Board(game.fen)
        if (board.turn == chess.WHITE and not is_white) or (board.turn == chess.BLACK and not is_black):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not your turn")

        _, san, fen_after = validate_move(game.fen, uci)
        move_number = len(game.moves) + 1

        move = Move(
            game_id=game.id,
            move_number=move_number,
            san=san,
            uci=uci,
            fen_after=fen_after,
            time_remaining_ms=time_remaining_ms,
        )
        db.add(move)
        game.fen = fen_after

        board = chess.Board(fen_after)
        result = GameService._detect_result(board, game)

        await db.flush()
        await GameService.sync_redis_state(game)
        if result:
            await GameService.record_game_stats(db, game)

        event_payload = {
            "game_id": str(game.id),
            "move_number": move_number,
            "san": san,
            "uci": uci,
            "fen": fen_after,
            "time_remaining_ms": time_remaining_ms,
            "status": game.status.value,
            "result": result,
        }
        return move, event_payload

    @staticmethod
    async def finish_game(
        db: AsyncSession,
        game: Game,
        result: str,
        winner_id: UUID | None = None,
    ) -> Game:
        if game.status == GameStatus.FINISHED:
            return game

        game.status = GameStatus.FINISHED
        game.result = result
        game.winner_id = winner_id
        game.finished_at = datetime.now(timezone.utc)
        await db.flush()
        await GameService.sync_redis_state(game)
        await GameService.record_game_stats(db, game)
        return game

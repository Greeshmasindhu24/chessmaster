from __future__ import annotations

import io
from uuid import UUID

import chess
import chess.engine
import chess.pgn
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Game
from app.services.ai_service import _evaluate_board, _pick_minimax_move, get_stockfish_path
from app.services.game_service import GameService

DEFAULT_DEPTH = 12
MATE_SCORE = 10000


def _score_to_cp(score: chess.engine.PovScore, turn: chess.Color) -> tuple[int | None, int | None]:
    pov = score.white() if turn == chess.WHITE else score.black()
    if pov.is_mate():
        return None, pov.mate()
    cp = pov.score(mate_score=MATE_SCORE)
    return cp, None


def _classify_move(cp_loss: int | None) -> str:
    if cp_loss is None:
        return "unknown"
    if cp_loss <= 10:
        return "best"
    if cp_loss <= 30:
        return "good"
    if cp_loss <= 100:
        return "inaccuracy"
    if cp_loss <= 300:
        return "mistake"
    return "blunder"


class AnalysisService:
    @staticmethod
    def _fallback_analyze(board: chess.Board, depth: int = 2) -> dict:
        best_move = _pick_minimax_move(board, depth)
        eval_cp = _evaluate_board(board)
        if board.turn == chess.BLACK:
            eval_cp = -eval_cp
        return {
            "eval_cp": eval_cp,
            "mate": None,
            "best_move": best_move,
            "lines": [{"moves": [best_move], "eval_cp": eval_cp, "mate": None}],
        }

    @staticmethod
    def _stockfish_analyze(
        board: chess.Board,
        depth: int,
        multipv: int,
    ) -> dict:
        stockfish = get_stockfish_path()
        if not stockfish:
            return AnalysisService._fallback_analyze(board, min(depth, 3))

        try:
            with chess.engine.SimpleEngine.popen_uci(str(stockfish)) as engine:
                limit = chess.engine.Limit(depth=depth)
                if multipv > 1:
                    engine.configure({"MultiPV": multipv})
                results = engine.analyse(board, limit, multipv=multipv)
                if not isinstance(results, list):
                    results = [results]

                lines: list[dict] = []
                best_move = None
                eval_cp: int | None = None
                mate: int | None = None

                for info in results:
                    pv_moves = info.get("pv") or []
                    if pv_moves and best_move is None:
                        best_move = pv_moves[0]
                    score = info.get("score")
                    if score is None:
                        continue
                    line_cp, line_mate = _score_to_cp(score, board.turn)
                    if best_move is pv_moves[0] if pv_moves else None:
                        eval_cp = line_cp
                        mate = line_mate
                    lines.append(
                        {
                            "moves": pv_moves[:6],
                            "eval_cp": line_cp,
                            "mate": line_mate,
                        }
                    )

                if best_move is None and board.legal_moves:
                    best_move = next(iter(board.legal_moves))

                return {
                    "eval_cp": eval_cp,
                    "mate": mate,
                    "best_move": best_move,
                    "lines": lines,
                }
        except (chess.engine.EngineError, OSError):
            return AnalysisService._fallback_analyze(board, min(depth, 3))

    @staticmethod
    def analyze_position(fen: str, depth: int = DEFAULT_DEPTH, multipv: int = 1) -> dict:
        try:
            board = chess.Board(fen)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FEN") from exc

        if board.is_game_over():
            result = board.result(claim_draw=True)
            eval_cp = 0
            mate = None
            if result == "1-0":
                eval_cp = MATE_SCORE
            elif result == "0-1":
                eval_cp = -MATE_SCORE
            return {
                "fen": board.fen(),
                "turn": "white" if board.turn == chess.WHITE else "black",
                "eval_cp": eval_cp,
                "mate": mate,
                "best_move_uci": None,
                "best_move_san": None,
                "lines": [],
                "engine": "terminal",
            }

        raw = AnalysisService._stockfish_analyze(board, depth, multipv)
        best_move: chess.Move | None = raw.get("best_move")
        best_uci = best_move.uci() if best_move else None
        best_san = board.san(best_move) if best_move else None

        lines = []
        for line in raw.get("lines", []):
            moves = line.get("moves") or []
            lines.append(
                {
                    "moves_uci": [m.uci() for m in moves],
                    "eval_cp": line.get("eval_cp"),
                    "mate": line.get("mate"),
                }
            )

        engine_name = "stockfish" if get_stockfish_path() else "minimax"

        return {
            "fen": board.fen(),
            "turn": "white" if board.turn == chess.WHITE else "black",
            "eval_cp": raw.get("eval_cp"),
            "mate": raw.get("mate"),
            "best_move_uci": best_uci,
            "best_move_san": best_san,
            "lines": lines,
            "engine": engine_name,
        }

    @staticmethod
    def _cp_loss(before_cp: int | None, after_cp: int | None, mover: chess.Color) -> int | None:
        if before_cp is None or after_cp is None:
            return None
        # Evaluations are from white's perspective; flip for black mover.
        if mover == chess.BLACK:
            before_cp, after_cp = -before_cp, -after_cp
        return max(0, before_cp - after_cp)


    @staticmethod
    def analyze_game_from_board_replay(moves_uci: list[str], depth: int = 10) -> list[dict]:
        board = chess.Board()
        analyses: list[dict] = []

        for uci in moves_uci:
            if board.is_game_over():
                break

            fen_before = board.fen()
            before = AnalysisService.analyze_position(fen_before, depth=depth, multipv=1)
            eval_before_cp = before.get("eval_cp")
            best_uci = before.get("best_move_uci")

            try:
                move = chess.Move.from_uci(uci)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid move UCI: {uci}",
                ) from exc

            if move not in board.legal_moves:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Illegal move in game: {uci}",
                )

            san = board.san(move)
            mover = board.turn
            move_number = board.fullmove_number
            board.push(move)

            after = AnalysisService.analyze_position(board.fen(), depth=depth, multipv=1)
            eval_after_cp = after.get("eval_cp")
            cp_loss = AnalysisService._cp_loss(eval_before_cp, eval_after_cp, mover)

            analyses.append(
                {
                    "move_number": move_number,
                    "san": san,
                    "uci": uci,
                    "fen_before": fen_before,
                    "eval_before_cp": eval_before_cp,
                    "best_move_uci": best_uci,
                    "eval_after_cp": eval_after_cp,
                    "cp_loss": cp_loss,
                    "quality": _classify_move(cp_loss),
                }
            )

        return analyses

    @staticmethod
    def analyze_pgn(pgn: str, depth: int = 10) -> tuple[str, list[dict]]:
        game = chess.pgn.read_game(io.StringIO(pgn))
        if game is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PGN")

        moves_uci: list[str] = []
        board = game.board()
        for move in game.mainline_moves():
            moves_uci.append(move.uci())
            board.push(move)

        exported = str(game)
        return exported, AnalysisService.analyze_game_from_board_replay(moves_uci, depth=depth)

    @staticmethod
    async def analyze_stored_game(
        db: AsyncSession,
        game_id: UUID,
        user_id: UUID,
        depth: int = 10,
    ) -> dict:
        game = await GameService.get_game(db, game_id, user=None)
        if user_id not in (game.white_player_id, game.black_player_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

        moves_uci = [m.uci for m in sorted(game.moves, key=lambda m: m.move_number)]
        if not moves_uci and game.pgn:
            _, move_analyses = AnalysisService.analyze_pgn(game.pgn, depth=depth)
            return {
                "game_id": game_id,
                "pgn": game.pgn,
                "moves": move_analyses,
                "average_cp_loss": AnalysisService._average_loss(move_analyses),
                "engine": "stockfish" if get_stockfish_path() else "minimax",
            }

        move_analyses = AnalysisService.analyze_game_from_board_replay(moves_uci, depth=depth)
        return {
            "game_id": game_id,
            "pgn": game.pgn,
            "moves": move_analyses,
            "average_cp_loss": AnalysisService._average_loss(move_analyses),
            "engine": "stockfish" if get_stockfish_path() else "minimax",
        }

    @staticmethod
    def _average_loss(moves: list[dict]) -> float | None:
        losses = [m["cp_loss"] for m in moves if m.get("cp_loss") is not None]
        if not losses:
            return None
        return round(sum(losses) / len(losses), 1)

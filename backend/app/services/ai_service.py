import random
from pathlib import Path

import chess
import chess.engine

from app.core.config import PROJECT_ROOT, get_settings

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

DIFFICULTY_CONFIG = {
    "beginner": {"depth": 1, "blunder_chance": 0.35},
    "intermediate": {"depth": 2, "blunder_chance": 0.12},
    "advanced": {"depth": 3, "blunder_chance": 0.04},
    "expert": {"depth": 4, "blunder_chance": 0.0},
}


def _evaluate_board(board: chess.Board) -> int:
    if board.is_checkmate():
        return -20000 if board.turn == chess.WHITE else 20000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0
    for piece_type, value in PIECE_VALUES.items():
        if piece_type == chess.KING:
            continue
        score += len(board.pieces(piece_type, chess.WHITE)) * value
        score -= len(board.pieces(piece_type, chess.BLACK)) * value
    return score


def _minimax(board: chess.Board, depth: int, alpha: int, beta: int, maximizing: bool) -> int:
    if depth == 0 or board.is_game_over():
        return _evaluate_board(board)

    if maximizing:
        best = -999999
        for move in board.legal_moves:
            board.push(move)
            best = max(best, _minimax(board, depth - 1, alpha, beta, False))
            board.pop()
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best

    best = 999999
    for move in board.legal_moves:
        board.push(move)
        best = min(best, _minimax(board, depth - 1, alpha, beta, True))
        board.pop()
        beta = min(beta, best)
        if beta <= alpha:
            break
    return best


def _pick_minimax_move(board: chess.Board, depth: int) -> chess.Move:
    best_move = None
    best_score = -999999
    for move in board.legal_moves:
        board.push(move)
        score = _minimax(board, depth - 1, -999999, 999999, False)
        board.pop()
        if score > best_score:
            best_score = score
            best_move = move
    return best_move or next(iter(board.legal_moves))


def _stockfish_path() -> Path | None:
    settings = get_settings()
    path = Path(settings.STOCKFISH_PATH)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path if path.is_file() else None


class AiService:
    @staticmethod
    def get_move(board: chess.Board, difficulty: str = "intermediate") -> chess.Move:
        config = DIFFICULTY_CONFIG.get(difficulty, DIFFICULTY_CONFIG["intermediate"])
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            raise ValueError("No legal moves")

        stockfish = _stockfish_path()
        if stockfish and config["depth"] >= 3:
            try:
                with chess.engine.SimpleEngine.popen_uci(str(stockfish)) as engine:
                    limit = chess.engine.Limit(depth=config["depth"] + 1)
                    result = engine.play(board, limit)
                    if result.move and result.move in board.legal_moves:
                        return result.move
            except (chess.engine.EngineError, OSError):
                pass

        if random.random() < config["blunder_chance"]:
            return random.choice(legal_moves)

        return _pick_minimax_move(board, config["depth"])

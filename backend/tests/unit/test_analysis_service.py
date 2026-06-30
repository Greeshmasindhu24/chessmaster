import chess
import pytest

from app.services.analysis_service import AnalysisService
from app.services.game_service import START_FEN, _elo_delta, validate_move


def test_analyze_position_starting_fen():
    result = AnalysisService.analyze_position(START_FEN, depth=2, multipv=1)
    assert result["fen"] == START_FEN
    assert result["turn"] == "white"
    assert result["best_move_uci"] is not None
    assert result["engine"] in ("stockfish", "minimax")


def test_analyze_position_invalid_fen():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        AnalysisService.analyze_position("not-a-fen", depth=2)
    assert exc.value.status_code == 400


def test_analyze_game_from_moves():
    moves = ["e2e4", "e7e5", "g1f3"]
    analyses = AnalysisService.analyze_game_from_board_replay(moves, depth=2)
    assert len(analyses) == 3
    assert analyses[0]["san"]
    assert analyses[0]["quality"] in ("best", "good", "inaccuracy", "mistake", "blunder", "unknown")


def test_classify_move_quality_via_cp_loss():
    moves = ["e2e4"]
    analyses = AnalysisService.analyze_game_from_board_replay(moves, depth=2)
    assert "cp_loss" in analyses[0]


def test_elo_delta_symmetry():
    white_gain = _elo_delta(1200, 1200, 1.0)
    black_gain = _elo_delta(1200, 1200, 0.0)
    assert white_gain == -black_gain


def test_validate_move_still_works():
    move, san, fen_after = validate_move(START_FEN, "e2e4")
    assert move.uci() == "e2e4"
    assert san == "e4"
    board = chess.Board(fen_after)
    assert board.turn == chess.BLACK

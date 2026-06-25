import chess
import pytest
from fastapi import HTTPException

from app.services.game_service import START_FEN, validate_move


def test_validate_move_legal_e4():
    move, san, fen_after = validate_move(START_FEN, "e2e4")
    assert move.uci() == "e2e4"
    assert san == "e4"
    assert fen_after != START_FEN
    assert fen_after.endswith(" b KQkq - 0 1")


def test_validate_move_illegal():
    with pytest.raises(HTTPException) as exc:
        validate_move(START_FEN, "e2e5")
    assert exc.value.status_code == 400
    assert "Illegal" in exc.value.detail


def test_validate_move_invalid_uci():
    with pytest.raises(HTTPException) as exc:
        validate_move(START_FEN, "not-a-move")
    assert exc.value.status_code == 400


def test_validate_move_wrong_turn():
    board = chess.Board(START_FEN)
    board.push(chess.Move.from_uci("e2e4"))
    with pytest.raises(HTTPException) as exc:
        validate_move(board.fen(), "e2e4")
    assert exc.value.status_code == 400


def test_checkmate_detection():
    fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
    board = chess.Board(fen)
    assert board.is_checkmate()

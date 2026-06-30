import pytest

from app.services.game_service import ELO_K, _elo_delta, _elo_expected


def test_elo_expected_equal_ratings():
    assert _elo_expected(1200, 1200) == pytest.approx(0.5)


def test_elo_delta_win_vs_equal_opponent():
    delta = _elo_delta(1200, 1200, 1.0)
    assert delta == ELO_K // 2


def test_elo_delta_loss_vs_equal_opponent():
    delta = _elo_delta(1200, 1200, 0.0)
    assert delta == -(ELO_K // 2)

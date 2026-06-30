from unittest.mock import MagicMock

from app.websocket.manager import ConnectionManager


def test_disconnect_ignores_stale_websocket():
    manager = ConnectionManager()
    stale_ws = MagicMock()
    active_ws = MagicMock()
    manager.active_connections["user1"] = active_ws

    manager.disconnect("user1", stale_ws)
    assert manager.active_connections.get("user1") is active_ws

    manager.disconnect("user1", active_ws)
    assert "user1" not in manager.active_connections

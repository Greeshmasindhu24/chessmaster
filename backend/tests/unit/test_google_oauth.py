from app.services.auth_service import AuthService


def test_google_oauth_status_not_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "")
    from app.core.config import get_settings

    get_settings.cache_clear()

    status = AuthService.google_oauth_status()
    assert status["status"] == "not_configured"
    assert status["authorize_url"] is None


def test_google_oauth_status_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8001/api/v1/auth/google/callback",
    )
    from app.core.config import get_settings

    get_settings.cache_clear()

    status = AuthService.google_oauth_status()
    assert status["status"] == "configured"
    assert status["authorize_url"] is not None
    assert "accounts.google.com" in status["authorize_url"]
    assert "state=" in status["authorize_url"]

    get_settings.cache_clear()

import ssl

from app.core.config import Settings, normalize_postgres_url


def test_normalize_strips_sslmode_and_sets_ssl_true():
    url = "postgresql://user:pass@host.example.com/db?sslmode=require"
    cleaned, connect_args = normalize_postgres_url(url)
    assert cleaned == "postgresql+asyncpg://user:pass@host.example.com/db"
    assert connect_args == {"ssl": True}


def test_normalize_preserves_asyncpg_driver():
    url = "postgresql+asyncpg://user:pass@localhost:5432/chess"
    cleaned, connect_args = normalize_postgres_url(url)
    assert cleaned == url
    assert connect_args == {}


def test_normalize_verify_full_uses_ssl_context():
    url = "postgresql://user:pass@host/db?sslmode=verify-full"
    _, connect_args = normalize_postgres_url(url)
    assert isinstance(connect_args["ssl"], ssl.SSLContext)


def test_settings_resolved_url_strips_sslmode():
    settings = Settings(
        DATABASE_URL="postgresql://u:p@dpg-abc.render.com/chess?sslmode=require",
        SQLITE_DATABASE_URL="",
    )
    assert "sslmode" not in settings.resolved_database_url
    assert settings.resolved_database_url.startswith("postgresql+asyncpg://")
    assert settings.postgres_connect_args == {"ssl": True}


def test_settings_sqlite_ignores_postgres_connect_args():
    settings = Settings(
        DATABASE_URL="postgresql://u:p@host/db?sslmode=require",
        SQLITE_DATABASE_URL="sqlite+aiosqlite:///data/test.db",
    )
    assert settings.uses_sqlite
    assert settings.postgres_connect_args == {}

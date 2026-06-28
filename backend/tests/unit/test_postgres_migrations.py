from app.core.postgres_migrations import _PROFILE_DEMOGRAPHICS


def test_profile_demographics_sql_is_idempotent_postgres():
    assert len(_PROFILE_DEMOGRAPHICS) == 2
    assert all("IF NOT EXISTS" in stmt for stmt in _PROFILE_DEMOGRAPHICS)
    assert "date_of_birth" in _PROFILE_DEMOGRAPHICS[0]
    assert "gender" in _PROFILE_DEMOGRAPHICS[1]

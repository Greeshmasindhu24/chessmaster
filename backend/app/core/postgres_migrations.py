"""Idempotent PostgreSQL schema patches (create_all does not alter existing tables)."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

_PROFILE_DEMOGRAPHICS = (
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
)

_FRIENDSHIPS = """
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_friendship_pair UNIQUE (user_id, friend_id),
    CONSTRAINT chk_friendship_not_self CHECK (user_id <> friend_id)
)
"""


async def apply_postgres_migrations(conn: AsyncConnection) -> None:
    for statement in _PROFILE_DEMOGRAPHICS:
        await conn.execute(text(statement))

    await conn.execute(text(_FRIENDSHIPS))
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id)"))
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id)"))

    # Legacy 001 used country CHAR(2); models store indian | outside_indian | prefer_not_to_say.
    result = await conn.execute(
        text(
            """
            SELECT data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'profiles'
              AND column_name = 'country'
            """
        )
    )
    row = result.first()
    if row and row[0] in ("character", "character varying") and (row[1] is None or row[1] < 32):
        await conn.execute(
            text("ALTER TABLE profiles ALTER COLUMN country TYPE VARCHAR(32) USING country::varchar")
        )

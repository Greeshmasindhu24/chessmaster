"""Lightweight SQLite column migrations for local dev (create_all does not alter tables)."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def apply_sqlite_migrations(conn: AsyncConnection) -> None:
    result = await conn.execute(text("PRAGMA table_info(profiles)"))
    columns = {row[1] for row in result.fetchall()}
    if "date_of_birth" not in columns:
        await conn.execute(text("ALTER TABLE profiles ADD COLUMN date_of_birth DATE"))
    if "gender" not in columns:
        await conn.execute(text("ALTER TABLE profiles ADD COLUMN gender VARCHAR(20)"))

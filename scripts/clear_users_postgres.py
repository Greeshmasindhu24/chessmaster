"""Clear all user accounts from ChessMaster Pro PostgreSQL (Neon / production)."""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("psycopg2 required: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Tables referencing users.id — delete before users (games need moves first)
USER_CHILD_TABLES = [
    "moves",  # via games
    "games",
    "audit_logs",
    "notifications",
    "sessions",
    "email_verification_tokens",
    "password_reset_tokens",
    "ai_tier_purchases",
    "online_tier_purchases",
    "user_preferences",
    "profiles",
]

LOCALHOST_HINTS = ("localhost", "127.0.0.1", "::1")

CHESSMASTER_SCHEMA_ERROR = (
    "This DATABASE_URL is not ChessMaster Pro. "
    "Use Render chessmaster-api DATABASE_URL or dedicated Neon for ChessMaster."
)


def normalize_pg_url(url: str) -> str:
    """Convert SQLAlchemy-style URL to psycopg2-compatible postgresql://."""
    url = url.strip()
    for prefix in (
        "postgresql+asyncpg://",
        "postgresql+psycopg2://",
        "postgresql+psycopg://",
    ):
        if url.startswith(prefix):
            return "postgresql://" + url.split("://", 1)[1]
    return url


def ensure_sslmode(url: str) -> str:
    """Render and other cloud Postgres often require sslmode=require."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in LOCALHOST_HINTS or host.endswith(".local"):
        return url
    q = parsed.query or ""
    if "sslmode=" in q.lower():
        return url
    if q:
        return url + "&sslmode=require"
    sep = "&" if "?" in url else "?"
    return url + sep + "sslmode=require"


def resolve_database_url(explicit: str | None) -> str:
    if explicit:
        return ensure_sslmode(normalize_pg_url(explicit))
    env_url = os.environ.get("DATABASE_URL", "").strip()
    if env_url:
        return ensure_sslmode(normalize_pg_url(env_url))
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("DATABASE_URL="):
                url = line.split("=", 1)[1].strip().strip('"').strip("'")
                if url:
                    return ensure_sslmode(normalize_pg_url(url))
    print("DATABASE_URL not set. Use --database-url or set env var.", file=sys.stderr)
    sys.exit(1)


def mask_url(url: str) -> str:
    """Hide password in connection string for display."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            host = parsed.hostname or ""
            netloc = f"{parsed.username}:****@{host}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return parsed._replace(netloc=netloc).geturl()
    except Exception:
        pass
    return re.sub(r":([^:@/]+)@", ":****@", url, count=1)


def assert_not_localhost(url: str, force: bool) -> None:
    if force:
        return
    host = (urlparse(url).hostname or "").lower()
    if host in LOCALHOST_HINTS or host.endswith(".local"):
        print(
            f"Refusing: DATABASE_URL host looks local ({host}). Use --force to override.",
            file=sys.stderr,
        )
        sys.exit(1)


def table_exists(cur: psycopg2.extensions.cursor, name: str) -> bool:
    cur.execute(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = %s",
        (name,),
    )
    return cur.fetchone() is not None


def column_exists(cur: psycopg2.extensions.cursor, table: str, column: str) -> bool:
    cur.execute(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = %s AND column_name = %s",
        (table, column),
    )
    return cur.fetchone() is not None


def assert_chessmaster_schema(cur: psycopg2.extensions.cursor) -> None:
    """Refuse to run against non-ChessMaster databases (e.g. shared APAD Supabase)."""
    if not table_exists(cur, "users"):
        print(CHESSMASTER_SCHEMA_ERROR, file=sys.stderr)
        print("Reason: public.users table not found.", file=sys.stderr)
        sys.exit(1)
    if not column_exists(cur, "users", "username"):
        print(CHESSMASTER_SCHEMA_ERROR, file=sys.stderr)
        print(
            "Reason: public.users exists but has no username column (wrong schema).",
            file=sys.stderr,
        )
        sys.exit(1)


def count_table(cur: psycopg2.extensions.cursor, name: str) -> int:
    if not table_exists(cur, name):
        return 0
    cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(name)))
    return int(cur.fetchone()[0])


def list_users(cur: psycopg2.extensions.cursor) -> list[tuple[str, str]]:
    if not table_exists(cur, "users"):
        return []
    cur.execute("SELECT email, username FROM users ORDER BY email")
    return [(r[0], r[1]) for r in cur.fetchall()]


def confirm_deletion(confirmed: bool) -> bool:
    if confirmed:
        return True
    print("\nThis will permanently delete ALL users and related data.")
    answer = input("Type DELETE to confirm: ").strip()
    return answer == "DELETE"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clear all users from PostgreSQL (Neon / production)"
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="postgresql:// connection string (or DATABASE_URL env)",
    )
    parser.add_argument(
        "--list-only",
        action="store_true",
        help="List users (email, username) and exit without deleting",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Skip interactive confirmation (type DELETE)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow localhost DATABASE_URL",
    )
    args = parser.parse_args()

    db_url = resolve_database_url(args.database_url)
    assert_not_localhost(db_url, args.force)

    print(f"Connecting to {mask_url(db_url)} ...", flush=True)
    try:
        conn = psycopg2.connect(db_url)
    except Exception as exc:
        print(f"Connection failed: {exc}", file=sys.stderr)
        print(f"Connection failed: {exc}")
        sys.exit(1)
    cur = conn.cursor()

    assert_chessmaster_schema(cur)

    users = list_users(cur)
    user_count = len(users)

    print(f"Database: {mask_url(db_url)}")
    print(f"Users to remove: {user_count}")
    if users:
        print("Accounts:")
        for email, username in users:
            print(f"  - {email} ({username})")

    if args.list_only:
        cur.close()
        conn.close()
        return

    if user_count == 0:
        print("Nothing to delete — users table is already empty.")
        cur.close()
        conn.close()
        return

    if not confirm_deletion(args.confirm):
        print("Aborted.")
        cur.close()
        conn.close()
        sys.exit(0)

    deleted: dict[str, int] = {}
    try:
        for table in USER_CHILD_TABLES:
            if table_exists(cur, table):
                n = count_table(cur, table)
                if n:
                    cur.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table)))
                    deleted[table] = n
        if table_exists(cur, "users"):
            cur.execute("DELETE FROM users")
            deleted["users"] = user_count
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    conn2 = psycopg2.connect(db_url)
    cur2 = conn2.cursor()
    remaining = count_table(cur2, "users")
    cur2.close()
    conn2.close()

    print("\nDeleted row counts:")
    for table, n in deleted.items():
        print(f"  {table}: {n}")

    print(f"\nUsers remaining: {remaining}")
    if remaining == 0:
        print("User database is empty — you can register fresh.")
    else:
        print("WARNING: users still remain!", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        print(f"Error: {exc}")
        sys.exit(1)

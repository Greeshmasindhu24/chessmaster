"""Clear all user accounts from the local ChessMaster Pro SQLite database."""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = PROJECT_ROOT / "data" / "chessmaster.db"

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

REMOTE_HINTS = ("render.com", "supabase", "amazonaws.com", "neon.tech")


def resolve_db_path(explicit: Path | None) -> Path:
    if explicit:
        return explicit.resolve()
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("SQLITE_DATABASE_URL="):
                url = line.split("=", 1)[1].strip().strip('"').strip("'")
                if not url.startswith("sqlite"):
                    break
                for sep in ("sqlite+aiosqlite:///", "sqlite:///"):
                    if sep in url:
                        rel = url.split(sep, 1)[1]
                        p = Path(rel)
                        if not p.is_absolute():
                            p = (PROJECT_ROOT / rel).resolve()
                        return p
    return DEFAULT_DB.resolve()


def assert_local_sqlite(db_path: Path) -> None:
    if not db_path.exists():
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)
    if db_path.suffix.lower() not in (".db", ".sqlite", ".sqlite3"):
        print(f"Refusing: not a SQLite file: {db_path}", file=sys.stderr)
        sys.exit(1)
    resolved = str(db_path.resolve()).lower()
    for hint in REMOTE_HINTS:
        if hint in resolved:
            print(f"Refusing: path looks remote: {db_path}", file=sys.stderr)
            sys.exit(1)


def table_exists(cur: sqlite3.Cursor, name: str) -> bool:
    cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    )
    return cur.fetchone() is not None


def count_table(cur: sqlite3.Cursor, name: str) -> int:
    if not table_exists(cur, name):
        return 0
    cur.execute(f"SELECT COUNT(*) FROM [{name}]")
    return int(cur.fetchone()[0])


def main() -> None:
    parser = argparse.ArgumentParser(description="Clear all users from local SQLite dev DB")
    parser.add_argument("--db", type=Path, default=None, help="Path to chessmaster.db")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation")
    args = parser.parse_args()

    db_path = resolve_db_path(args.db)
    assert_local_sqlite(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    user_count = count_table(cur, "users")
    emails: list[str] = []
    if user_count and table_exists(cur, "users"):
        cur.execute("SELECT email FROM users ORDER BY email")
        emails = [r[0] for r in cur.fetchall()]

    print(f"Database: {db_path}")
    print(f"Users to remove: {user_count}")
    if emails:
        print("Emails:")
        for e in emails:
            print(f"  - {e}")

    if user_count == 0:
        print("Nothing to delete — users table is already empty.")
        conn.close()
        return

    if not args.yes:
        answer = input("Delete ALL users and related data? [y/N]: ").strip().lower()
        if answer not in ("y", "yes"):
            print("Aborted.")
            conn.close()
            sys.exit(0)

    deleted: dict[str, int] = {}
    try:
        cur.execute("PRAGMA foreign_keys = OFF")
        for table in USER_CHILD_TABLES:
            if table_exists(cur, table):
                n = count_table(cur, table)
                if n:
                    cur.execute(f"DELETE FROM [{table}]")
                    deleted[table] = n
        if table_exists(cur, "users"):
            cur.execute("DELETE FROM users")
            deleted["users"] = user_count
        conn.commit()
        cur.execute("PRAGMA foreign_keys = ON")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print("\nDeleted row counts:")
    for table, n in deleted.items():
        print(f"  {table}: {n}")

    conn2 = sqlite3.connect(db_path)
    remaining = count_table(conn2.cursor(), "users")
    conn2.close()
    print(f"\nUsers remaining: {remaining}")
    if remaining == 0:
        print("Local user database is empty — you can register fresh.")
    else:
        print("WARNING: users still remain!", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

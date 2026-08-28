#!/usr/bin/env python3
"""Apply every ordered KIN TiDB migration and verify the deployed schema."""

from __future__ import annotations

import argparse
import os
import site
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for packages in (ROOT / "apps/api/.venv/lib").glob("python*/site-packages"):
    site.addsitedir(str(packages))

import certifi
import pymysql

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tidb_keychain import load  # noqa: E402


def migration_files(path: Path) -> list[Path]:
    files = sorted(path.glob("[0-9][0-9][0-9][0-9]_*.sql"))
    if not files:
        raise SystemExit(f"no migrations found in {path}")
    return files


def statements(path: Path) -> list[str]:
    return [part.strip() for part in path.read_text().split(";") if part.strip()]


def connect(item: dict[str, str], database: str | None, retries: int, connect_timeout: int, read_timeout: int):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            return pymysql.connect(
                host=item["host"], port=int(item["port"]), user=item["username"], password=item["password"],
                database=database, ssl={"ca": certifi.where()}, connect_timeout=connect_timeout,
                read_timeout=read_timeout, write_timeout=read_timeout, autocommit=True,
                bind_address=os.getenv("TIDB_BIND_ADDRESS") or None,
            )
        except pymysql.MySQLError as exc:
            last_error = exc
            if attempt == retries:
                raise
            delay = min(5 * attempt, 15)
            print(f"TIDB_CONNECT_RETRY attempt={attempt} delay_seconds={delay} error_code={exc.args[0]}", flush=True)
            time.sleep(delay)
    raise last_error  # pragma: no cover


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="kin")
    parser.add_argument("--migration-dir", type=Path, default=ROOT / "infra/migrations")
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--connect-timeout", type=int, default=20)
    parser.add_argument("--read-timeout", type=int, default=120)
    parser.add_argument("--plan", action="store_true")
    args = parser.parse_args()

    files = migration_files(args.migration_dir)
    total = sum(len(statements(path)) for path in files)
    if args.plan:
        print(f"TIDB_MIGRATION_PLAN database={args.database} files={','.join(path.name for path in files)} statements={total}")
        return

    item = load()
    connection = connect(item, None, args.retries, args.connect_timeout, args.read_timeout)
    try:
        with connection.cursor() as cursor:
            escaped = args.database.replace("`", "``")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{escaped}`")
            cursor.execute(f"USE `{escaped}`")
            applied = 0
            for path in files:
                parts = statements(path)
                for statement in parts:
                    cursor.execute(statement)
                applied += len(parts)
                print(f"TIDB_MIGRATION_APPLIED file={path.name} statements={len(parts)}", flush=True)
            cursor.execute("SHOW TABLES")
            tables = sorted(row[0] for row in cursor.fetchall())
            cursor.execute("SHOW COLUMNS FROM notifications")
            notification_columns = sorted(row[0] for row in cursor.fetchall())
        required = {"users", "campfires", "signals", "proactive_items", "experience_candidates", "notifications"}
        missing = sorted(required - set(tables))
        if missing:
            raise RuntimeError(f"missing required tables: {','.join(missing)}")
        expected_columns = {"delivery_status", "delivered_at", "read_at", "source_id"}
        if not expected_columns.issubset(notification_columns):
            raise RuntimeError("notifications verification failed")
        print(
            f"TIDB_MIGRATION_RESULT database={args.database} files={len(files)} "
            f"statements={applied} tables={len(tables)} notifications=verified"
        )
    finally:
        connection.close()


if __name__ == "__main__":
    main()

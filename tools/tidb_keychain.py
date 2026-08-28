#!/usr/bin/env python3
"""Load the KIN TiDB Zero connection from macOS Keychain without printing it."""

from __future__ import annotations

import subprocess
import os
from urllib.parse import quote


ACCOUNT = "kin-hackathon"
SERVICES = {
    "host": "kin-tidb-zero-host",
    "port": "kin-tidb-zero-port",
    "username": "kin-tidb-zero-user",
    "password": "kin-tidb-zero-password",
}


def load() -> dict[str, str]:
    return {
        key: subprocess.check_output(
            ["security", "find-generic-password", "-a", ACCOUNT, "-s", service, "-w"],
            text=True,
        ).strip()
        for key, service in SERVICES.items()
    }


def sqlalchemy_url(database: str = "kin") -> str:
    item = load()
    from certifi import where

    url = "mysql+pymysql://{}:{}@{}:{}/{}?ssl_ca={}".format(
        quote(item["username"], safe=""),
        quote(item["password"], safe=""),
        item["host"],
        item["port"],
        database,
        quote(where(), safe="/"),
    )
    bind_address = os.getenv("TIDB_BIND_ADDRESS", "").strip()
    return f"{url}&bind_address={quote(bind_address, safe='')}" if bind_address else url

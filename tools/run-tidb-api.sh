#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
PORT="${1:-8012}"
cd "$ROOT/apps/api"
# Zen and similar TUN clients can accept port 4000 without forwarding the
# MySQL greeting. Prefer the active physical interface for TiDB when present.
if [[ -z "${TIDB_BIND_ADDRESS:-}" ]]; then
  for interface in en0 en1; do
    candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
    if [[ -n "$candidate" ]]; then
      export TIDB_BIND_ADDRESS="$candidate"
      break
    fi
  done
fi
export DATABASE_URL="$(.venv/bin/python -c 'import sys; sys.path.insert(0, "../../tools"); from tidb_keychain import sqlalchemy_url; print(sqlalchemy_url())')"
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$PORT"

#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
STATE_DIR="$ROOT/work/cardputer-demo-runtime"
API_DIR="$ROOT/apps/api"
RELAY="$ROOT/tools/agent-link-relay/build/agent-link-relay"
mkdir -p "$STATE_DIR"

if ! curl -fsS http://127.0.0.1:8011/health >/dev/null 2>&1; then
  (
    cd "$API_DIR"
    NODE_ENV=development \
    DATABASE_URL=sqlite:////tmp/kin-cardputer-demo.db \
    DEMO_MODE=true \
    AGENT_GATEWAY_TOKEN=live-agent-token \
    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8011 \
      >"$STATE_DIR/api.log" 2>&1 &
    echo $! >"$STATE_DIR/api.pid"
  )
  attempt=0
  until curl -fsS http://127.0.0.1:8011/health >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 40 ] || { echo "KIN demo API did not start" >&2; exit 1; }
    sleep 0.25
  done
fi

if [ -f "$STATE_DIR/relay.pid" ]; then
  old_pid=$(cat "$STATE_DIR/relay.pid" 2>/dev/null || true)
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid"
    sleep 1
  fi
fi

seed=$(curl -fsS -X POST http://127.0.0.1:8011/v1/demo/seed)
match_id=$(printf '%s' "$seed" | python3 -c 'import json,sys; print(json.load(sys.stdin)["match_id"])')
printf 'KIN demo ready. Match: %s\n' "$match_id"

NODE_API_BASE=http://127.0.0.1:8011 \
NODE_AGENT_TOKEN=live-agent-token \
NODE_MATCH_ID="$match_id" \
NODE_PROOF_NONCE=cardputer-live-proof \
  "$RELAY" &
relay_pid=$!
echo "$relay_pid" >"$STATE_DIR/relay.pid"
wait "$relay_pid"

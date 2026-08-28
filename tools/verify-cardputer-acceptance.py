#!/usr/bin/env python3
"""Wait for the trusted Agent_link session to reach the physical connected state."""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request


def read_state(base_url: str, match_id: str, token: str) -> dict:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/v1/agent-link/sessions/{match_id}",
        headers={"X-Agent-Gateway-Token": token},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the final two-Cardputer acceptance gate")
    parser.add_argument("--base-url", default="http://127.0.0.1:8011")
    parser.add_argument("--match-id", required=True)
    parser.add_argument("--agent-token", default="live-agent-token")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--interval", type=float, default=1.0)
    args = parser.parse_args()

    deadline = time.monotonic() + args.timeout
    previous = None
    while time.monotonic() < deadline:
        try:
            state = read_state(args.base_url, args.match_id, args.agent_token)
        except (urllib.error.URLError, TimeoutError) as error:
            state = {"status": "unreachable", "error": type(error).__name__}
        if state != previous:
            print("PHYSICAL_GATE_STATE", json.dumps(state, ensure_ascii=False, sort_keys=True), flush=True)
            previous = state
        if state.get("status") == "connected" and state.get("relationship_id"):
            print(
                "PHYSICAL_GATE_RESULT PASS "
                f"match_id={args.match_id} relationship_id={state['relationship_id']} devices=2"
            )
            return
        time.sleep(args.interval)

    print(f"PHYSICAL_GATE_RESULT FAIL match_id={args.match_id} timeout_seconds={args.timeout}")
    raise SystemExit(1)


if __name__ == "__main__":
    main()

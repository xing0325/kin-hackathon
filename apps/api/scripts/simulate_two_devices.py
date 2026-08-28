import argparse
import json
from datetime import datetime, timezone

import httpx


def post(client, path, **kwargs):
    response = client.post(path, **kwargs)
    response.raise_for_status()
    body = response.json() if response.content else None
    print("POST", path, response.status_code, json.dumps(body, ensure_ascii=False))
    return body


def main():
    parser = argparse.ArgumentParser(description="Run a complete two-Cardputer demo against the API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--agent-token", default="change-me")
    args = parser.parse_args()
    # Ignore machine-wide proxy variables: this simulator targets a local API.
    with httpx.Client(base_url=args.base_url, timeout=10, trust_env=False) as client:
        seed = post(client, "/v1/demo/seed")
        match_id = seed["match_id"]
        nonce = "simulator-shared-proof"
        now = datetime.now(timezone.utc).isoformat()
        headers = {"X-Agent-Gateway-Token": args.agent_token}
        sequence = [
            ("sim-gesture-a", "dev_cardputer_a", "handshake.gesture"),
            ("sim-gesture-b", "dev_cardputer_b", "handshake.gesture"),
            ("sim-confirm-a", "dev_cardputer_a", "handshake.confirmed"),
            ("sim-confirm-b", "dev_cardputer_b", "handshake.confirmed"),
        ]
        result = None
        for event_id, device_id, event_type in sequence:
            result = post(client, "/v1/agent/events", headers=headers, json={
                "event_id": event_id, "device_id": device_id, "type": event_type,
                "occurred_at": now, "payload": {"match_id": match_id, "proof_nonce": nonce},
            })
        print("RESULT", result["result"]["status"], result["result"]["relationship_id"])


if __name__ == "__main__":
    main()

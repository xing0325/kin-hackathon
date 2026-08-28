import argparse
import base64
import json
from datetime import datetime, timezone

import httpx


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def main():
    parser = argparse.ArgumentParser(description="Replay exact Cardputer Agent_link wire events")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--agent-token", default="change-me")
    args = parser.parse_args()
    # A cold TiDB Serverless seed performs schema cleanup, vector writes and
    # index-visible reads. Keep the demo client above that real-world latency.
    with httpx.Client(base_url=args.base_url, timeout=60, trust_env=False) as client:
        seed = client.post("/v1/demo/seed").json()
        common = {
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "match_id": seed["match_id"],
            "proof_nonce": "cardputer-demo-proof",
        }
        events = [
            ("live-gesture-a", "NODE-A7B2", 100, b64(b'{"kind":"handshake.gesture","peak_g":2.14}')),
            ("live-gesture-b", "NODE-7FAE", 100, b64(b'{"kind":"handshake.gesture","peak_g":2.08}')),
            ("live-confirm-a", "NODE-A7B2", 1, b64(bytes([0, 1]))),
            ("live-confirm-b", "NODE-7FAE", 1, b64(bytes([0, 1]))),
        ]
        headers = {"X-Agent-Gateway-Token": args.agent_token}
        result = None
        for event_id, name, wire_id, data in events:
            payload = {**common, "event_id": event_id, "device_name": name,
                       "wire_event_id": wire_id, "data_base64": data}
            response = client.post("/v1/agent-link/events", headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            print(name, wire_id, json.dumps(result, ensure_ascii=False))
        print("RESULT", result["result"]["status"], result["result"]["relationship_id"])


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
import base64
import json
import urllib.request
from datetime import datetime, timezone


def request(base, method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    merged = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(base.rstrip("/") + path, data=data, headers=merged, method=method)
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.status, dict(response.headers), json.loads(response.read() or b"{}")


def main():
    parser = argparse.ArgumentParser(description="KIN V0.11 two-account + two-device release regression")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000")
    parser.add_argument("--agent-token", default="test-agent-token")
    args = parser.parse_args()
    base = args.api_base

    _, _, seed = request(base, "POST", "/v1/demo/seed")
    sessions = {}
    for handle, name in (("alice", "Alice"), ("bob", "Bob")):
        _, _, sessions[handle] = request(base, "POST", "/v1/auth/demo-session", {"handle": handle, "display_name": name})
        assert sessions[handle]["access_token"].startswith("kin1.")
    auth = {name: {"Authorization": f"Bearer {session['access_token']}"} for name, session in sessions.items()}

    common = {
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "match_id": seed["match_id"], "proof_nonce": "v011-release-proof",
    }
    events = [
        ("v011-gesture-a", "NODE-A7B2", 100, b'{"kind":"handshake.gesture","peak_g":2.14}'),
        ("v011-gesture-b", "NODE-7FAE", 100, b'{"kind":"handshake.gesture","peak_g":2.08}'),
        ("v011-confirm-a", "NODE-A7B2", 1, bytes([0, 1])),
        ("v011-confirm-b", "NODE-7FAE", 1, bytes([0, 1])),
    ]
    result = None
    for event_id, device, wire_id, raw in events:
        payload = {**common, "event_id": event_id, "device_name": device, "wire_event_id": wire_id,
                   "data_base64": base64.b64encode(raw).decode()}
        _, _, result = request(base, "POST", "/v1/agent-link/events", payload, {"X-Agent-Gateway-Token": args.agent_token})
    assert result and result["result"]["status"] == "connected"

    _, _, relationships = request(base, "GET", "/v1/relationships", headers=auth["alice"])
    assert len(relationships) == 1 and relationships[0]["id"] == result["result"]["relationship_id"]
    _, _, signal = request(base, "POST", "/v1/signals", {
        "kind": "NEED", "statement": "需要一个懂 ESP32 BLE 稳定性的人", "context": {"release": "v0.11"},
    }, auth["alice"])
    _, _, notifications = request(base, "GET", "/v1/notifications?unread_only=true", headers=auth["bob"])
    target = next(item for item in notifications if item["source_id"] == signal["id"])
    _, _, read = request(base, "POST", f"/v1/notifications/{target['id']}/read", headers=auth["bob"])
    assert read["read_at"] and read["delivery_status"] == "delivered"
    _, metric_headers, health = request(base, "GET", "/health", headers={"X-Request-ID": "v011-release-check"})
    response_request_id = next(value for key, value in metric_headers.items() if key.lower() == "x-request-id")
    assert response_request_id == "v011-release-check"

    print("AUTH_RESULT accounts=2 signed_tokens=2")
    print(f"DEVICE_RESULT devices=2 handshake={result['result']['status']} relationship={relationships[0]['id']}")
    print(f"NOTIFICATION_RESULT delivered=1 read=1 source={signal['id']}")
    print(f"OBSERVABILITY_RESULT request_id={response_request_id} release_sha={health['release_sha']}")
    print("RELEASE_RESULT PASS")


if __name__ == "__main__":
    main()

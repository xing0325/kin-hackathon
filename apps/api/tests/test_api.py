import base64
import json
from datetime import datetime, timezone

from app.security import issue_access_token, verify_access_token


def auth(user_id: str):
    return {"Authorization": "Bearer %s" % user_id}


def agent_headers():
    return {"X-Agent-Gateway-Token": "test-agent-token"}


def test_health_and_seed(client):
    health = client.get("/health", headers={"X-Request-ID": "release-check"})
    assert health.json()["status"] == "ok"
    assert health.headers["X-Request-ID"] == "release-check"
    assert client.get("/ready").json()["database"] == "sqlite"
    assert client.get("/ready").json()["database_latency_ms"] >= 0
    metrics = client.get("/metrics")
    assert metrics.status_code == 200 and "kin_http_requests_total" in metrics.text
    seed = client.post("/v1/demo/seed")
    assert seed.status_code == 200
    assert seed.json()["users"] == ["usr_alice", "usr_bob"]


def test_profile_pair_presence_and_radar(client):
    alice = client.post("/v1/auth/demo-session", json={"handle": "alice2", "display_name": "Alice 2"}).json()
    bob = client.post("/v1/auth/demo-session", json={"handle": "bob2", "display_name": "Bob 2"}).json()
    for session, profile in (
        (alice, {"now_building": "ESP32 device", "skills": ["frontend"], "needs": ["BLE"], "interests": ["hardware"], "ai_stack": ["Codex"], "public_summary": "builder", "visibility": "event"}),
        (bob, {"now_building": "BLE stack", "skills": ["BLE"], "needs": ["frontend"], "interests": ["hardware"], "ai_stack": ["FastAPI"], "public_summary": "engineer", "visibility": "event"}),
    ):
        assert client.put("/v1/me/profile", headers=auth(session["user_id"]), json=profile).status_code == 200
    devices = []
    for session, suffix in ((alice, "A"), (bob, "B")):
        paired = client.post("/v1/devices/pair", headers=auth(session["user_id"]), json={
            "hardware_uid": "TEST-%s" % suffix, "pairing_code": "CODE-%s" % suffix,
            "display_name": "Cardputer %s" % suffix,
        })
        assert paired.status_code == 200
        devices.append(paired.json()["id"])
    for session, device in ((alice, devices[0]), (bob, devices[1])):
        assert client.post("/v1/presence", headers=auth(session["user_id"]), json={
            "device_id": device, "venue_id": "hackathon", "coarse_zone": "hall"
        }).status_code == 200
    radar = client.get("/v1/radar", headers=auth(alice["user_id"]))
    assert radar.status_code == 200
    assert len(radar.json()) == 1
    assert radar.json()[0]["peer"]["display_name"] == "Bob 2"
    assert radar.json()[0]["peer"]["profile"]["now_building"] == "BLE stack"
    assert radar.json()[0]["peer"]["profile"]["skills"] == ["BLE"]
    detail = client.get("/v1/matches/%s" % radar.json()[0]["id"], headers=auth(alice["user_id"]))
    assert detail.status_code == 200
    assert detail.json()["peer"]["profile"]["needs"] == ["frontend"]


def test_two_device_handshake_and_idempotency(client):
    seed = client.post("/v1/demo/seed").json()
    match_id = seed["match_id"]
    occurred = datetime.now(timezone.utc).isoformat()
    nonce = "demo-proof-nonce"
    events = [
        {"event_id": "evt-gesture-a", "device_id": "dev_cardputer_a", "type": "handshake.gesture", "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce}},
        {"event_id": "evt-gesture-b", "device_id": "dev_cardputer_b", "type": "handshake.gesture", "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce}},
        {"event_id": "evt-confirm-a", "device_id": "dev_cardputer_a", "type": "handshake.confirmed", "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce}},
        {"event_id": "evt-confirm-b", "device_id": "dev_cardputer_b", "type": "handshake.confirmed", "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce}},
    ]
    for event in events:
        response = client.post("/v1/agent/events", headers=agent_headers(), json=event)
        assert response.status_code == 200, response.text
    assert response.json()["result"]["status"] == "connected"
    assert response.json()["result"]["relationship_id"].startswith("rel_")
    duplicate = client.post("/v1/agent/events", headers=agent_headers(), json=events[-1])
    assert duplicate.json()["duplicate"] is True
    relationships = client.get("/v1/relationships", headers=auth("usr_alice"))
    assert relationships.status_code == 200
    assert len(relationships.json()) == 1
    assert relationships.json()[0]["shared_context"]["why_you_met"]
    proactive = client.get("/v1/proactive", headers=auth("usr_alice"))
    assert proactive.status_code == 200
    assert any(item["kind"] == "follow_up" for item in proactive.json())


def test_ask_the_room_experience_match(client):
    client.post("/v1/demo/seed")
    need = client.post("/v1/needs", headers=auth("usr_alice"), json={
        "problem": "ESP32 BLE audio underrun and broken voice stream",
        "context": {"board": "Cardputer-Adv"},
    })
    assert need.status_code == 200
    matches = client.get("/v1/needs/%s/matches" % need.json()["id"], headers=auth("usr_alice"))
    assert matches.status_code == 200
    assert len(matches.json()) == 1
    assert matches.json()[0]["owner_id"] == "usr_bob"
    assert matches.json()[0]["score"] >= 0


def test_campfire_requires_each_member_and_confirmation_is_idempotent(client):
    alice = client.post("/v1/auth/demo-session", json={"handle": "camp-a", "display_name": "Alice"}).json()
    bob = client.post("/v1/auth/demo-session", json={"handle": "camp-b", "display_name": "Bob"}).json()
    kai = client.post("/v1/auth/demo-session", json={"handle": "camp-k", "display_name": "Kai"}).json()
    members = [
        {"agent_id": alice["user_id"], "display_name": "Alice", "skills": ["UX"], "needs": ["BLE"], "building": "KIN"},
        {"agent_id": bob["user_id"], "display_name": "Bob", "skills": ["BLE"], "needs": ["Data"], "building": "Device"},
        {"agent_id": kai["user_id"], "display_name": "Kai", "skills": ["Data"], "needs": ["UX"], "building": "Search"},
    ]
    created = client.post("/v1/campfires", headers=auth(alice["user_id"]), json={
        "name": "Hackathon team", "venue": "Hall", "expires_at": "2026-08-29T12:00:00Z",
        "members": members, "proposal": {"id": "proposal-1", "project_name": "Room Signal", "one_liner": "Build it", "rationale": "Complementary skills", "roles": [], "missing": []},
    })
    assert created.status_code == 200, created.text
    room = created.json(); assert room["status"] == "proposed" and room["version"] == 1
    for index, session in enumerate((alice, bob, kai), start=1):
        key = "campfire-confirm-%s" % index
        response = client.post("/v1/campfires/%s/confirm" % room["id"], headers=auth(session["user_id"]), json={"expected_version": index, "idempotency_key": key})
        assert response.status_code == 200, response.text
        room = response.json()
        duplicate = client.post("/v1/campfires/%s/confirm" % room["id"], headers=auth(session["user_id"]), json={"expected_version": index, "idempotency_key": key})
        assert duplicate.status_code == 200 and duplicate.json()["version"] == room["version"]
    assert room["status"] == "formed"
    assert all(member["confirmation"] == "confirmed" for member in room["members"])
    listed = client.get("/v1/campfires", headers=auth(bob["user_id"]))
    assert listed.status_code == 200 and listed.json()[0]["id"] == room["id"]


def test_signal_creates_proactive_match_for_other_agent(client):
    alice = client.post("/v1/auth/demo-session", json={"handle": "signal-a", "display_name": "Alice"}).json()
    bob = client.post("/v1/auth/demo-session", json={"handle": "signal-b", "display_name": "Bob"}).json()
    client.put("/v1/me/profile", headers=auth(bob["user_id"]), json={
        "now_building": "BLE firmware", "skills": ["ESP32", "BLE"], "needs": [],
        "interests": ["Agent Hardware"], "ai_stack": ["Codex"], "public_summary": "builder", "visibility": "event",
    })
    signal = client.post("/v1/signals", headers=auth(alice["user_id"]), json={
        "kind": "NEED", "statement": "需要一个懂 ESP32 BLE 的人", "context": {"event": "hackathon"},
    })
    assert signal.status_code == 200 and signal.json()["kind"] == "NEED"
    feed = client.get("/v1/signals", headers=auth(bob["user_id"]))
    assert feed.status_code == 200 and feed.json()[0]["id"] == signal.json()["id"]
    proactive = client.get("/v1/proactive", headers=auth(bob["user_id"]))
    assert proactive.status_code == 200
    assert proactive.json()[0]["kind"] == "signal_match"
    assert proactive.json()[0]["source_id"] == signal.json()["id"]
    notifications = client.get("/v1/notifications?unread_only=true", headers=auth(bob["user_id"]))
    assert notifications.status_code == 200 and len(notifications.json()) == 1
    notification = notifications.json()[0]
    assert notification["source_id"] == signal.json()["id"]
    assert notification["delivery_status"] == "delivered" and notification["read_at"] is None
    read = client.post("/v1/notifications/%s/read" % notification["id"], headers=auth(bob["user_id"]))
    assert read.status_code == 200 and read.json()["read_at"] is not None
    assert client.get("/v1/notifications?unread_only=true", headers=auth(bob["user_id"])).json() == []


def test_demo_session_issues_signed_access_token(client):
    login = client.post("/v1/auth/demo-session", json={"handle": "signed-user", "display_name": "Signed"})
    session = login.json()
    assert session["access_token"].startswith("kin1.")
    assert "kin_session=" in login.headers["set-cookie"] and "HttpOnly" in login.headers["set-cookie"]
    response = client.get("/v1/me", headers={"Authorization": "Bearer %s" % session["access_token"]})
    assert response.status_code == 200 and response.json()["id"] == session["user_id"]
    tampered = session["access_token"][:-1] + ("a" if session["access_token"][-1] != "a" else "b")
    assert client.get("/v1/me", headers={"Authorization": "Bearer %s" % tampered}).status_code == 401


def test_trusted_identity_exchange_issues_multi_user_token(client):
    payload = {"user_id": "usr_eigenflux_01", "handle": "eigenflux-user", "display_name": "EigenFlux User"}
    assert client.post("/v1/auth/exchange", json=payload).status_code == 401
    exchange = client.post("/v1/auth/exchange", headers={"X-Auth-Exchange-Token": "test-auth-exchange-token"}, json=payload)
    assert exchange.status_code == 200 and exchange.json()["access_token"].startswith("kin1.")
    me = client.get("/v1/me", headers={"Authorization": "Bearer %s" % exchange.json()["access_token"]})
    assert me.status_code == 200 and me.json()["handle"] == "eigenflux-user"


def test_signed_access_token_expires():
    token = issue_access_token("usr_expiring", now=100)
    assert verify_access_token(token, now=101) == "usr_expiring"
    assert verify_access_token(token, now=100 + 86400) is None


def test_experience_candidate_requires_summary_and_explicit_approval(client):
    owner = client.post("/v1/auth/demo-session", json={"handle": "candidate-a", "display_name": "Alice"}).json()
    artifact = {
        "problem": "ESP32 BLE disconnect", "context": "Cardputer", "cause": "queue saturation",
        "worked": "reduce telemetry", "failed": "increase retries", "confidence": 0.9, "visibility": "event",
    }
    rejected = client.post("/v1/experience-candidates", headers=auth(owner["user_id"]), json={
        "artifact": {**artifact, "messages": ["private"]}, "source": {"source": "chatgpt"},
    })
    assert rejected.status_code == 400
    created = client.post("/v1/experience-candidates", headers=auth(owner["user_id"]), json={
        "artifact": artifact, "source": {"source": "chatgpt", "source_id": "conv-1", "title": "BLE debug", "raw": "drop me"},
    })
    assert created.status_code == 200 and created.json()["status"] == "pending"
    assert "raw" not in created.json()["source"]
    key = "candidate-approve-1"
    decided = client.post("/v1/experience-candidates/%s/decision" % created.json()["id"], headers=auth(owner["user_id"]), json={"decision": "approve", "idempotency_key": key})
    assert decided.status_code == 200 and decided.json()["status"] == "approved"
    duplicate = client.post("/v1/experience-candidates/%s/decision" % created.json()["id"], headers=auth(owner["user_id"]), json={"decision": "approve", "idempotency_key": key})
    assert duplicate.status_code == 200 and duplicate.json()["status"] == "approved"


def test_agent_gateway_rejects_bad_token(client):
    response = client.post("/v1/agent/events", json={
        "event_id": "evt-auth-test", "device_id": "missing", "type": "device.online",
        "occurred_at": datetime.now(timezone.utc).isoformat(), "payload": {},
    })
    assert response.status_code == 401


def test_handshake_requires_both_gestures_and_both_confirmations(client):
    match_id = client.post("/v1/demo/seed").json()["match_id"]
    occurred = datetime.now(timezone.utc).isoformat()
    nonce = "negative-case-proof"
    one_gesture = client.post("/v1/agent/events", headers=agent_headers(), json={
        "event_id": "neg-gesture-a", "device_id": "dev_cardputer_a", "type": "handshake.gesture",
        "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce},
    })
    assert one_gesture.status_code == 200
    for suffix, device in (("a", "dev_cardputer_a"), ("b", "dev_cardputer_b")):
        result = client.post("/v1/agent/events", headers=agent_headers(), json={
            "event_id": "neg-confirm-%s" % suffix, "device_id": device, "type": "handshake.confirmed",
            "occurred_at": occurred, "payload": {"match_id": match_id, "proof_nonce": nonce},
        })
        assert result.status_code == 200
    assert result.json()["result"]["status"] == "pending"
    assert result.json()["result"]["relationship_id"] is None


def test_agent_event_rejects_short_proof(client):
    match_id = client.post("/v1/demo/seed").json()["match_id"]
    response = client.post("/v1/agent/events", headers=agent_headers(), json={
        "event_id": "short-proof", "device_id": "dev_cardputer_a", "type": "handshake.gesture",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "payload": {"match_id": match_id, "proof_nonce": "tiny"},
    })
    assert response.status_code == 422


def test_real_agent_link_wire_events_complete_handshake(client):
    seed = client.post("/v1/demo/seed").json()
    occurred = datetime.now(timezone.utc).isoformat()
    nonce = "real-cardputer-shared-proof"
    match_id = seed["match_id"]

    def encoded(value: bytes) -> str:
        return base64.b64encode(value).decode("ascii")

    sequence = [
        ("wire-gesture-a", "NODE-A7B2", 100, encoded(json.dumps({"kind": "handshake.gesture", "peak_g": 2.14}).encode())),
        ("wire-gesture-b", "NODE-7FAE", 100, encoded(json.dumps({"kind": "handshake.gesture", "peak_g": 2.08}).encode())),
        ("wire-confirm-a", "NODE-A7B2", 1, encoded(bytes([0, 1]))),
        ("wire-confirm-b", "NODE-7FAE", 1, encoded(bytes([0, 1]))),
    ]
    for event_id, device_name, wire_event_id, data_base64 in sequence:
        response = client.post("/v1/agent-link/events", headers=agent_headers(), json={
            "event_id": event_id, "device_name": device_name,
            "wire_event_id": wire_event_id, "data_base64": data_base64,
            "occurred_at": occurred, "match_id": match_id, "proof_nonce": nonce,
        })
        assert response.status_code == 200, response.text
    body = response.json()
    assert body["result"]["status"] == "connected"
    assert body["result"]["translated_type"] == "handshake.confirmed"
    assert body["result"]["device_name"] == "NODE-7FAE"
    assert body["result"]["relationship_id"].startswith("rel_")
    restored = client.get("/v1/agent-link/sessions/%s" % match_id, headers=agent_headers())
    assert restored.status_code == 200
    assert restored.json()["status"] == "connected"
    assert restored.json()["relationship_id"] == body["result"]["relationship_id"]


def test_agent_link_session_state_is_ready_before_first_event(client):
    match_id = client.post("/v1/demo/seed").json()["match_id"]
    state = client.get("/v1/agent-link/sessions/%s" % match_id, headers=agent_headers())
    assert state.status_code == 200
    assert state.json() == {
        "match_id": match_id, "status": "ready", "relationship_id": None,
    }
    assert client.get("/v1/agent-link/sessions/missing", headers=agent_headers()).status_code == 404


def test_agent_link_wire_event_rejects_unknown_device_and_payload(client):
    seed = client.post("/v1/demo/seed").json()
    base = {
        "event_id": "wire-invalid", "device_name": "NODE-NOT-PAIRED",
        "wire_event_id": 1, "data_base64": base64.b64encode(bytes([0, 1])).decode(),
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "match_id": seed["match_id"], "proof_nonce": "valid-proof-nonce",
    }
    assert client.post("/v1/agent-link/events", headers=agent_headers(), json=base).status_code == 404
    base.update({"device_name": "NODE-A7B2", "wire_event_id": 100,
                 "data_base64": base64.b64encode(b'{"kind":"other"}').decode()})
    assert client.post("/v1/agent-link/events", headers=agent_headers(), json=base).status_code == 422

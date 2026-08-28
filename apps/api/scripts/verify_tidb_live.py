#!/usr/bin/env python3
"""Verify the KIN API, Agent_link loop and TiDB vector search against live TiDB."""

from __future__ import annotations

import argparse
import base64
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
from tidb_keychain import sqlalchemy_url  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8012")
    parser.add_argument("--agent-token", default="change-me")
    args = parser.parse_args()
    with httpx.Client(base_url=args.base_url, timeout=60, trust_env=False) as client:
        ready = client.get("/ready")
        ready.raise_for_status()
        seed = client.post("/v1/demo/seed")
        seed.raise_for_status()
        match_id = seed.json()["match_id"]
        common = {
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "match_id": match_id,
            "proof_nonce": "tidb-live-proof",
        }
        events = [
            ("tidb-gesture-a", "NODE-A7B2", 100, b'{"kind":"handshake.gesture","peak_g":2.14}'),
            ("tidb-gesture-b", "NODE-7FAE", 100, b'{"kind":"handshake.gesture","peak_g":2.08}'),
            ("tidb-confirm-a", "NODE-A7B2", 1, bytes([0, 1])),
            ("tidb-confirm-b", "NODE-7FAE", 1, bytes([0, 1])),
        ]
        final = None
        for event_id, device, wire_id, raw in events:
            payload = {
                **common,
                "event_id": event_id,
                "device_name": device,
                "wire_event_id": wire_id,
                "data_base64": base64.b64encode(raw).decode(),
            }
            response = client.post(
                "/v1/agent-link/events",
                headers={"X-Agent-Gateway-Token": args.agent_token},
                json=payload,
            )
            response.raise_for_status()
            final = response.json()["result"]
        need_response = client.post(
            "/v1/needs",
            headers={"Authorization": "Bearer usr_alice"},
            json={
                "problem": "ESP32 BLE audio underrun and broken streaming",
                "context": {"board": "Cardputer-Adv", "transport": "BLE"},
            },
        )
        need_response.raise_for_status()
        need_id = need_response.json()["id"]
        matches_response = client.get(
            f"/v1/needs/{need_id}/matches",
            headers={"Authorization": "Bearer usr_alice"},
        )
        matches_response.raise_for_status()
        matches = matches_response.json()

    engine = create_engine(sqlalchemy_url(), pool_pre_ping=True, pool_reset_on_return=None)
    with engine.connect() as connection:
        vector_columns = connection.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema='kin' AND data_type='vector' "
            "AND table_name IN ('agent_profiles','need_signals','experience_artifacts')"
        )).scalar_one()
        vector_indexes = connection.execute(text(
            "SELECT COUNT(DISTINCT key_name) FROM information_schema.tidb_indexes "
            "WHERE table_schema='kin' AND table_name IN "
            "('agent_profiles','need_signals','experience_artifacts') "
            "AND key_name IN ('idx_profile_embedding','idx_need_embedding','idx_experience_embedding')"
        )).scalar_one()
        direct_similarity = connection.execute(text(
            "SELECT 1 - VEC_COSINE_DISTANCE(n.embedding, e.embedding) "
            "FROM need_signals n JOIN experience_artifacts e ON e.owner_id <> n.owner_id "
            "WHERE n.id=:need_id ORDER BY 1 DESC LIMIT 1"
        ), {"need_id": need_id}).scalar_one()
    print(json.dumps({
        "database": ready.json()["database"],
        "handshake": final["status"],
        "relationship_created": bool(final["relationship_id"]),
        "need_id": need_id,
        "experience_matches": len(matches),
        "top_match_score": matches[0]["score"] if matches else None,
        "vector_columns": int(vector_columns),
        "vector_indexes": int(vector_indexes),
        "direct_vector_similarity": round(float(direct_similarity), 4),
    }, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()

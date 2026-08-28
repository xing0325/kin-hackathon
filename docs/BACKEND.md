# Node Backend V0.1

## Delivered scope

The backend is a FastAPI modular monolith with a deterministic demo path and a TiDB production schema.

```text
Web / PWA
  -> REST + SSE
FastAPI
  -> Profiles / Devices / Presence / Radar
  -> Bilateral Handshake / Relationships
  -> Needs / Experience Search
  -> Agent Gateway
  -> Jobs
TiDB Cloud
  -> relational state + VECTOR(64)
```

## Implemented flows

1. Demo session and Builder Profile.
2. Cardputer pairing, heartbeat and coarse presence.
3. Presence-filtered Builder Radar and explainable deterministic score.
4. Shared proof nonce, two correlated gestures and two independent confirmations.
5. Idempotent Agent gateway using `event_id`.
6. Relationship creation and Shared Context transaction.
7. Need publication and Experience Artifact semantic retrieval.
8. SSE updates for device, presence and handshake changes.
9. Seed/reset and a real HTTP two-device simulator.
10. SQLite local mode plus TiDB `VECTOR(64)` migration and cosine search path.

## Boundary

- `POST /v1/agent/events` is the stable seam for ROROLEE / Cloud Agent. It is protected by `X-Agent-Gateway-Token` in V0.1.
- Frontend users use demo bearer tokens during the hackathon prototype. Production OAuth/passkeys are intentionally not implemented yet.
- Deterministic hashed-token embeddings keep local tests and the demo functional without an LLM key. The worker is the replacement seam for an OpenAI-compatible embedding and explanation provider.
- Raw conversations never enter cross-user matching. Only user-approved profile fields and Experience Artifacts are indexed.

## Main API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/auth/demo-session` | create/update a demo user |
| `PUT` | `/v1/me/profile` | update Builder Profile |
| `POST` | `/v1/devices/pair` | bind one Cardputer |
| `POST` | `/v1/devices/{id}/heartbeat` | status, battery and firmware |
| `POST` | `/v1/presence` | venue/coarse-zone presence |
| `GET` | `/v1/radar` | current match candidates |
| `POST` | `/v1/handshakes/{matchId}/confirm` | explicit Web confirmation |
| `POST` | `/v1/agent/events` | official Agent gateway events |
| `GET` | `/v1/relationships` | Relationship Memory |
| `POST` | `/v1/needs` | Ask the Room request |
| `GET` | `/v1/needs/{id}/matches` | matched Experience Artifacts |
| `GET` | `/v1/events/stream?token=...` | live PWA state |

The complete machine-readable contract is `packages/contracts/openapi.json`.

## Handshake invariant

A relationship is created only when all four facts hold:

```text
A gesture timestamp
B gesture timestamp
absolute time delta <= 3 seconds
A confirmed + B confirmed
```

Every event and confirmation has an idempotency key. Replaying the final confirmation returns the existing result rather than creating another relationship.

## Local validation

```bash
make api-install
make api-test
make api-run
# another terminal
make api-simulate
```

## Not yet connected

1. A real TiDB Cloud instance: migration and query path exist, but no credentials were provided for live validation.
2. ROROLEE/Cloud Agent: the gateway contract and simulator exist; the organizer's actual outbound interface remains unknown.
3. Production identity, email/OAuth, rate limiting and admin moderation.
4. A real embedding/LLM provider; deterministic local matching currently remains the reliable fallback.
5. Multi-instance SSE fan-out; V0.1 uses an in-process bounded broker. A production multi-replica deployment would require Redis/NATS or a database event stream.

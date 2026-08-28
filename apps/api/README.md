# Node Backend API

FastAPI modular monolith for Builder Profiles, Cardputer pairing, Radar, bilateral Context Handshake, Relationship Memory, Ask the Room and the official Agent gateway.

## Local development

```bash
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload
```

The default database is SQLite for local development. Production uses a TiDB/MySQL URL:

```text
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:4000/DATABASE?charset=utf8mb4
```

Apply `infra/migrations/0001` through `0004` in order before starting against TiDB. ORM `create_all` is intentionally enabled only for SQLite so that TiDB's `VECTOR(64)` columns stay authoritative.

### Live TiDB Zero (macOS)

The hackathon instance credentials are kept in macOS Keychain, not in `.env`
or the repository. With the Keychain items installed, the repeatable commands
are:

```bash
./tools/migrate-tidb.py
./tools/run-tidb-api.sh 8012
cd apps/api
.venv/bin/python scripts/verify_tidb_live.py --base-url http://127.0.0.1:8012
```

The live verifier resets/seeds demo data, completes the exact Agent_link wire
handshake, creates an Ask the Room Need, checks its Experience Match, and runs a
direct TiDB `VEC_COSINE_DISTANCE` query. A cold serverless seed can take tens of
seconds, so live demo clients use a 60-second request timeout.

## Demo

```bash
curl -X POST http://127.0.0.1:8000/v1/demo/seed
.venv/bin/python scripts/simulate_two_devices.py --agent-token change-me
```

Call `/v1/auth/demo-session` for a signed `kin1` access token and HttpOnly session cookie. Raw demo user IDs remain accepted only while `DEMO_MODE=true`. Interactive OpenAPI docs are available at `/docs`; the frontend contract snapshot lives at `../../packages/contracts/openapi.json`.

## Release authentication and operations

- The trusted EigenFlux identity layer exchanges a verified identity through `POST /v1/auth/exchange` with `X-Auth-Exchange-Token`.
- Production rejects default auth secrets and raw user-id bearer tokens.
- `/health` identifies the release, `/ready` verifies the database and reports latency, and `/metrics` exposes low-cardinality Prometheus counters.
- Every response includes `X-Request-ID`; an incoming ID is preserved across proxy and API logs.
- Signal matches and Relationship follow-ups are delivered to the persistent `/v1/notifications` inbox and require an owner-scoped read acknowledgement.

See `infra/RELEASE.md` and `infra/docker-compose.release.yml` for the deployment runbook.

### Agent_link bridge

ROROLEE / AgentStack forwards the bytes emitted by `agent_link_push_event` to
`POST /v1/agent-link/events`. The gateway adds only `match_id` and the active
`proof_nonce`. The demo seed binds the two physical advertising names:

- `NODE-A7B2` -> `dev_cardputer_a`
- `NODE-7FAE` -> `dev_cardputer_b`

`wire_event_id=100` with `{"kind":"handshake.gesture"}` becomes
`handshake.gesture`; `wire_event_id=1` with button bytes `{0,1}` becomes
`handshake.confirmed`. Unsupported packets are rejected rather than guessed.

## Worker

```bash
.venv/bin/python -m app.worker --once
```

The current worker preserves a deterministic, no-provider demo path. It is the integration seam for an OpenAI-compatible embedding/LLM provider without putting model calls in request-critical matching or handshake transactions.

## Tests

```bash
.venv/bin/pytest
```

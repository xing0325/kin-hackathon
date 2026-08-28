# Shared contracts

- `openapi.json`: generated from the running FastAPI application and consumed by the Web/PWA client generator.
- `agent-event.schema.json`: stable Cloud Agent / ROROLEE gateway envelope.
- `agent-link-wire-event.schema.json`: exact bridge envelope for bytes emitted by official `agent_link_push_event`.

Regenerate OpenAPI after backend schema changes:

```bash
cd apps/api
.venv/bin/python -c 'import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))' > ../../packages/contracts/openapi.json
```

`handshake.gesture` and `handshake.confirmed` payloads require `match_id` and the shared one-time `proof_nonce`. All gateway writes are deduplicated by `event_id`.

The physical demo devices use `NODE-A7B2` and `NODE-7FAE`. ROROLEE /
AgentStack forwards their official wire packets to `POST /v1/agent-link/events`;
the backend performs the only translation into domain handshake events.

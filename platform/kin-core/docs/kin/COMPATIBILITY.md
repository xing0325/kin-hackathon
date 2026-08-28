# KIN compatibility contract

During the Go migration, the Cardputer Agent_link relay keeps the current HTTP
surface. Each route moves behind the EigenFlux/KIN gateway only after behavior
parity tests pass.

| Existing route | Go owner | Required behavior |
|---|---|---|
| `POST /v1/agent-link/events` | `rpc/handshake` | Idempotently accept verified button and gesture events. |
| `GET /v1/agent-link/sessions/{match_id}` | `rpc/handshake` | Restore ready, handshaking or connected device state. |
| `GET /v1/radar` | `rpc/presence` + `pkg/kinmatch` | Return nearby candidates ordered by match score. |
| `POST /v1/handshakes/{match_id}/confirm` | `rpc/handshake` | Require bilateral confirmation and gesture evidence. |
| `GET /v1/relationships/{id}` | `rpc/relationship` | Return participant-only Shared Context. |
| `GET /api/v2/console/bff/agents/me/card/page` | EigenFlux Agent Card | Return the first-paint Card and current profile facts. |
| `GET /api/v2/console/bff/agents/me/card/refresh-context` | EigenFlux Agent Card | Return versioned editable fields and protected paths. |
| `PUT /api/v2/console/bff/agents/me/profile/fields` | EigenFlux Agent Card | Apply reviewed field changes with optimistic version checking. |
| `POST /v1/experiences` | `rpc/experience` | Publish one human-approved structured artifact without raw conversation text. |
| `POST /v1/needs` | `rpc/experience` | Create an open Need and its embedding. |
| `GET /v1/needs/{id}/matches` | `rpc/experience` | Return permission-filtered Experience matches. |

## Storage split

- PostgreSQL remains the upstream fact store for identity, feed, messaging,
  Attention, Runtime and Activity.
- Redis remains the stream, cache, lease, rate-limit and realtime layer.
- TiDB owns KIN profiles/vectors, presence, matches, handshakes, relationships,
  needs and Experience Artifacts.
- Elasticsearch remains available for upstream content retrieval while KIN
  person and experience retrieval use TiDB Vector.

# Claude Max Work Package — Experience Ingestion Vertical Slice

## Objective

Turn the existing KIN Conversation Collector and backend Experience API into one privacy-preserving vertical slice:

```text
local conversation export
→ Local Bridge
→ Experience Candidate
→ user review and confirmation
→ POST /v1/experiences
→ Need / Experience match
```

This is the best parallel assignment because it advances Ask the Room and Context Compiler while avoiding the stable Cardputer firmware and the actively designed KIN Field website.

## Read first

1. `docs/PROJECT_CONTEXT.md`
2. The top `Executive Current State` section in `docs/STATUS.md`
3. `docs/SOFTWARE_ARCHITECTURE.md`
4. `docs/BACKEND.md`
5. `apps/browser-extension/README.md`
6. `packages/contracts/openapi.json`
7. `apps/api/README.md`

Treat `PROJECT_CONTEXT.md` as product truth and the top of `STATUS.md` as current implementation truth. Older chronological entries are evidence, not the current phase.

## Primary assignment

Create an isolated Local Bridge that consumes `kin-conversation-export` JSON and produces reviewable Experience Candidates with these fields:

```text
source_id
problem
context
cause
worked
failed
confidence
source_platform
source_session_title
local_provenance
```

Requirements:

- Raw conversations stay local by default.
- Candidate generation must work with a deterministic local fixture when no model credential exists.
- A provider interface may support a real LLM, but secrets must come only from environment/keychain configuration.
- The user must explicitly approve a candidate before `POST /v1/experiences`.
- Ignore decisions from the collector remain authoritative and cannot be silently reintroduced.
- Store only the minimum provenance needed to trace a candidate locally; do not send raw messages to the backend.
- Add a small review UI or local page showing source, extracted fields, edit, approve and reject actions.

## Secondary assignment

Prepare and, when credentials are available, verify the real TiDB path:

- audit `infra/migrations/0001_initial_tidb.sql` against ORM/API behavior;
- provide repeatable migration, seed and vector-query commands;
- retain SQLite as the zero-credential local test path;
- use a real TiDB `VECTOR` query when `DATABASE_URL` is present;
- never report TiDB validation when only the SQLite fallback ran.

## Ownership boundaries

Claude owns:

- a new isolated Local Bridge directory, preferably `apps/local-bridge/`;
- collector export contract additions needed by that bridge;
- Experience Candidate schema, tests and review flow;
- backend changes strictly required for approved candidate ingestion;
- TiDB verification tooling and documentation.

Claude does not own:

- `firmware/cardputer-adv/` or physical-device flashing;
- the Agent_link gesture/confirmation state machine;
- redesigning `apps/web/` or its KIN Field WebGL interaction;
- new chat platforms until the five existing adapters pass signed-in smoke tests;
- full chat-history cloud upload, social feeds, VBTI or Campfire.

## Coordination rule

The project root is currently not a Git repository. Before parallel editing, use an isolated project copy or establish an agreed Git baseline. Do not let two agents edit the same files concurrently. Prefer additive work in `apps/local-bridge/`; coordinate any edits to `apps/api/`, `packages/contracts/` or `docs/STATUS.md` before applying them.

## Acceptance commands

Keep existing checks green:

```bash
cd apps/api && .venv/bin/pytest
cd apps/browser-extension && npm test && npm run build
cd apps/web && npm test && npm run build
make -C tools/agent-link-relay test all
```

Add Local Bridge test/build commands covering:

1. valid export ingestion;
2. ignored session exclusion;
3. deterministic candidate extraction;
4. edit and approval;
5. rejection without upload;
6. approved `/v1/experiences` creation;
7. Need returning the created Experience match;
8. raw conversation text absent from the backend request and database record.

## Definition of done

- A real or sanitized collector export produces at least one editable candidate locally.
- Rejected and ignored items never reach the backend.
- An approved candidate creates an Experience Artifact through the existing API.
- A seeded Need retrieves that artifact with score and explanation.
- All existing and new tests/builds pass from a clean local start.
- TiDB tooling either records a real vector query or clearly reports the external credential dependency.
- `docs/STATUS.md` records changed, verified, failed/blocking and next-action evidence.

# KIN Frontend Handoff

## Start here

The user product lives in:

```text
platform/kin-core/console/kin-webapp
```

```bash
cd platform/kin-core/console/kin-webapp
npm ci
npm run dev
```

Use `http://127.0.0.1:4174/today?demo=1` while working on UI. Demo mode is
deterministic and covers all implemented pages without requiring TiDB, FastAPI,
EigenFlux services, or account credentials.

## Page map

| Route | Primary source | Product surface |
| --- | --- | --- |
| `/login`, `/onboarding`, `/today` | `src/App.tsx` | Entry, identity setup, proactive home |
| `/radar`, `/radar/:matchId` | `src/radar.tsx` | Builder Radar, Why You Match, Handshake entry |
| `/ask` | `src/ask.tsx` | Ask the Room and Experience results |
| `/kin`, `/kin/:relationshipId` | `src/kin.tsx` | Relationship Memory and Shared Context |
| `/me` | `src/me.tsx` | Builder Profile and Context Studio |
| `/campfire` | `src/campfire.tsx` | Team formation and member confirmation |
| `/signals` | `src/signals.tsx` | NEED/BUILDING/SOLVED/DISCOVERED/AVAILABLE feed |

Shared styling is in `src/style.css`. API adapters are in `src/api.ts`, types in
`src/types.ts`, deterministic content in `src/fixtures.ts`, and pure interaction
rules in `src/logic.ts`.

## Data modes

- `?demo=1` or `VITE_KIN_DEMO=1`: use deterministic fixtures; this is what
  GitHub Pages publishes.
- Real mode: use same-origin EigenFlux Console V2 endpoints and KIN endpoints.
- Local split services: set `VITE_KIN_API_BASE=http://127.0.0.1:8012`.

Do not put API keys, TiDB credentials, private profiles, or raw conversation
content into frontend environment files or fixtures.

## Product invariants

- A web click starts a Context Handshake; it does not pretend the bilateral
  physical confirmation has completed.
- Why You Match must explain specific intersections, not show only a score.
- Shared Context is visible only to relationship participants.
- Campfire becomes formed only after every member confirms their own role.
- Experience publishing contains structured summaries, never raw chats.
- Public Profile editing must preserve field permissions and version checks.

## Contribution workflow

1. Create a feature branch from `main`.
2. Keep UI work inside `console/kin-webapp` unless a contract change is needed.
3. Add or update a pure logic test for interaction changes.
4. Run `npm test` and `npm run build`.
5. Open a pull request with before/after screenshots and list the routes changed.

Pushes to `main` automatically test, build, and deploy the demo to GitHub Pages.

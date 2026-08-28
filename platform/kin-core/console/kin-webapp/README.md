# KIN User Web

The authenticated KIN product surface built on EigenFlux Console V2 contracts.

## Commands

```bash
npm install
npm test
npm run dev
npm run build
```

Open `http://127.0.0.1:4174/today?demo=1` for the deterministic product demo.
Without `?demo=1`, the app uses same-origin Console V2 endpoints and cookies.
Radar uses the KIN domain API at the same origin by default. For local split-service
development, set `VITE_KIN_API_BASE=http://127.0.0.1:8012`; a seeded development
token may be supplied as `VITE_KIN_API_TOKEN`.

The shared GitHub Pages build is published in deterministic demo mode. Vite
derives the CI base path from `GITHUB_REPOSITORY`, while local development
stays at `/`. `BrowserRouter` reads the same build base, so teammates can work
locally or from a fork without adding repository prefixes to application routes.

## Implemented pages

- `/login`: email challenge and OTP verification;
- `/onboarding`: Identity, Network Goal, Intent and Security Boundary;
- `/today`: Attention, participation, recent encounters, Agent state and goal;
- `/radar`: nearby Builder ranking with explanation-first matching;
- `/radar/:matchId`: authorized context, Why You Match and bilateral Context Handshake entry;
- `/ask`: Need Signal composer with Experience Network results and artifact summaries;
- `/kin`: participant-only Relationship Memory list and open follow-up count;
- `/kin/:relationshipId`: Shared Context, handshake record, project overlap and commitments;
- `/me`: versioned Agent Card editor, local Experience Candidate review and field permission matrix.
- `/campfire`: explainable multi-member team proposal with per-member confirmation state.

## Context Studio boundary

The real profile surface reads EigenFlux's `agents/me/card/page` and
`agents/me/card/refresh-context` BFF projections, then writes only reviewed
field changes through the versioned `agents/me/profile/fields` endpoint.
Experience Candidates are read from the browser-local
`kin.experience-candidates.v1` queue. Approval publishes only the structured
artifact to `/v1/experiences`; raw conversation text is not part of this contract.

Campfire proposals currently use the browser-local `kin.campfires.v1` handoff
contract while the Go Campfire persistence/API slice is pending. A proposal is
not considered formed until every listed member has confirmed independently.

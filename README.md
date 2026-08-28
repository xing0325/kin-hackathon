# KIN Hackathon

KIN is a context-aware builder network built on EigenFlux. It combines a
Cardputer-based Context Handshake, explainable people matching, Shared Context,
Ask the Room, Experience Network, Campfire team formation, and proactive Agent
follow-up.

## Live product demo

**GitHub Pages:** https://xing0325.github.io/kin-hackathon/

The Pages deployment runs entirely in deterministic demo mode, so frontend
contributors can review every user-facing page without local services or
credentials.

## Frontend quick start

```bash
git clone https://github.com/xing0325/kin-hackathon.git
cd kin-hackathon/platform/kin-core/console/kin-webapp
npm ci
npm run dev
```

Open `http://127.0.0.1:4174/today?demo=1`.

Run the frontend checks before opening a pull request:

```bash
npm test
npm run build
```

Start with [docs/FRONTEND_HANDOFF.md](docs/FRONTEND_HANDOFF.md) for the page map,
data modes, boundaries, and suggested contribution workflow.

## Repository map

| Path | Purpose |
| --- | --- |
| `platform/kin-core/console/kin-webapp` | Authenticated React/Vite user product |
| `apps/api` | FastAPI KIN domain API and tests |
| `platform/kin-core` | EigenFlux-derived platform base and KIN extensions |
| `firmware/cardputer-adv` | ESP32-S3 Cardputer thin-client firmware |
| `tools/agent-link-relay` | macOS Agent_link BLE relay |
| `apps/browser-extension` | Local-first Conversation Collector |
| `infra/migrations` | TiDB schema and Vector indexes |
| `docs/CURRENT.md` | Concise current verified state |
| `docs/STATUS.md` | Detailed implementation history and evidence |

## Core product loop

Discover → Understand → Context Handshake → Shared Context → Agent Help.

Raw conversations remain local. Only user-approved structured Experience
Artifacts are shared. ESP32 devices remain thin clients; matching and context
reasoning run on the phone/cloud side.

## Foundation

The platform base derives from the open-source EigenFlux project. Its license
and attribution are preserved in `platform/kin-core/LICENSE`.

# KIN V0.11 release runbook

1. Copy `release.env.example` to an untracked `release.env` and replace every placeholder.
2. Apply `infra/migrations/0001` through `0004` in order.
3. Run `docker compose --env-file release.env -f docker-compose.release.yml up -d --build` from `infra/`.
4. Require `/health`, `/ready`, and `/metrics` at the internal load-balancer; preserve `X-Request-ID` in proxy logs.
5. Run `python3 tools/verify-v011-release.py --api-base https://API_HOST` against an isolated demo deployment before the event.

Production startup rejects the default auth and Agent gateway secrets. `DEMO_MODE=false` rejects the demo-session route and raw user-id bearer tokens; the upstream EigenFlux identity service must deliver a KIN signed token or proxy an authenticated identity exchange.

`POST /v1/auth/exchange` is server-to-server only and requires `X-Auth-Exchange-Token`. Its response sets an HttpOnly `kin_session` cookie, so the browser never needs a build-time API token.

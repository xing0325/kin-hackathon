# Agent_link macOS relay

Fallback last-mile bridge when ROROLEE / AgentStack does not expose a public
outbound webhook. It uses the official Agent_link BLE service `0xFFC0`,
subscribes to event characteristic `0xFFC4`, preserves the official 6-byte
frame and forwards only the verified button (`1`) and private gesture (`100`)
payloads to the backend. It also writes the official `0x33 IoActuate` command
to `0xFFC1` for ready/connected screen feedback. On restart it queries the
trusted session-state endpoint and restores either the ready or connected UI.

```bash
make -C tools/agent-link-relay test all

export NODE_API_BASE=http://127.0.0.1:8011
export NODE_AGENT_TOKEN=change-me
export NODE_MATCH_ID=mat_xxx
export NODE_PROOF_NONCE=cardputer-live-proof
tools/agent-link-relay/build/agent-link-relay
```

For a fresh local demo session, start or reset the backend and relay together:

```bash
tools/run-cardputer-demo.sh
```

Expected ready state:

```text
BLE_READY: NODE-A7B2 subscribed=FFC4 ready=1/2
BLE_READY: NODE-7FAE subscribed=FFC4 ready=2/2
RELAY_READY: shake both devices, then press G0 on both
```

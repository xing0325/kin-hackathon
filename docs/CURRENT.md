# KIN — Current State

## Core loop

Discover → Understand → Context Handshake → Shared Context → Agent Help.

## Verified now

- Two Cardputer-Adv devices complete the real bilateral handshake through Agent_link, BLE relay and FastAPI.
- TiDB Zero has the live schema, three `VECTOR(64)` columns/indexes and a verified vector-query closed loop.
- A new free TiDB Cloud Starter instance `KIN-Hackathon` is Active in Tokyo with the complete V0.11 schema: 17 tables, 11 Notification columns, 3 Vector columns and 3 Vector indexes.
- Its application credential is stored only in macOS Keychain, and the real API release loop passes against this instance. Zen/TUN routing is handled by binding only TiDB traffic to the active physical interface.
- User Web contains Login, Onboarding, Today, Radar/Match, Ask/Experience, Relationship Memory, Profile/Context Studio, Campfire and Signal.
- Broadcast supports NEED, BUILDING, SOLVED, DISCOVERED and AVAILABLE; matching Signals and relationship commitments feed proactive Today cards.
- Conversation Collector keeps raw conversations local; KIN Bridge produces summary-only candidates, and Context Studio requires explicit approval before publication.
- V0.11 adds signed multi-user sessions, a persistent Agent Inbox, request tracing, metrics, readiness checks and a repeatable two-account/two-device release regression.
- The complete source handoff is public at `github.com/xing0325/kin-hackathon`; its deterministic user demo is continuously deployed to `xing0325.github.io/kin-hackathon/` for frontend collaboration.

## Active implementation

V0.11 release hardening and the repeatable software candidate gate are complete. The final freeze is waiting only for both accepted Cardputer devices to be simultaneously powered and pass the recorded physical gesture/G0/display/tone gate.

## Constraints

- ESP32 remains a Thin Client.
- Raw conversations stay local; only approved Experience Artifacts are published.
- A team forms only after every member confirms their own role.
- Hardware facts require board/BSP/real-device evidence.

## Next release

Power both accepted Cardputer devices, run the final physical acceptance watcher, then freeze and tag the Hackathon Demo Candidate. No new product page is required before that acceptance.

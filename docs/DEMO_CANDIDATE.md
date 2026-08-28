# KIN Hackathon Demo Candidate Gate

The candidate freezes only after the software gate and the final two-device
physical gate both pass.

## 1. Software gate

```bash
tools/verify-demo-candidate.sh
```

It verifies FastAPI, the authenticated user web, the brand web, Conversation
Collector, Experience Bridge, Agent_link relay protocol/downlink, ordered TiDB
migrations, and the ESP-IDF 5.5.4 firmware build. The final line must include:

```text
DEMO_CANDIDATE_SOFTWARE_RESULT PASS
```

## 2. Physical gate

Power on both accepted Cardputer-Adv devices, then run:

```bash
tools/run-cardputer-demo.sh
```

Record the printed match ID. The relay must report both devices:

```text
BLE_READY: NODE-A7B2 subscribed=FFC4 ready=1/2
BLE_READY: NODE-7FAE subscribed=FFC4 ready=2/2
RELAY_READY: shake both devices, then press G0 on both
```

In another terminal, start the acceptance watcher:

```bash
tools/verify-cardputer-acceptance.py --match-id mat_xxx
```

Then complete the bilateral gesture and G0 confirmation. Accept only when:

- both screens show ready before the gesture;
- both motion events produce the short tone;
- both G0 confirmations are accepted once;
- both screens show `CONNECTED` and preserve the final state;
- the long success tone plays;
- the watcher prints `PHYSICAL_GATE_RESULT PASS` with one Relationship ID.

## 3. Freeze

After both gates pass, record the firmware SHA-256, Git commit, Pages URL,
TiDB migration result, Relationship ID, and acceptance time in `docs/STATUS.md`,
then tag the release as the Hackathon Demo Candidate.

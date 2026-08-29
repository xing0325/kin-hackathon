---
name: kin-profile-intelligence
description: Build a local-first KIN profile intelligence candidate from approved conversation exports and explicitly selected Agent configuration summaries; use for VBTI and collaboration matching preparation.
---

# KIN Profile Intelligence

Use `tools/kin_profile_intelligence.py` with two history inputs: the web chatbot `kin-conversation-export` and an optional local Agent `kin-agent-export` passed with `--agent-history`, or an explicitly selected read-only Agent SQLite history with `--agent-sqlite`. Add user-selected JSON configuration summaries with `--config`. Never upload or emit raw messages, prompts, secrets, URLs, tokens, or unapproved config values. Produce a reviewable `kin-profile-intelligence-candidate` JSON.

The compiler also aggregates opt-in usage events: per-model calls and input/output/total tokens, favorite model, harness frequency, skill/plugin frequency, and custom skill names. Pass only normalized usage summaries; never pass provider credentials or raw logs.

The output is evidence-backed candidate data, not a diagnosis. VBTI remains `candidate` until the user completes or explicitly accepts the VBTI quiz. Feed approved indicators and VBTI into KIN Profile/Match APIs; do not overwrite Current VBTI automatically.

For explicit local discovery, add one or more `--inventory-root` paths. The scanner reads filenames (`SKILL.md`) and normalized usage files only; it does not recurse into arbitrary home directories by default.

Example:

```bash
python3 tools/kin_profile_intelligence.py --input export.json --config agent-config-summary.json --agent-history local-agent-history.json --agent-sqlite ~/.codex/thread_history_1.sqlite --inventory-root ~/.codex/skills --output profile-candidate.json
```

## API review flow

After local generation, submit the candidate for explicit review:

```text
POST /v1/profile-intelligence/candidates
GET  /v1/profile-intelligence/candidates
POST /v1/profile-intelligence/candidates/{id}/decision  (approve|ignore)
```

Only candidates with `privacy.local_only=true` and `privacy.raw_messages_emitted=0` are accepted. Approval is a user decision; the API does not silently promote VBTI to Current.

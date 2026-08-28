# KIN Conversation Collector

Cross-browser Manifest V3 extension for Chrome, Edge, Firefox and Firefox-based Zen. It collects AI chatbot conversations into a local, portable KIN JSON export.

## Policy

Every discovered session is retained by default. A session is excluded only after the user explicitly checks **Ignore**. Ignore is sticky across later page captures.

Raw conversations stay in the extension's local IndexedDB Conversation Vault; this version never uploads them. V0.3 migrates the V0.2 `storage.local` records once and keeps the legacy copy for rollback. Export includes every non-ignored session.

## Supported web apps

- ChatGPT
- Claude
- Gemini
- 豆包
- DeepSeek

Adapters combine host/path identification with platform-specific message selectors and conservative generic fallbacks. Since chatbot DOMs change, each adapter must be smoke-tested after upstream UI updates.

## Load unpacked

1. Run `npm test && npm run build` in this directory.
2. Chrome/Edge: open `chrome://extensions`, enable Developer mode, and load `dist/` unpacked.
3. Firefox/Zen: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select `dist-firefox/manifest.json`. The build also produces `kin-conversation-collector-firefox.xpi`.
4. Open a supported chatbot. The current session and visible sidebar sessions are discovered automatically.
5. Use **ChatGPT 快速全量** for authenticated JSON pagination plus incremental detail retrieval. The importer uses a disposable background tab, skips unchanged local records, and applies pacing/retry when ChatGPT rate-limits detail requests.
6. Use **五平台 DOM 补抓** for ChatGPT、Claude、Gemini、豆包和 DeepSeek sidebar discovery and rendered-page fallback. Mark unwanted sessions as **Ignore**, then export JSON.

## Local KIN Bridge

The repository bridge converts an export into summary-only Experience candidates:

```bash
python3 ../../tools/kin_experience_bridge.py \
  --input /path/to/kin-conversation-export.json \
  --output /path/to/experience-candidates.json
```

Add `--api-base http://127.0.0.1:8000 --token TOKEN` to submit the candidates to the review queue. Submission does not publish an Experience Artifact; the user must still choose Approve or Ignore in Context Studio.

## Data boundary

The bridge reads raw messages locally, emits only the structured problem/context/cause/worked/failed/confidence fields, and drops message bodies and source URLs from its output. Candidate creation and Artifact publication remain separate explicit steps.

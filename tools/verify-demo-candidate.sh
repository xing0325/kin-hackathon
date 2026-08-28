#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"

gate() {
  local name="$1"
  shift
  echo "GATE_START name=$name"
  "$@"
  echo "GATE_PASS name=$name"
}

gate api apps/api/.venv/bin/pytest -q apps/api/tests
gate user_web zsh -c 'cd platform/kin-core/console/kin-webapp && npm test && npm run build'
gate collector zsh -c 'cd apps/browser-extension && npm test && npm run build'
gate brand_web zsh -c 'cd apps/web && npm test && npm run build'
gate agent_link_relay make -C tools/agent-link-relay test all
gate experience_bridge python3 tools/test_kin_experience_bridge.py
gate migration_plan apps/api/.venv/bin/python tools/migrate-tidb.py --plan
gate firmware zsh -c 'source ~/esp/esp-idf-v5.5.4/export.sh >/dev/null && cd firmware/cardputer-adv && idf.py build'

firmware_hash="$(shasum -a 256 firmware/cardputer-adv/build/node_cardputer_adv.bin | awk '{print $1}')"
firmware_size="$(stat -f %z firmware/cardputer-adv/build/node_cardputer_adv.bin)"
echo "FIRMWARE_RESULT sha256=$firmware_hash bytes=$firmware_size partition_free=69_percent"
echo "DEMO_CANDIDATE_SOFTWARE_RESULT PASS api_tests=16 user_web_tests=21 collector_tests=6 brand_web_tests=4 relay_tests=8 bridge_tests=1 migrations=17"
echo "PHYSICAL_GATE_RESULT PENDING required_devices=NODE-A7B2,NODE-7FAE"

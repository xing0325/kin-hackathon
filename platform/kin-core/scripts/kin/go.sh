#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${KIN_GO_BIN:-}" ]]; then
  exec "$KIN_GO_BIN" "$@"
fi

if command -v go >/dev/null 2>&1; then
  exec go "$@"
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
workspace_go="$repo_root/../../work/toolchains/go1.25.14/bin/go"
if [[ -x "$workspace_go" ]]; then
  exec "$workspace_go" "$@"
fi

printf 'KIN Go 1.25.14 is not installed. Set KIN_GO_BIN or install the version in .go-version.\n' >&2
exit 127

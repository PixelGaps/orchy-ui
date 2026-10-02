#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ORCHY_UI_ENV_FILE:-/etc/orchy-ui.env}"
if [[ -r "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

NODE_BIN_DIR="${ORCHY_UI_NODE_BIN_DIR:-}"
[[ -n "$NODE_BIN_DIR" && "$NODE_BIN_DIR" = /* ]] || {
  echo "ORCHY_UI_NODE_BIN_DIR must be an absolute configured runtime path" >&2
  exit 1
}
export PATH="$NODE_BIN_DIR:/usr/bin:/bin"

command -v node >/dev/null 2>&1 || { echo "configured node runtime is unavailable" >&2; exit 1; }
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) process.exit(1)' || {
  echo "Node.js >=20.19 is required by orchy-ui" >&2
  exit 1
}

exec node /var/lib/orchy-ui/current/local-socket-server.mjs

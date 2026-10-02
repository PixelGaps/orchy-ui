#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "run as root" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="${ORCHY_UI_REPO_DIR:-/opt/orchy-ui/source}"
STATE_DIR="${ORCHY_UI_STATE_DIR:-/var/lib/orchy-ui}"
REMOTE_URL="${ORCHY_UI_REMOTE_URL:-https://github.com/PixelGaps/orchy-ui.git}"
BRANCH="${ORCHY_UI_BRANCH:-main}"
SERVICE_USER="${ORCHY_UI_SERVICE_USER:-orchy-ui}"
ENV_FILE="${ORCHY_UI_ENV_FILE:-/etc/orchy-ui.env}"

for command in git flock tar systemctl systemd-analyze runuser ip find sort awk; do
  command -v "$command" >/dev/null 2>&1 || { echo "required command missing: $command" >&2; exit 1; }
done

node_runtime_ok() {
  local root="$1"
  [[ -x "$root/bin/node" && -x "$root/bin/npm" ]] || return 1
  "$root/bin/node" -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) process.exit(1)' >/dev/null 2>&1
}

discover_node_runtime() {
  local explicit="${ORCHY_UI_NODE_RUNTIME_SOURCE:-}"
  if [[ -n "$explicit" ]]; then
    node_runtime_ok "$explicit" || { echo "ORCHY_UI_NODE_RUNTIME_SOURCE is not a compatible Node.js >=20.19 + npm runtime: $explicit" >&2; return 1; }
    printf '%s\n' "$explicit"
    return 0
  fi

  local candidate node_path
  node_path="$(command -v node 2>/dev/null || true)"
  if [[ -n "$node_path" ]]; then
    candidate="$(cd "$(dirname "$node_path")/.." 2>/dev/null && pwd || true)"
    if [[ -n "$candidate" ]] && node_runtime_ok "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  fi

  while IFS= read -r candidate; do
    node_runtime_ok "$candidate" || continue
    printf '%s\n' "$candidate"
    return 0
  done < <(
    {
      find /home /root -path '*/.nvm/versions/node/*' -maxdepth 7 -type d 2>/dev/null || true
      find /opt -maxdepth 3 -type d -name 'node-v*' 2>/dev/null || true
    } | sort -Vr
  )
  return 1
}

NODE_RUNTIME_SOURCE="$(discover_node_runtime)" || {
  echo "Node.js >=20.19 with npm is required; no compatible local runtime was found" >&2
  exit 1
}
NODE_RUNTIME_DIR="/opt/orchy-ui/node-runtime"

ip link show tailscale0 >/dev/null 2>&1 || {
  echo "tailscale0 is required; refusing to create a non-private fallback listener" >&2
  exit 1
}

if ! getent group "$SERVICE_USER" >/dev/null; then
  groupadd --system "$SERVICE_USER"
fi
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --gid "$SERVICE_USER" --home-dir "$STATE_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

install -d -o "$SERVICE_USER" -g "$SERVICE_USER" -m 0750 /opt/orchy-ui "$STATE_DIR"

NODE_RUNTIME_TMP="/opt/orchy-ui/.node-runtime.$$"
rm -rf "$NODE_RUNTIME_TMP"
cp -a "$NODE_RUNTIME_SOURCE" "$NODE_RUNTIME_TMP"
chown -R root:"$SERVICE_USER" "$NODE_RUNTIME_TMP"
chmod -R g+rX,o-rwx "$NODE_RUNTIME_TMP"
rm -rf "$NODE_RUNTIME_DIR"
mv "$NODE_RUNTIME_TMP" "$NODE_RUNTIME_DIR"
runuser -u "$SERVICE_USER" -- env PATH="$NODE_RUNTIME_DIR/bin:/usr/bin:/bin" "$NODE_RUNTIME_DIR/bin/node" -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) process.exit(1)'
runuser -u "$SERVICE_USER" -- env PATH="$NODE_RUNTIME_DIR/bin:/usr/bin:/bin" "$NODE_RUNTIME_DIR/bin/npm" --version >/dev/null

if [[ ! -d "$REPO_DIR/.git" ]]; then
  rm -rf "$REPO_DIR"
  runuser -u "$SERVICE_USER" -- git clone --quiet --depth=1 --branch "$BRANCH" "$REMOTE_URL" "$REPO_DIR"
else
  chown -R "$SERVICE_USER:$SERVICE_USER" "$REPO_DIR"
  runuser -u "$SERVICE_USER" -- git -C "$REPO_DIR" remote set-url origin "$REMOTE_URL"
fi

if [[ ! -e "$ENV_FILE" ]]; then
  install -m 0644 "$ROOT_DIR/systemd/orchy-ui.env.example" "$ENV_FILE"
fi

ENV_TMP="$(mktemp)"
awk -v runtime="$NODE_RUNTIME_DIR/bin" '
  BEGIN { replaced=0 }
  /^ORCHY_UI_NODE_BIN_DIR=/ { print "ORCHY_UI_NODE_BIN_DIR=" runtime; replaced=1; next }
  { print }
  END { if (!replaced) print "ORCHY_UI_NODE_BIN_DIR=" runtime }
' "$ENV_FILE" >"$ENV_TMP"
install -m 0644 "$ENV_TMP" "$ENV_FILE"
rm -f "$ENV_TMP"

install -m 0644 "$ROOT_DIR/systemd/orchy-ui.socket" /etc/systemd/system/orchy-ui.socket
install -m 0644 "$ROOT_DIR/systemd/orchy-ui.service" /etc/systemd/system/orchy-ui.service
systemctl daemon-reload

# Build the current exact main SHA before opening the socket so the first visit
# does not pay initial npm/build latency.
runuser -u "$SERVICE_USER" -- env ORCHY_UI_ENV_FILE="$ENV_FILE" PATH="$NODE_RUNTIME_DIR/bin:/usr/bin:/bin" bash "$REPO_DIR/scripts/local-deploy.sh"

systemd-analyze verify "$ROOT_DIR/systemd/orchy-ui.socket" "$ROOT_DIR/systemd/orchy-ui.service"

systemctl disable --now orchy-ui.service >/dev/null 2>&1 || true
systemctl enable --now orchy-ui.socket

systemctl is-active --quiet orchy-ui.socket || { echo "orchy-ui.socket did not become active" >&2; exit 1; }
if systemctl is-active --quiet orchy-ui.service; then
  echo "orchy-ui.service unexpectedly remained resident after installation" >&2
  exit 1
fi

echo "orchy-ui installed: socket active on tailscale0:23236, application service idle"
echo "first Tailscale visit will wake the service and reconcile origin/$BRANCH before serving"

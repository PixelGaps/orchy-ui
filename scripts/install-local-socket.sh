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

for command in git npm node flock tar systemctl systemd-analyze runuser ip; do
  command -v "$command" >/dev/null 2>&1 || { echo "required command missing: $command" >&2; exit 1; }
done

node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) process.exit(1)' || {
  echo "Node.js >=20.19 is required by Vite 7" >&2
  exit 1
}

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

install -m 0644 "$ROOT_DIR/systemd/orchy-ui.socket" /etc/systemd/system/orchy-ui.socket
install -m 0644 "$ROOT_DIR/systemd/orchy-ui.service" /etc/systemd/system/orchy-ui.service
systemctl daemon-reload

# Build the current exact main SHA before opening the socket so the first visit
# does not pay initial npm/build latency.
runuser -u "$SERVICE_USER" -- env ORCHY_UI_ENV_FILE="$ENV_FILE" bash "$REPO_DIR/scripts/local-deploy.sh"

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

#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

ENV_FILE="${ORCHY_UI_ENV_FILE:-/etc/orchy-ui.env}"
if [[ -r "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

REPO_DIR="${ORCHY_UI_REPO_DIR:-/opt/orchy-ui/source}"
STATE_DIR="${ORCHY_UI_STATE_DIR:-/var/lib/orchy-ui}"
BRANCH="${ORCHY_UI_BRANCH:-main}"
REMOTE_URL="${ORCHY_UI_REMOTE_URL:-https://github.com/PixelGaps/orchy-ui.git}"
NODE_BIN_DIR="${ORCHY_UI_NODE_BIN_DIR:-}"
if [[ -n "$NODE_BIN_DIR" ]]; then
  [[ "$NODE_BIN_DIR" = /* ]] || { echo "[orchy-ui deploy] ERROR: ORCHY_UI_NODE_BIN_DIR must be absolute" >&2; exit 1; }
  export PATH="$NODE_BIN_DIR:/usr/bin:/bin"
fi

log() { printf '[orchy-ui deploy] %s\n' "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

for command in git npm node flock tar; do
  command -v "$command" >/dev/null 2>&1 || fail "required command missing: $command"
done
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) process.exit(1)' || fail "Node.js >=20.19 is required by Vite 7"

mkdir -p "$STATE_DIR/releases" "$STATE_DIR/npm-cache"
exec 9>"$STATE_DIR/deploy.lock"
flock -x 9

stable_release_available() {
  [[ -f "$STATE_DIR/current/dist/index.html" && -f "$STATE_DIR/current/local-socket-server.mjs" ]]
}

serve_stable_on_failure() {
  local reason="$1"
  printf '%s\n' "$reason" >"$STATE_DIR/last-deploy-error"
  if stable_release_available; then
    log "$reason; retaining deployed release $(cat "$STATE_DIR/deployed-sha" 2>/dev/null || printf unknown)"
    exit 0
  fi
  fail "$reason and no stable local release exists"
}

[[ -d "$REPO_DIR/.git" ]] || serve_stable_on_failure "repository checkout missing at $REPO_DIR"
git -C "$REPO_DIR" remote set-url origin "$REMOTE_URL"

if ! git -C "$REPO_DIR" fetch --quiet --depth=1 origin "$BRANCH"; then
  serve_stable_on_failure "unable to fetch origin/$BRANCH"
fi
TARGET_SHA="$(git -C "$REPO_DIR" rev-parse --verify FETCH_HEAD)"
[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]] || serve_stable_on_failure "origin/$BRANCH did not resolve to an exact SHA"
DEPLOYED_SHA="$(cat "$STATE_DIR/deployed-sha" 2>/dev/null || true)"

if [[ "$TARGET_SHA" == "$DEPLOYED_SHA" ]] && stable_release_available; then
  rm -f "$STATE_DIR/last-deploy-error"
  if [[ "$(git -C "$REPO_DIR" rev-parse HEAD)" == "$TARGET_SHA" ]]; then
    log "already deployed at $TARGET_SHA"
    exit 0
  fi
  log "release $TARGET_SHA already built; reconciling checkout"
  git -C "$REPO_DIR" clean -fdx >/dev/null
  exec /bin/sh -c 'git -C "$1" reset --hard "$2" >/dev/null || true' sh "$REPO_DIR" "$TARGET_SHA"
fi

BUILD_DIR="$(mktemp -d "$STATE_DIR/.build.XXXXXX")"
cleanup() { rm -rf "$BUILD_DIR"; }
trap cleanup EXIT

if ! git -C "$REPO_DIR" archive "$TARGET_SHA" | tar -x -C "$BUILD_DIR"; then
  serve_stable_on_failure "unable to materialize $TARGET_SHA"
fi

log "building exact SHA $TARGET_SHA"
if ! (
  cd "$BUILD_DIR"
  export HOME="$STATE_DIR"
  export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$STATE_DIR/npm-cache}"
  npm ci --no-audit --no-fund
  VITE_ORCHY_API_BASE_URL="/" npm run build
); then
  serve_stable_on_failure "build or deterministic validation failed for $TARGET_SHA"
fi

[[ -f "$BUILD_DIR/dist/index.html" ]] || serve_stable_on_failure "build for $TARGET_SHA did not produce dist/index.html"
[[ -f "$BUILD_DIR/scripts/local-socket-server.mjs" ]] || serve_stable_on_failure "build for $TARGET_SHA lacks local socket runtime"

RELEASE_DIR="$STATE_DIR/releases/$TARGET_SHA"
RELEASE_TMP="$STATE_DIR/releases/.${TARGET_SHA}.tmp.$$"
rm -rf "$RELEASE_TMP"
mkdir -p "$RELEASE_TMP"
cp -a "$BUILD_DIR/dist" "$RELEASE_TMP/dist"
install -m 0755 "$BUILD_DIR/scripts/local-socket-server.mjs" "$RELEASE_TMP/local-socket-server.mjs"
mkdir -p "$RELEASE_TMP/scripts"
install -m 0755 "$BUILD_DIR/scripts/live-dashboard-readiness.mjs" "$RELEASE_TMP/scripts/live-dashboard-readiness.mjs"
printf '%s\n' "$TARGET_SHA" >"$RELEASE_TMP/deployed-sha"

if [[ ! -d "$RELEASE_DIR" ]]; then
  mv "$RELEASE_TMP" "$RELEASE_DIR"
else
  rm -rf "$RELEASE_TMP"
fi
ln -sfn "releases/$TARGET_SHA" "$STATE_DIR/current.next"
mv -Tf "$STATE_DIR/current.next" "$STATE_DIR/current"
printf '%s\n' "$TARGET_SHA" >"$STATE_DIR/deployed-sha.next"
mv -f "$STATE_DIR/deployed-sha.next" "$STATE_DIR/deployed-sha"
rm -f "$STATE_DIR/last-deploy-error"

log "activated exact SHA $TARGET_SHA"
trap - EXIT
cleanup
# This is intentionally the final operation: replacing the checkout can replace
# this script itself. exec prevents the shell from reading a changed file after reset.
git -C "$REPO_DIR" clean -fdx >/dev/null
exec /bin/sh -c 'git -C "$1" reset --hard "$2" >/dev/null || true' sh "$REPO_DIR" "$TARGET_SHA"

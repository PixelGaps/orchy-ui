#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-unit}"
shift || true
FILTER_ARGS=("$@")
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT"
NPM="${ORCHY_NPM_BIN:-${MADRIGUERA_NPM_BIN:-npm}}"

case "$MODE" in
  unit|coverage) ;;
  *) echo "usage: web_test_toolchain.sh <unit|coverage>" >&2; exit 2 ;;
esac

cd "$WEB"

# The production lockfile intentionally contains only production/build tooling.
# Provision the pinned test-only toolchain ephemerally without mutating either
# package.json or package-lock.json.
if ! node -e "require.resolve('vitest/package.json'); require.resolve('@testing-library/react/package.json'); require.resolve('jsdom/package.json')" >/dev/null 2>&1; then
  "$NPM" install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund \
    vitest@3.2.4 \
    @vitest/coverage-v8@3.2.4 \
    @testing-library/jest-dom@6.9.1 \
    @testing-library/react@16.3.0 \
    @testing-library/user-event@14.6.1 \
    jsdom@26.1.0
fi

if [[ "$MODE" == "coverage" ]]; then
  exec ./node_modules/.bin/vitest run --config vitest.config.ts --coverage "${FILTER_ARGS[@]}"
fi
exec ./node_modules/.bin/vitest run --config vitest.config.ts "${FILTER_ARGS[@]}"

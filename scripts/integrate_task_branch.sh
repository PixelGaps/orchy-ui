#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage: bash scripts/integrate_task_branch.sh -- <validation-command> [args...]

Integrates the current Jira task branch into origin/main without a pull request.
The validation command is run after rebasing onto the exact current origin/main.
If main advances during the final push, one bounded resync + revalidation retry is allowed.
USAGE
}

if [[ $# -lt 2 || "$1" != "--" ]]; then
  usage
  exit 64
fi
shift

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
case "$branch" in
  task/OR-*|wip/OR-*|task-or-wip-OR-*) ;;
  *)
    echo "Refusing integration from non-task branch: ${branch:-DETACHED}" >&2
    exit 65
    ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing integration with a dirty worktree." >&2
  exit 66
fi

remote="${AGENT_INTEGRATION_REMOTE:-origin}"
main="${AGENT_INTEGRATION_MAIN:-main}"
max_attempts=2
attempt=1

while (( attempt <= max_attempts )); do
  git fetch --prune "$remote" "$main"
  base_before="$(git rev-parse "$remote/$main")"
  git rebase "$remote/$main"

  "$@"

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Validation left the worktree dirty; refusing integration." >&2
    exit 67
  fi

  if git push "$remote" "HEAD:refs/heads/$main"; then
    if git ls-remote --exit-code --heads "$remote" "refs/heads/$branch" >/dev/null 2>&1; then
      git push "$remote" --delete "$branch"
    fi
    echo "Integrated $branch into $remote/$main and removed its remote task branch."
    exit 0
  fi

  git fetch "$remote" "$main"
  base_after="$(git rev-parse "$remote/$main")"
  if [[ "$base_after" == "$base_before" ]]; then
    echo "Main did not advance; push failed for a non-race reason. Aborting without retry." >&2
    exit 68
  fi

  if (( attempt == max_attempts )); then
    echo "Main advanced again after the bounded retry. Checkpoint/requeue integration in Jira." >&2
    exit 69
  fi

  echo "Main advanced during integration; performing the single allowed resync and revalidation." >&2
  attempt=$((attempt + 1))
done

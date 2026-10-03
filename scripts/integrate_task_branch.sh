#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage: bash scripts/integrate_task_branch.sh -- <validation-command> [args...]

Integrates the current Jira task branch into origin/main without a pull request.
The validation command runs after rebasing onto the exact current origin/main.
A non-fast-forward main push is the serialization gate. If main advances during
integration, exactly one resync + revalidation retry is allowed.
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

git fetch --prune "$remote" "$main" "$branch"
remote_branch_sha="$(git rev-parse "$remote/$branch")"

cleanup_merged_task_branches() {
  git fetch --prune "$remote" "$main"
  while IFS= read -r ref; do
    [[ -n "$ref" ]] || continue
    candidate="${ref#refs/remotes/$remote/}"
    [[ "$candidate" != "$main" ]] || continue
    case "$candidate" in
      task/OR-*|wip/OR-*|task-or-wip-OR-*) ;;
      *) continue ;;
    esac
    expected="$(git rev-parse "$ref")"
    git push \
      --force-with-lease="refs/heads/$candidate:$expected" \
      "$remote" ":refs/heads/$candidate" >/dev/null 2>&1 || true
  done < <(
    git for-each-ref \
      --merged "$remote/$main" \
      --format='%(refname)' \
      "refs/remotes/$remote/task/OR-*" \
      "refs/remotes/$remote/wip/OR-*" \
      "refs/remotes/$remote/task-or-wip-OR-*"
  )
}

checkpoint_task_branch() {
  git push \
    --force-with-lease="refs/heads/$branch:$remote_branch_sha" \
    "$remote" "HEAD:refs/heads/$branch"
}

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
    if ! git push \
      --force-with-lease="refs/heads/$branch:$remote_branch_sha" \
      "$remote" ":refs/heads/$branch"; then
      echo "Main is integrated, but the task branch changed concurrently and was not deleted. Reconcile it in Jira." >&2
      exit 70
    fi
    cleanup_merged_task_branches
    echo "Integrated $branch into $remote/$main and removed its remote task branch."
    exit 0
  fi

  git fetch "$remote" "$main" "$branch"
  base_after="$(git rev-parse "$remote/$main")"
  if [[ "$base_after" == "$base_before" ]]; then
    echo "Main did not advance; push failed for a non-race reason. Aborting without retry." >&2
    exit 68
  fi

  if (( attempt == max_attempts )); then
    if checkpoint_task_branch; then
      echo "Main advanced again after the bounded retry. The rebased task branch was checkpointed remotely; record/requeue integration in Jira." >&2
      exit 69
    fi
    echo "Main advanced again and the task branch also changed concurrently. No ref was overwritten; reconcile the branch writers in Jira." >&2
    exit 71
  fi

  echo "Main advanced during integration; performing the single allowed resync and revalidation." >&2
  attempt=$((attempt + 1))
done

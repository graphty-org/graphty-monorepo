#!/usr/bin/env bash
#
# run-knip.sh -- run knip with the gitignore setting this checkout actually needs.
#
# WHY THIS IS NOT JUST `knip`, AND NOT JUST `knip --no-gitignore`. Either spelling
# is correct in one checkout and broken in the other, and this repository is
# routinely worked in both.
#
# knip stops reading ancestor .gitignore files only when it reaches a `.git`
# DIRECTORY. A worktree's `.git` is a FILE. So from a worktree under
# `.worktrees/<name>/`, knip keeps walking up, reads the main checkout's
# .gitignore, and applies its unanchored `.worktrees/` pattern -- which matches
# every absolute path inside the worktree. Every entry knip derives from a
# package.json is dropped and the whole tree is reported as dead code, while the
# same commit in the main checkout reports clean. `--no-gitignore` is the fix.
#
# But `--no-gitignore` run from the MAIN checkout is the mirror defect: nothing
# then hides `.worktrees/` from knip, so it walks a full checkout of this
# monorepo per worktree -- nineteen of them, twelve gigabytes -- and exhausts an
# eight-gigabyte JavaScript heap before it reaches an answer. knip's own `ignore`
# list does not help, because that filters what is REPORTED and not what is
# crawled.
#
# The condition below is the same one the defect turns on, so the two cannot
# drift: a `.git` directory means the main checkout, where .gitignore is exactly
# what we want knip to obey; a `.git` file means a worktree, where obeying it is
# what breaks the run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -d .git ]; then
    exec npx knip "$@"
fi

echo "run-knip: worktree checkout (.git is a file) -- passing --no-gitignore" >&2
exec npx knip --no-gitignore "$@"

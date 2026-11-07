#!/usr/bin/env bash
#
# run-knip.sh -- run knip from the repository root, obeying .gitignore.
#
# knip reads every ancestor .gitignore of the directory it runs in and stops only
# at a `.git` DIRECTORY. A worktree's `.git` is a FILE, so from a worktree under
# `.worktrees/<name>/` knip also reads the main checkout's .gitignore. It skips an
# ancestor's anchored patterns (`/.worktrees/`, `/tmp/`) but applies unanchored
# ones, and an unanchored `.worktrees/` hides every entry knip derives from a
# package.json. The root .gitignore anchors both, so a worktree run and a main
# checkout run read the same rules, and neither needs `--no-gitignore` (which
# made a worktree run scan build output and pass where CI failed, and made a
# main checkout run crawl every worktree until it ran out of heap).
#
# A main checkout still on an older .gitignore (unanchored `.worktrees/`) breaks
# a worktree run, so that one case keeps the old `--no-gitignore` behaviour.
# ponytail: delete the fallback once every main checkout has the anchored rule.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f .git ]; then
    MAIN_CHECKOUT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
    if grep -qx '\.worktrees/' "$MAIN_CHECKOUT/.gitignore" 2>/dev/null; then
        echo "run-knip: $MAIN_CHECKOUT/.gitignore has an unanchored .worktrees/;" \
            "passing --no-gitignore (update that checkout to drop this fallback)" >&2
        exec npx knip --no-gitignore "$@"
    fi
fi

exec npx knip "$@"

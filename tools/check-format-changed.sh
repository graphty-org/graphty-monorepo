#!/bin/bash
# Prettier check on the files this branch adds or modifies, and only those.
#
# The tree is not yet formatted as a whole (issue #239), so `prettier --check .` would fail on files
# nobody touched. Checking only the added and modified files stops new drift without making every
# branch in flight reformat code it never changed. When the tree is formatted, the gates switch to
# the full `pnpm run format:check` and this script goes away.
#
# The base defaults to where this branch left origin/master, the same base tools/prepush.sh uses for
# nx affected; CI passes origin/<base branch>. Deleted files are skipped, and --ignore-unknown skips
# files prettier has no parser for (shell scripts, .prettierignore itself).
#
# Usage: tools/check-format-changed.sh [base-ref]

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BASE="${1:-$(git merge-base origin/master HEAD)}"
mapfile -d '' FILES < <(git diff -z --name-only --diff-filter=ACMR "$BASE"...HEAD)

if [ ${#FILES[@]} -eq 0 ]; then
    echo "No added or modified files to check."
    exit 0
fi
pnpm exec prettier --check --ignore-unknown "${FILES[@]}"

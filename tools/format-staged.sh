#!/bin/bash
# Prettier on the files a commit stages, run by .husky/pre-commit: each staged file is formatted and
# staged again, so a formatting slip is fixed at commit time instead of failing the pre-push gate's
# "Formatting (changed files)" step, or CI's, minutes later.
#
# What it leaves alone:
# - a file that also has unstaged changes: formatting it and staging it again would stage the
#   unstaged half too. It is named, and the pre-push gate checks it.
# - visual-baselines/ (byte-exact images and records), deleted files, and anything prettier has no
#   parser for (--ignore-unknown) or .prettierignore excludes.
# - a merge commit: its staged files include everything the other branch changed, and formatting
#   those would put reformatting of other people's files into the merge.
# A file prettier cannot parse does not block the commit; prettier prints the error, and the
# pre-push gate fails on that file.
#
# Usage: tools/format-staged.sh   (from inside a git work tree)

set -uo pipefail

PRETTIER="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/node_modules/.bin/prettier"
cd "$(git rev-parse --show-toplevel)" || exit 1

[ -e "$(git rev-parse --git-path MERGE_HEAD)" ] && exit 0

mapfile -d '' STAGED < <(git diff --cached -z --name-only --diff-filter=ACMR -- . ':(exclude)visual-baselines/')
[ ${#STAGED[@]} -eq 0 ] && exit 0
mapfile -d '' UNSTAGED < <(git diff -z --name-only)

FILES=()
for f in "${STAGED[@]}"; do
    partial=0
    for u in "${UNSTAGED[@]}"; do [ "$f" = "$u" ] && partial=1 && break; done
    if [ $partial -eq 1 ]; then
        echo "format-staged: not formatting $f (it has unstaged changes too)"
    elif [ ! -L "$f" ]; then
        FILES+=("$f")
    fi
done
[ ${#FILES[@]} -eq 0 ] && exit 0

"$PRETTIER" --write --log-level warn --ignore-unknown "${FILES[@]}" ||
    echo "format-staged: prettier could not format every file (above); committing anyway"
git add -- "${FILES[@]}"

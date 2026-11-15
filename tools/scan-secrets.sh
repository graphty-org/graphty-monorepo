#!/bin/bash
# Secret scan: runs secretlint (.secretlintrc.json, the recommended preset) on what a commit or a push
# shares. Two forms:
#   tools/scan-secrets.sh --cached          the staged changes (.husky/pre-commit)
#   tools/scan-secrets.sh <base> <head>     every commit in <base>..<head> (.husky/pre-push, tools/pr-open.sh)
# It scans two things:
# - the working-tree copy of each file the diff names, so a secret is reported where it sits now;
# - every line the staged diff, or each non-merge commit in <base>..<head>, adds, written to a scratch
#   copy of its path. A push sends every commit, so a secret added in one commit and removed in a later
#   one is still refused (issue #6895), and a staged secret is scanned even when the working tree no
#   longer holds it. Only added lines are read, so a long branch costs what it changed, not its size.
# --no-gitignore: a file that is staged or committed is being shared whatever .gitignore says
# (git add -f tmp/...). A false positive goes in .secretlintignore.
# ponytail: merge commits are skipped (git log --no-merges): a secret written only in a merge's conflict
# resolution and removed later is missed; scan `git log --cc` for merges if that ever matters.
set -euo pipefail
# secretlint from this script's own checkout, which may be the gate's live copy rather than the one scanned.
secretlint="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/node_modules/.bin/secretlint"
# PREPUSH_ROOT: the checkout to scan when the gate runs from its live copy (tools/prepush.sh).
cd "${PREPUSH_ROOT:-$(dirname "${BASH_SOURCE[0]}")/..}"
unset PREPUSH_ROOT
root=$PWD

if [ "${1-}" = --cached ]; then
    git diff --name-only -z --diff-filter=ACMR --cached | xargs -0 -r "$secretlint" --no-gitignore
    patch=(diff --cached)
else
    [ $# = 2 ] || { echo "usage: $0 --cached | <base> <head>" >&2; exit 2; }
    git diff --name-only -z --diff-filter=ACMR "$1" "$2" | xargs -0 -r "$secretlint" --no-gitignore
    patch=(log --no-merges --format= -p "$1..$2")
fi

added=$(mktemp -d)
trap 'rm -rf "$added"' EXIT
# The patch's added lines, appended to $added/<path>: a path's "+++ b/<path>" line comes before its first
# hunk, and inside a hunk every line starts with " ", "+", "-" or "\", so "diff --git" ends the file.
diff=(git -c core.quotePath=false "${patch[@]}" --no-color --no-ext-diff --no-textconv --no-renames
    --src-prefix=a/ --dst-prefix=b/)
"${diff[@]}" --name-only -z | (cd "$added" && xargs -0 -r dirname -z -- | sort -zu | xargs -0 -r mkdir -p --)
"${diff[@]}" | awk -v dir="$added" '
    /^diff --git / { hunk = 0; next }
    !hunk && /^\+\+\+ b\// { if (out != "") close(out); out = dir "/" substr($0, 7); next }
    /^@@/ { hunk = 1; next }
    hunk && /^\+/ { print substr($0, 2) >> out }'
# --secretlintignore as a relative path: secretlint 13 drops an absolute one's patterns.
ignore=$(realpath --relative-to="$added" "$root/.secretlintignore")
if ! (cd "$added" && find . -type f -print0 | xargs -0 -r "$secretlint" --no-gitignore \
    --secretlintrc "$root/.secretlintrc.json" --secretlintignore "$ignore"); then
    echo "scan-secrets: a line added by ${1/--cached/the staged changes}${2:+..$2} holds a secret, even if the files no longer do" >&2
    exit 1
fi

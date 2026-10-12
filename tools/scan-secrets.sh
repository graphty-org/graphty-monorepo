#!/bin/bash
# Secret scan: runs secretlint (.secretlintrc.json, the recommended preset) on the files a
# git diff names. The arguments go straight to `git diff --name-only`:
#   tools/scan-secrets.sh --cached          the staged files (.husky/pre-commit)
#   tools/scan-secrets.sh <base> HEAD       the files a push changes (.husky/pre-push)
# --no-gitignore: a file that is staged or committed is being shared whatever .gitignore says
# (git add -f tmp/...). A false positive goes in .secretlintignore.
# ponytail: scans the working-tree copy of each file, not the staged blob; scan
# `git show :<path>` through --stdinFileName if a staged-then-deleted secret ever matters.
set -euo pipefail
# PREPUSH_ROOT: the checkout to scan when the gate runs from its live copy (tools/prepush.sh).
cd "${PREPUSH_ROOT:-$(dirname "${BASH_SOURCE[0]}")/..}"
unset PREPUSH_ROOT
git diff --name-only -z --diff-filter=ACMR "$@" | xargs -0 -r pnpm exec secretlint --no-gitignore

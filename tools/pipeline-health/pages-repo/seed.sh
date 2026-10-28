#!/bin/bash
# Pushes this folder (README.md, LICENSE, .github/workflows/ci.yml) to the main branch of the pages
# repository graphty-org/pipeline-health, as one commit on top of what main holds. Safe to run
# again: it commits nothing when main already matches. Needs push access to the repository
# (graphty-agent has maintain); refuses when the repository does not exist. Prints no secret.
#
#   bash tools/pipeline-health/pages-repo/seed.sh [remote-url]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="${1:-https://github.com/graphty-org/pipeline-health.git}"

if ! git ls-remote --heads "$REMOTE" >/dev/null 2>&1; then
    echo "seed: $REMOTE does not exist or is not readable; create it first (tmp/health-repo-create.sh)" >&2
    exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
if git ls-remote --exit-code --heads "$REMOTE" main >/dev/null 2>&1; then
    git clone -q --depth 1 --branch main "$REMOTE" "$WORK/repo"
else
    git init -q -b main "$WORK/repo"
    git -C "$WORK/repo" remote add origin "$REMOTE"
fi

cp "$HERE/README.md" "$HERE/LICENSE" "$WORK/repo/"
mkdir -p "$WORK/repo/.github/workflows"
cp "$HERE/.github/workflows/ci.yml" "$WORK/repo/.github/workflows/ci.yml"

cd "$WORK/repo"
git add README.md LICENSE .github/workflows/ci.yml
if git diff --cached --quiet; then
    echo "seed: main already holds this content"
    exit 0
fi
git commit -q -m "docs: README, LICENSE and the site check (seeded from graphty-monorepo tools/pipeline-health/pages-repo)"
git push -q origin HEAD:main
echo "seed: pushed $(git rev-parse --short HEAD) to $REMOTE main"

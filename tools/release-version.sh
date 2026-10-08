#!/usr/bin/env bash
#
# Versions the checked-out commit the way the release train does, as one local commit, and prints that
# commit's id -- or nothing when no package has a releasable change. release.yml runs it twice: in the pick
# job, to skip an attempt with nothing to release before it pays for the full suite and the T4, and in the
# train job, to make the version commit it opens the release pull request with.
#
# Nothing is pushed, tagged or published: nx.json's tag, push and GitHub-release settings are switched off in
# this checkout first. The packages in release-hold.json are left out (tools/release-hold.mjs); with
# <packages> (comma separated nx project names) every other project is left out too.
#
# Usage: tools/release-version.sh [packages]
# Needs: pnpm install done, git user.name and user.email set, GITHUB_TOKEN for the changelog's author handles.

set -euo pipefail

packages="${1:-}"
if [ -n "${packages// /}" ]; then
    node tools/release-hold.mjs apply --only "$packages" >&2
else
    node tools/release-hold.mjs apply >&2
fi

before=$(git rev-parse HEAD)
tmp=$(mktemp)
jq '.release.git.tag = false | .release.git.push = false
    | .release.changelog.projectChangelogs.createRelease = false' nx.json > "$tmp"
cp "$tmp" nx.json
rm -f "$tmp"
HUSKY=0 pnpm exec nx release --skip-publish --verbose >&2
after=$(git rev-parse HEAD)
[ "$after" = "$before" ] || echo "$after"

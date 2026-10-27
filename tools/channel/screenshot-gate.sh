#!/usr/bin/env bash
# release.yml's screenshot gate on a nightly promotion (design/ci/channels-pipeline/channels.md section 7): a
# candidate reaches nightly only when its visual-baselines/ tree equals nightly's or carries the owner's
# passkey-signed approval of exactly that tree, so a baseline committed without the owner never reaches nightly as
# "unchanged". The verdict job runs it on a green-clean candidate; the resume job on the owner's accept commit of a
# green-images one, with the captures of the run that judged it.
#
#   env HEAD_SHA (the commit whose baselines are gated), CAPTURES (a directory of visual-<project>-<attempt>),
#       GITHUB_OUTPUT; the checkout is master's tip (its visual-review/trusted is the gate run), full history
#   writes outcome (success | failure), first (true before channel/nightly exists) and screenshots ("unchanged", or
#       "approved:<visual-baselines tree>") to GITHUB_OUTPUT
#
# The gate is master's tip's copy, run unchanged; before channel/nightly exists the base is the last version commit,
# which the owner released. A refusal (the gate's exit 1 with its "Review them" line) is a decision: outcome=failure.
# Anything else (a failed fetch, a gate that crashed) fails, so re-running the failed jobs retries the gate instead of
# leaving a judged commit unpromoted for good.
set -euo pipefail
# exit 2: no channel/nightly yet; any other failure stops here
rc=0
git ls-remote --exit-code --heads origin refs/heads/channel/nightly > /dev/null || rc=$?
if [ "$rc" = 0 ]; then
    git fetch --quiet --filter=blob:none origin +refs/heads/channel/nightly:refs/remotes/origin/channel/nightly
    base=origin/channel/nightly
elif [ "$rc" = 2 ]; then
    base=$(git log -1 --no-merges --grep='^chore(release): publish' --format=%H "$HEAD_SHA")
    echo "first=true" >> "$GITHUB_OUTPUT"
else
    echo "::error::git ls-remote of channel/nightly failed (exit $rc)"
    exit "$rc"
fi
gate="$RUNNER_TEMP/gate"
mkdir -p "$gate"
# The gate takes the trusted keys from --base and refuses any passkeys.json change. A key change on master was
# already merged by an administrator, so between two master commits it is accepted: judge against a local commit
# (never pushed) of the base's tree with the candidate's passkeys.json, so only visual-baselines/ is compared and
# approvals are checked with master's keys.
pk=visual-review/passkeys.json
if ! git diff --quiet "$base" "$HEAD_SHA" -- "$pk"; then
    export GIT_INDEX_FILE="$gate/index"
    git read-tree "$base"
    if blob=$(git rev-parse -q --verify "$HEAD_SHA:$pk"); then
        git update-index --add --cacheinfo "100644,$blob,$pk"
    else
        git update-index --force-remove "$pk"
    fi
    tree=$(git write-tree)
    unset GIT_INDEX_FILE
    base=$(GIT_AUTHOR_NAME=release GIT_AUTHOR_EMAIL=release@localhost GIT_COMMITTER_NAME=release \
        GIT_COMMITTER_EMAIL=release@localhost git commit-tree "$tree" -p "$base" -m "nightly with master's passkeys")
fi
git archive HEAD visual-review/trusted | tar -x -C "$gate"
rc=0
node "$gate/visual-review/trusted/cli.mjs" gate --captures "$CAPTURES" --base "$base" --head "$HEAD_SHA" \
    | tee "$gate/out.txt" || rc=$?
if [ "$rc" = 1 ] && grep -q '^Review them with `visual-review serve`' "$gate/out.txt"; then
    echo "outcome=failure" >> "$GITHUB_OUTPUT"
    exit 0
elif [ "$rc" != 0 ]; then
    echo "::error::the screenshot gate failed with an error (exit $rc), not a refusal: re-run the failed jobs"
    exit "$rc"
fi
echo "outcome=success" >> "$GITHUB_OUTPUT"
# channel.json's screenshots: "unchanged", or the owner-approved visual-baselines/ tree it carries
tree=$(git rev-parse "$HEAD_SHA:visual-baselines")
if [ "$(git rev-parse "$base:visual-baselines")" = "$tree" ]; then
    echo "screenshots=unchanged" >> "$GITHUB_OUTPUT"
else
    echo "screenshots=approved:$tree" >> "$GITHUB_OUTPUT"
fi

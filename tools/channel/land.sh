#!/usr/bin/env bash
# release.yml's land job: merges the version commit into master's tip and pushes the merge and the
# {project}@{version} tags in one atomic push (for a nightly, also the site tag and channel/nightly). A push that
# loses a race with a new master commit is merged again on the new tip, never forced; a version commit that does
# not merge cleanly (a commit on master changed a version field or changelog line this release writes) holds the
# release with nothing pushed. tools/channel/rehearse.mjs runs it against a scratch origin.
#
# Env: SHA (the tested candidate), COMMIT (the version commit, empty for a nightly with nothing to version), TAGS
# (comma-separated), DIST_TAG (latest or next), HELD, TESTED, RELEASE_BUNDLE (the kept version commit's bundle,
# default $RUNNER_TEMP/release/release.bundle), GITHUB_OUTPUT (gets pushed=true once master holds the release).
set -euo pipefail
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
refs=()
# A nightly's merge has its own subject, so deploy-pages.yml (which deploys graphty.app from a
# "chore(release): publish ... onto master" merge) never takes a nightly for a production release.
subject="chore(release): publish ${TAGS//,/, } onto master"
[ "$DIST_TAG" != next ] || subject="chore(release): nightly ${TAGS//,/, } onto master"
if [ -n "$COMMIT" ]; then
    git fetch --quiet "${RELEASE_BUNDLE:-$RUNNER_TEMP/release/release.bundle}" release
    [ "$(git rev-parse FETCH_HEAD)" = "$COMMIT" ] || { echo "::error::the kept version commit is not ${COMMIT}"; exit 1; }
fi
# A nightly promotion (npm next) also pushes the site tag, on the tested commit, which the site
# job's prerelease hangs the commit's built site on, and fast-forwards channel/nightly to the
# version commit, or to the tested commit when nothing was versioned
# (design/ci/channels-pipeline/channels.md section 2). Never forced: a candidate whose history
# lacks the current channel/nightly is refused here, by name, before anything is pushed.
if [ "$DIST_TAG" = next ]; then
    target=${COMMIT:-$SHA}
    if git ls-remote --exit-code --heads origin refs/heads/channel/nightly >/dev/null; then
        git fetch --quiet origin +refs/heads/channel/nightly:refs/remotes/origin/channel/nightly
        git merge-base --is-ancestor origin/channel/nightly "$target" || {
            echo "::error::channel/nightly ($(git rev-parse --short origin/channel/nightly)) is not in the history of ${target}: this candidate is older than the current nightly, so nightly cannot move to it. Nothing was pushed or published."
            exit 1
        }
    fi
    tested=${TESTED:-$SHA}
    site="site-${tested}"
    if git ls-remote --exit-code --tags origin "refs/tags/${site}" >/dev/null; then
        git fetch --quiet origin "+refs/tags/${site}:refs/tags/${site}"
        [ "$(git rev-parse "refs/tags/${site}^{commit}")" = "$tested" ] ||
            { echo "::error::tag ${site} exists already on another commit"; exit 1; }
    else
        git tag "$site" "$tested"
    fi
    refs+=("refs/tags/${site}:refs/tags/${site}" "${COMMIT:-$SHA}:refs/heads/channel/nightly")
    # the held candidate promoting ends its hold (design/ci/channels-pipeline.md section 3): its
    # branch goes in the same push; the unhold job clears the store and closes the issue
    if [ "${HELD:-}" = "$tested" ] && git ls-remote --exit-code --heads origin refs/heads/channel/candidate >/dev/null; then
        refs+=(":refs/heads/channel/candidate")
    fi
fi
# Nothing versioned (a nightly only): master does not move, only the site tag and channel/nightly.
if [ -z "$COMMIT" ]; then
    [ "$DIST_TAG" = next ] || { echo "::error::no version commit to land"; exit 1; }
    git push --atomic --no-verify origin "${refs[@]}"
    echo "nightly moves to ${SHA}, with no version commit"
    echo "pushed=true" >> "$GITHUB_OUTPUT"
    exit 0
fi
node tools/release-diff.mjs "$SHA" "$COMMIT"
for tag in ${TAGS//,/ }; do
    refs+=("refs/tags/${tag}:refs/tags/${tag}")
done
for try in 1 2 3 4 5; do
    git fetch --quiet origin +refs/heads/master:refs/remotes/origin/master
    if git merge-base --is-ancestor "$COMMIT" origin/master; then
        echo "master holds ${COMMIT} already"
        echo "pushed=true" >> "$GITHUB_OUTPUT"
        exit 0
    fi
    for tag in ${TAGS//,/ }; do
        if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
            [ "$(git rev-parse "refs/tags/${tag}^{commit}")" = "$COMMIT" ] ||
                { echo "::error::tag ${tag} exists already on another commit: these versions were released before"; exit 1; }
        else
            git tag "$tag" "$COMMIT"
        fi
    done
    git checkout --quiet --detach origin/master
    if ! git merge --no-ff --no-verify -m "$subject" "$COMMIT"; then
        git merge --abort || true
        echo "::error::the version commit ${COMMIT} (versions and changelogs of ${SHA}) does not merge cleanly into master: a commit on master since ${SHA} changed a version field or a CHANGELOG.md line this release also writes. Nothing was pushed or published. Undo that edit on master; the merge of the fix restarts the release."
        exit 1
    fi
    # the merge brings master nothing but versions and changelogs: code reaches master only through
    # master's own pull requests (design/ci/channels-pipeline.md section 3, "Nightly promotion")
    node tools/release-diff.mjs origin/master HEAD || {
        echo "::error::merging ${COMMIT} into master would bring in more than versions and changelogs (above). Nothing was pushed or published."
        exit 1
    }
    if git push --atomic --no-verify origin HEAD:refs/heads/master "${refs[@]}"; then
        echo "master now holds ${COMMIT}, tagged ${TAGS}"
        echo "pushed=true" >> "$GITHUB_OUTPUT"
        exit 0
    fi
    # a nightly ref the push could not fast-forward is no master race: say so, not "master kept moving"
    if [ "$DIST_TAG" = next ] &&
        git fetch --quiet origin +refs/heads/channel/nightly:refs/remotes/origin/channel/nightly 2>/dev/null &&
        ! git merge-base --is-ancestor origin/channel/nightly "$COMMIT"; then
        echo "::error::channel/nightly moved to $(git rev-parse --short origin/channel/nightly) during the push, and ${COMMIT} lacks it: another promotion won. Nothing was pushed or published."
        exit 1
    fi
    echo "try ${try}: master moved during the push; merging again on its new tip"
done
echo "::error::could not land ${COMMIT} on master in five tries: master kept moving or the push was refused"
exit 1

#!/bin/bash
# The beta builds of the graphty.app site: each green master build of this repository is kept as a
# release of graphty-org/graphty-beta, tagged build-<commit>, and served at beta.graphty.app;
# graphty.app serves whichever build was last promoted (design/ci/fast-pipeline.md, section 4.6).
#
# Usage:
#   tools/pages-builds.sh pack <site-dir> <out-dir>
#       Splits a site tools/assemble-pages-site.sh built into <out-dir>/site.tar.gz (everything but
#       /data/) and <out-dir>/data.tar.gz (/data/, the append-only hosted datasets).
#   tools/pages-builds.sh publish <commit> <out-dir> <notes-file>
#       Makes (or refreshes) the release build-<commit> with the two assets, deletes all but the newest
#       30 builds and the promoted one, and asks graphty-beta to deploy the new build. When the promoted
#       build cannot be read, nothing is deleted.
#   tools/pages-builds.sh live
#       Prints the commit of the promoted build, the one graphty.app serves: the repository variable
#       PROMOTED_BUILD of graphty-monorepo, which only promotion writes. Prints nothing when it is unset.
#   tools/pages-builds.sh promoted <tag>
#       Records <tag> as the promoted build in PROMOTED_BUILD. promote-pages.yml runs it after a deploy.
#   tools/pages-builds.sh resolve <build>
#       Prints the release tag of <build>: "newest", "live", a commit (7 or more hex digits) or a tag.
#   tools/pages-builds.sh compose <build> <out-dir>
#       Unpacks <build>'s site into <out-dir> with the union of its datasets and the newest build's:
#       what graphty.app serves after promoting <build>.
#
# GH_TOKEN must be able to write graphty-beta's contents and graphty-monorepo's Actions variables.
# BETA_REPO (default graphty-org/graphty-beta), PAGES_REPO (default graphty-org/graphty-monorepo) and
# KEEP (default 30) can be set; the tests set them.
set -euo pipefail

BETA_REPO="${BETA_REPO:-graphty-org/graphty-beta}"
PAGES_REPO="${PAGES_REPO:-graphty-org/graphty-monorepo}"
KEEP="${KEEP:-30}"

die() {
    echo "::error::$*" >&2
    exit 1
}

# Every build tag, newest first.
tags() {
    gh release list -R "$BETA_REPO" -L 1000 --json tagName,createdAt \
        --jq 'sort_by(.createdAt) | reverse | .[].tagName | select(startswith("build-"))'
}

# Not the build stamp graphty.app shows: its CDN caches the page for 10 minutes, so a refresh just
# after a promotion would read the build before it and put that back.
live() {
    local sha
    sha=$(gh api "repos/$PAGES_REPO/actions/variables/PROMOTED_BUILD" --jq .value 2> /dev/null || true)
    if [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then echo "$sha"; fi
}

resolve() {
    local build="$1" found
    case "$build" in
        newest) found=$(tags | head -1) ;;
        live)
            local sha
            sha=$(live)
            [ -n "$sha" ] || die "no promoted build: PROMOTED_BUILD of $PAGES_REPO is unset or unreadable; promote a beta build first"
            found=$(tags | grep -x "build-$sha" || true)
            [ -n "$found" ] || die "the promoted build, $sha, is not a beta build in $BETA_REPO; promote a beta build first"
            ;;
        build-*) found=$(tags | grep -x "$build" || true) ;;
        *)
            [[ "$build" =~ ^[0-9a-f]{7,40}$ ]] || die "not a build: '$build' (newest, live, a commit or build-<commit>)"
            found=$(tags | grep "^build-$build" || true)
            [ "$(grep -c . <<< "$found")" -le 1 ] || die "'$build' matches more than one build: $(tr '\n' ' ' <<< "$found")"
            ;;
    esac
    [ -n "$found" ] || die "no beta build '$build' in $BETA_REPO (the newest 30 are kept)"
    echo "$found"
}

pack() {
    local site="$1" out="$2"
    mkdir -p "$out"
    tar -C "$site" --exclude=./data -czf "$out/site.tar.gz" .
    if [ -d "$site/data" ]; then
        tar -C "$site" -czf "$out/data.tar.gz" ./data
    else
        tar -czf "$out/data.tar.gz" -T /dev/null
    fi
    ls -l "$out"
}

prune() {
    local sha keep_live
    sha=$(live)
    if [ -z "$sha" ]; then
        echo "::warning::no builds deleted: the promoted build (PROMOTED_BUILD of $PAGES_REPO) is unset or unreadable"
        return 0
    fi
    keep_live="build-$sha"
    tags | tail -n +$((KEEP + 1)) | while read -r tag; do
        if [ "$tag" = "$keep_live" ]; then
            echo "Keeping $tag: it is the promoted build"
        else
            gh release delete "$tag" -R "$BETA_REPO" --cleanup-tag --yes
            echo "Deleted $tag"
        fi
    done
}

publish() {
    local sha="$1" out="$2" notes="$3" tag="build-$1"
    if gh release view "$tag" -R "$BETA_REPO" > /dev/null 2>&1; then
        gh release upload "$tag" -R "$BETA_REPO" --clobber "$out/site.tar.gz" "$out/data.tar.gz"
    else
        gh release create "$tag" -R "$BETA_REPO" --title "${sha:0:12}" --notes-file "$notes" --latest \
            "$out/site.tar.gz" "$out/data.tar.gz"
    fi
    prune
    gh api "repos/$BETA_REPO/dispatches" -f event_type=deploy -f "client_payload[tag]=$tag" > /dev/null
    echo "Published $tag; https://github.com/$BETA_REPO/actions deploys it to beta.graphty.app"
}

compose() {
    local tag newest out="$2" dl
    tag=$(resolve "$1")
    newest=$(resolve newest)
    dl=$(mktemp -d)
    mkdir -p "$out" "$dl/build" "$dl/newest"
    gh release download "$tag" -R "$BETA_REPO" -p '*.tar.gz' -D "$dl/build"
    tar -xzf "$dl/build/site.tar.gz" -C "$out"
    tar -xzf "$dl/build/data.tar.gz" -C "$out"
    # The datasets are append-only and every release names only files that exist by then, so the
    # newest build's are laid over the promoted build's own: an older build never loses a file.
    if [ "$newest" != "$tag" ]; then
        gh release download "$newest" -R "$BETA_REPO" -p data.tar.gz -D "$dl/newest"
        tar -xzf "$dl/newest/data.tar.gz" -C "$out"
    fi
    rm -rf "$dl"
    echo "Composed $tag with the datasets of $newest in $out" >&2
    echo "$tag"
}

promoted() {
    [[ "$1" =~ ^build-[0-9a-f]{40}$ ]] || die "not a build tag: '$1'"
    gh variable set PROMOTED_BUILD -R "$PAGES_REPO" --body "${1#build-}"
    echo "PROMOTED_BUILD is ${1#build-}"
}

cmd="${1:-}"
shift || true
case "$cmd" in
    pack) pack "${1:?site dir}" "${2:?out dir}" ;;
    publish) publish "${1:?commit}" "${2:?out dir}" "${3:?notes file}" ;;
    live) live ;;
    promoted) promoted "${1:?tag}" ;;
    resolve) resolve "${1:?build}" ;;
    compose) compose "${1:?build}" "${2:?out dir}" ;;
    *) sed -n '2,/^set /p' "$0" | sed '$d' >&2; exit 2 ;;
esac

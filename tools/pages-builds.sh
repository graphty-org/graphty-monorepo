#!/bin/bash
# The site's two homes. beta.graphty.app is this repository's own GitHub Pages site: deploy-pages.yml deploys
# every green master build there, keeps the deployed site as its run's "github-pages" artifact for 90 days and
# names the run after the commit ("Deploy <commit> to beta.graphty.app"). graphty.app is the Pages site of
# graphty-org/graphty-site, which serves site/ of its main branch: each promotion and each release's hosted
# datasets is one commit there, so its history is the history of what graphty.app served.
#
# Usage:
#   tools/pages-builds.sh find <build>
#       Prints "<run id> <commit>" of a deployed beta build: "newest", or a commit (7 or more hex digits).
#   tools/pages-builds.sh promote <build> [--dry-run]
#       Commits <build>'s whole site to graphty-site, so graphty.app serves it. The hosted datasets graphty.app
#       already has stay: they are append-only, and a released package may name one an older build lacks.
#   tools/pages-builds.sh data <commit> [--dry-run]
#       Commits only the hosted datasets (/data/) of the beta build of <commit> (or of the newest build, when
#       it contains <commit>) over graphty.app's. Commits nothing when graphty.app has them all, and nothing
#       before the first promotion. release.yml runs it before it publishes the packages that download them.
#
# --dry-run makes the commit in a temporary clone and does not push it.
# GH_TOKEN reads this repository's Actions runs and artifacts; SITE_TOKEN writes graphty-site's contents.
# PAGES_REPO (default graphty-org/graphty-monorepo) and SITE_REMOTE (default graphty-site over HTTPS with
# SITE_TOKEN) can be set; the tests set them.
set -euo pipefail

PAGES_REPO="${PAGES_REPO:-graphty-org/graphty-monorepo}"
SITE_REMOTE="${SITE_REMOTE:-https://x-access-token:${SITE_TOKEN:-}@github.com/graphty-org/graphty-site.git}"

die() {
    echo "::error::$*" >&2
    exit 1
}

find_build() {
    local build="$1" id sha
    [[ "$build" == newest || "$build" =~ ^[0-9a-f]{7,40}$ ]] || die "not a build: '$build' (newest, or a commit)"
    # Newest first; only runs that deployed, and whose artifact is still kept.
    while read -r id _ sha _; do
        [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || continue
        [ "$build" = newest ] || [[ "$sha" == "$build"* ]] || continue
        if gh api "repos/$PAGES_REPO/actions/runs/$id/artifacts" \
            --jq '.artifacts[] | select(.name == "github-pages" and (.expired | not)) | .id' | grep -q .; then
            echo "$id $sha"
            return 0
        fi
    done < <(gh run list -R "$PAGES_REPO" --workflow deploy-pages.yml -L 200 --json databaseId,displayTitle,conclusion \
        --jq '.[] | select(.conclusion == "success") | "\(.databaseId) \(.displayTitle)"')
    die "no deployed beta build '$build' (the builds of the last 90 days can be promoted)"
}

# fetch <run id> <dir>: the site that run deployed
fetch() {
    local dl
    dl=$(mktemp -d)
    gh run download "$1" -R "$PAGES_REPO" -n github-pages -D "$dl"
    mkdir -p "$2"
    tar -xf "$dl/artifact.tar" -C "$2"
    rm -rf "$dl"
}

stamp() { grep -o 'name="graphty-build" content="[^"]*"' "$1/index.html" | sed 's/.*content="//; s/"$//' || echo none; }

# commit <clone> <message> <dry>: one commit of site/, pushed unless dry
commit() {
    git -C "$1" add -A site
    if git -C "$1" diff --cached --quiet; then
        echo "graphty-site has this already; nothing to commit"
        return 0
    fi
    git -C "$1" -c user.name="graphty-pages" -c user.email="graphty-pages@users.noreply.github.com" commit -q -m "$2"
    git -C "$1" show --stat --format='%s' HEAD | tail -1
    if [ "$3" = 1 ]; then
        echo "dry run: not pushed"
    else
        # ponytail: a promotion and a release's data pushed in the same seconds make one push fail; re-run it.
        git -C "$1" push -q origin HEAD
        echo "Pushed to graphty-site; its deploy.yml puts it on graphty.app"
    fi
}

promote() {
    local id sha work
    read -r id sha <<< "$(find_build "$1")"
    work=$(mktemp -d)
    fetch "$id" "$work/build"
    git clone -q --depth 1 "$SITE_REMOTE" "$work/site"
    mkdir -p "$work/site/site"
    find "$work/site/site" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
    cp -a "$work/build/." "$work/site/site/"
    commit "$work/site" "Promote ${sha:0:12} to graphty.app

graphty-monorepo commit $sha, deployed to beta.graphty.app by
https://github.com/$PAGES_REPO/actions/runs/$id
Stamp: $(stamp "$work/build")" "$2"
    rm -rf "$work"
}

data() {
    local want="$1" found id sha status work
    if ! found=$(find_build "$want" 2> /dev/null); then
        found=$(find_build newest)
        status=$(gh api "repos/$PAGES_REPO/compare/$want...${found#* }" --jq .status)
        [ "$status" = ahead ] || [ "$status" = identical ] ||
            die "no deployed beta build holds $want yet: deploy-pages.yml has not deployed it"
    fi
    read -r id sha <<< "$found"
    work=$(mktemp -d)
    git clone -q --depth 1 "$SITE_REMOTE" "$work/site"
    if [ ! -f "$work/site/site/index.html" ]; then
        echo "::notice::nothing is promoted to graphty-site yet, so graphty.app is not served from it; no data pushed"
        rm -rf "$work"
        return 0
    fi
    fetch "$id" "$work/build"
    [ -d "$work/build/data" ] || die "the beta build of ${sha:0:12} has no /data/"
    mkdir -p "$work/site/site/data"
    cp -a "$work/build/data/." "$work/site/site/data/"
    commit "$work/site" "Hosted data of ${sha:0:12} for a release

graphty-monorepo commit $sha, deployed to beta.graphty.app by
https://github.com/$PAGES_REPO/actions/runs/$id" "$2"
    rm -rf "$work"
}

cmd="${1:-}"
shift || true
dry=0
[ "${2:-}" != --dry-run ] || dry=1
case "$cmd" in
    find) find_build "${1:?build}" ;;
    promote) promote "${1:?build}" "$dry" ;;
    data) data "${1:?commit}" "$dry" ;;
    *) sed -n '2,/^set /p' "$0" | sed '$d' >&2; exit 2 ;;
esac

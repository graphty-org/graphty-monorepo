#!/bin/bash
# Fails on a dead link that is ours to fix: a relative link or #anchor in the repository's
# Markdown, MDX and HTML, a link to this repository's own files on GitHub, a link to anything else
# under github.com/graphty-org, and (with --site) a link to graphty.app.
#
# Usage:
#   tools/check-links.sh --offline        relative links, anchors, and github.com/graphty-org/
#                                         graphty-monorepo/(blob|tree)/master/<path> resolved
#                                         against this checkout. No network. About a second.
#   tools/check-links.sh                  the above, plus every other github.com/graphty-org link
#                                         over the network (set GITHUB_TOKEN to avoid rate limits)
#   tools/check-links.sh --site <dir>     the above, plus links to https://graphty.app checked
#                                         against <dir>, the site tools/assemble-pages-site.sh
#                                         builds -- so a link is judged against what the next
#                                         deploy publishes, not against what is live today --
#                                         every link inside that site's HTML (VitePress sidebars
#                                         and nav, which VitePress itself does not check), and
#                                         every Storybook deep link's story id
#   tools/check-links.sh --external <report.md>
#                                         every link in those files, external ones included, over
#                                         the network; writes a Markdown report of the dead ones.
#                                         For the weekly workflow, not for a gate: another site's
#                                         outage is not a reason to fail anyone's pull request
#
# CI runs the --site form (.github/workflows/ci.yml, job "Links"); the pre-push gate runs
# --offline. Every other external link is checked weekly by .github/workflows/links-weekly.yml,
# which files an issue instead of failing anyone's pull request.
#
# Configuration: lychee.toml and .lycheeignore at the repository root.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OFFLINE=0
SITE=""
REPORT=""
while [ $# -gt 0 ]; do
    case "$1" in
        --offline) OFFLINE=1 ;;
        --site) SITE="$(cd "${2:?--site needs a directory}" && pwd)" || exit 2; shift ;;
        --external) REPORT="${2:?--external needs a report path}"; shift ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
    shift
done

# lychee: the one on PATH, else a pinned static release cached under node_modules/.cache
LYCHEE_VERSION=0.24.2
LYCHEE_SHA256=73657a111819a30c47c08352896796f23d64e4eb2b3ed39b6d32149241566fc5
LYCHEE="$(command -v lychee || true)"
if [ -z "$LYCHEE" ]; then
    CACHE="$ROOT_DIR/node_modules/.cache/lychee/$LYCHEE_VERSION"
    LYCHEE="$CACHE/lychee"
    if [ ! -x "$LYCHEE" ]; then
        if [ "$(uname -sm)" != "Linux x86_64" ]; then
            echo "lychee is not installed; see https://lychee.cli.rs/installation/" >&2
            exit 2
        fi
        mkdir -p "$CACHE"
        TARBALL="$CACHE/lychee.tar.gz"
        curl -sSfL -o "$TARBALL" \
            "https://github.com/lycheeverse/lychee/releases/download/lychee-v$LYCHEE_VERSION/lychee-x86_64-unknown-linux-musl.tar.gz" || exit 2
        echo "$LYCHEE_SHA256  $TARBALL" | sha256sum -c --quiet - || { rm -f "$TARBALL"; exit 2; }
        tar -xzf "$TARBALL" -C "$CACHE" --strip-components=1 lychee-x86_64-unknown-linux-musl/lychee || exit 2
        rm -f "$TARBALL"
    fi
fi

# Inputs: every tracked Markdown, MDX and HTML file and package.json (homepage, repository, bugs),
# less those whose links are not links yet --
# CHANGELOGs are release history written by the release tooling (a commit message's "#505050"
# became an issue link), and the gh-pages / Vite HTML templates only resolve once the build has
# copied them into place (the --site pass checks the built copies).
INPUTS="$(mktemp)"
trap 'rm -f "$INPUTS"' EXIT
git ls-files \
    | grep -E '\.(md|mdx|html)$|(^|/)package\.json$' \
    | grep -vE '(^|/)CHANGELOG\.md$' \
    | grep -vE '^algorithms/(gh-pages-src/|benchmark-results/|examples/html-legacy/)' \
    | grep -vE '^[^/]+/index\.html$' \
    > "$INPUTS"

if [ -n "$REPORT" ]; then
    echo "Checking every link in $(wc -l < "$INPUTS") files"
    "$LYCHEE" --format markdown --output "$REPORT" --files-from "$INPUTS"
    exit $?
fi

REPO_REMAP="^https://github\.com/graphty-org/graphty-monorepo/(?:blob|tree)/master/([^?#]*)(?:[?#].*)?$ file://$ROOT_DIR/\$1"
FAILED=0

# 1. Relative links, anchors, this repository's files on GitHub, and (with --site) graphty.app
ARGS=(--offline --remap "$REPO_REMAP")
if [ -n "$SITE" ]; then
    # A URL ending in "/" needs the index.html GitHub Pages would serve; the graph-samples
    # datasets under /data/ are downloaded only by the deploy, so they are not in a CI-built site.
    ARGS+=(--remap "^https://graphty\.app/?((?:[^?#]*/)?)(?:[?#].*)?$ file://$SITE/\${1}index.html"
        --remap "^https://graphty\.app/([^?#]*)(?:[?#].*)?$ file://$SITE/\$1"
        --exclude "^file://$SITE/data/")
else
    ARGS+=(--exclude '^https://graphty\.app')
fi
echo "Checking relative links, anchors and repository links in $(wc -l < "$INPUTS") files"
"$LYCHEE" "${ARGS[@]}" --files-from "$INPUTS" || FAILED=1

# 2. Everything else under github.com/graphty-org (issues, workflows, the other repositories)
if [ $OFFLINE -eq 0 ]; then
    echo "Checking github.com/graphty-org links"
    "$LYCHEE" --include '^https://github\.com/graphty-org/' --exclude '.*' \
        --remap "$REPO_REMAP" --files-from "$INPUTS" || FAILED=1
fi

if [ -n "$SITE" ]; then
    # 3. Links inside the built site. Root-relative links resolve against the site, and a link to
    #    a directory needs its index.html. Storybook's own bundles are not pages anyone links into.
    echo "Checking links inside the built site $SITE"
    find "$SITE" -name '*.html' -not -path '*/storybook/*/sb-*' -not -path '*/assets/*' > "$INPUTS"
    "$LYCHEE" --offline --root-dir "$SITE" --index-files index.html \
        --exclude "^file://$SITE/data/" --files-from "$INPUTS" || FAILED=1

    # 4. Storybook deep links (?path=/story/<id>) name a story that exists
    node tools/check-storybook-links.mjs "$SITE" || FAILED=1
fi

if [ $FAILED -ne 0 ]; then
    echo "Dead links found (see above). Fix the link, or publish what it points to."
    exit 1
fi
echo "No dead links."

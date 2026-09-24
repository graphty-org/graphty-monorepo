#!/usr/bin/env bash
#
# Run Chromatic for one package the way CI runs it.
#
# CI (.github/workflows/ci.yml, the five chromatic-* jobs) builds each Storybook
# once, then runs chromaui/action FROM THE REPOSITORY ROOT against the built
# directory, with TurboSnap off and a non-zero exit when snapshots changed.
# This script reproduces that invocation, and every package script that runs
# Chromatic -- `chromatic`, `test:visual`, `test:visual:debug` -- now goes
# through it, so a local result and a CI result mean the same thing.
#
# Chromatic reads chromatic.config.json from the directory it is RUN IN, and
# both CI and this script run in the repository root, where there is none. That
# used to be a trap: each package carried a config turning TurboSnap on, live
# for anyone who typed `npx chromatic` inside the package and dead everywhere
# else. Those settings are gone -- graphty-element/chromatic.config.json now
# holds the Chromatic project id and nothing that changes behaviour, and the
# app, algorithms and layout configs were deleted -- so no invocation path can
# behave differently from CI. Anything worth changing (TurboSnap, --zip) has to
# be added HERE and in the five CI jobs together, or the two drift again.
#
# Usage:
#   ./tools/chromatic.sh graphty-element
#   CHROMATIC_BUILD_DIR=tmp/sb-nocdn ./tools/chromatic.sh graphty-element --skip-build
#   ./tools/chromatic.sh graphty --skip-build
#   ./tools/chromatic.sh algorithms --exit-zero-on-changes   # extra flags pass through
#
# The project token is read from the root .env under the same name the CI
# secret uses -- CHROMATIC_PROJECT_TOKEN_<KEY>, see .env.example -- or from the
# environment if already exported.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Everything below runs from the repository root, which is where CI runs it, and
# is also what makes `pnpm --filter ./<package>` resolve: a package script that
# calls this script leaves the caller standing inside that package, where the
# filter path would point at a directory that does not exist.
cd "$ROOT"

usage() {
    cat <<'USAGE'
usage: tools/chromatic.sh <package> [--skip-build] [chromatic flags...]

packages:
  graphty-element   token CHROMATIC_PROJECT_TOKEN_ELEMENT
  graphty           token CHROMATIC_PROJECT_TOKEN_APP
  compact-mantine   token CHROMATIC_PROJECT_TOKEN_COMPACT_MANTINE
  algorithms        token CHROMATIC_PROJECT_TOKEN_ALGORITHMS
  layout            token CHROMATIC_PROJECT_TOKEN_LAYOUT
USAGE
}

PKG="${1:-}"
if [ -z "$PKG" ] || [ "$PKG" = "-h" ] || [ "$PKG" = "--help" ]; then
    usage
    exit 1
fi
shift

case "$PKG" in
    graphty-element) KEY=ELEMENT ;;
    graphty) KEY=APP ;;
    compact-mantine) KEY=COMPACT_MANTINE ;;
    algorithms) KEY=ALGORITHMS ;;
    layout) KEY=LAYOUT ;;
    *)
        echo "tools/chromatic.sh: '$PKG' has no Chromatic project" >&2
        usage >&2
        exit 1
        ;;
esac

SKIP_BUILD=0
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--skip-build" ]; then
        SKIP_BUILD=1
    else
        ARGS+=("$arg")
    fi
done

# The token: an already-exported CHROMATIC_PROJECT_TOKEN wins, then the
# package's suffixed name in the environment, then the root .env.
VAR="CHROMATIC_PROJECT_TOKEN_${KEY}"
TOKEN="${CHROMATIC_PROJECT_TOKEN:-}"
if [ -z "$TOKEN" ]; then
    TOKEN="$(printenv "$VAR" || true)"
fi
if [ -z "$TOKEN" ] && [ -f "$ROOT/.env" ]; then
    TOKEN="$(grep -m1 "^${VAR}=" "$ROOT/.env" | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
if [ -z "$TOKEN" ]; then
    cat >&2 <<EOF
tools/chromatic.sh: no project token for ${PKG}.

Add this line to ${ROOT}/.env (it is gitignored):

    ${VAR}=<token>

Get the token from https://www.chromatic.com -> the project -> Manage ->
Configure. It is the same value as the repository secret of the same name.
EOF
    exit 1
fi

BUILD_DIR="${CHROMATIC_BUILD_DIR:-$PKG/storybook-static}"

if [ "$SKIP_BUILD" = "0" ]; then
    echo "==> building $PKG Storybook"
    pnpm --filter "./$PKG" run build-storybook
else
    if [ ! -d "$ROOT/$BUILD_DIR" ]; then
        echo "tools/chromatic.sh: --skip-build given but $BUILD_DIR does not exist" >&2
        exit 1
    fi
    echo "==> reusing existing $BUILD_DIR"
fi

echo "==> running Chromatic for $PKG (TurboSnap off, non-zero exit on changes)"
# The token goes in the ENVIRONMENT, never in argv. /proc/<pid>/cmdline is world-readable on
# this machine, so `--project-token <secret>` puts the token in every process listing taken
# while the run lasts -- which is exactly how it leaked once already.
export CHROMATIC_PROJECT_TOKEN="$TOKEN"
exec npx chromatic \
    --storybook-build-dir "$BUILD_DIR" \
    "${ARGS[@]}"

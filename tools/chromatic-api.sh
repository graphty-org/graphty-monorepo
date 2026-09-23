#!/usr/bin/env bash
#
# Read-only queries against the Chromatic API for one package.
#
# The chromatic CLI reports a build's totals ("22 component errors") and nothing
# about WHICH stories they were. That detail lives behind the API, and reaching it
# takes the same two steps the CLI itself takes: exchange the project token for a
# short-lived app token via the createAppToken mutation, then send queries with
# that token as a bearer credential. This script is that, and nothing else --
# every subcommand is a read.
#
# The token is read from the root .env and is never printed. Do not add a
# subcommand that echoes it, and do not pass it on a command line: the process
# list is world-readable on this machine.
#
# Usage:
#   ./tools/chromatic-api.sh build <number> [package]   one build's status and totals
#   ./tools/chromatic-api.sh tests <number> [package]   every story, its status and result
#   ./tools/chromatic-api.sh raw   <file>   [package]   send a GraphQL document from a file
#
# package defaults to graphty-element. See .env.example for the token names.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_URL="${CHROMATIC_INDEX_URL:-https://index.chromatic.com}"

die() { echo "tools/chromatic-api.sh: $*" >&2; exit 1; }

CMD="${1:-}"
ARG="${2:-}"
PKG="${3:-graphty-element}"
[ -n "$CMD" ] || die "usage: chromatic-api.sh build|tests|raw <arg> [package]"

case "$PKG" in
    graphty-element) KEY=ELEMENT ;;
    graphty) KEY=APP ;;
    compact-mantine) KEY=COMPACT_MANTINE ;;
    algorithms) KEY=ALGORITHMS ;;
    layout) KEY=LAYOUT ;;
    *) die "'$PKG' has no Chromatic project" ;;
esac

VAR="CHROMATIC_PROJECT_TOKEN_${KEY}"
TOKEN="$(printenv "$VAR" || true)"
if [ -z "$TOKEN" ] && [ -f "$ROOT/.env" ]; then
    TOKEN="$(grep -m1 "^${VAR}=" "$ROOT/.env" | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
fi
[ -n "$TOKEN" ] || die "no project token: set ${VAR} in ${ROOT}/.env (see .env.example)"

# Step one: the project token buys a short-lived app token. This is the CLI's own
# CreateAppTokenMutation; the project token travels in the variables, not a header.
APP_TOKEN="$(
    jq -n --arg t "$TOKEN" '{
        query: "mutation CreateAppTokenMutation($projectToken: String!) { appToken: createAppToken(code: $projectToken) }",
        variables: { projectToken: $t }
    }' \
    | curl -s --max-time 30 -H "Content-Type: application/json" -d @- "${INDEX_URL}/graphql" \
    | jq -r '.data.appToken // empty'
)"
[ -n "$APP_TOKEN" ] || die "token exchange failed -- the project token may be wrong or revoked"

send() {  # $1 = graphql document, $2 = variables json
    jq -n --arg q "$1" --argjson v "$2" '{query: $q, variables: $v}' \
    | curl -s --max-time 60 \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${APP_TOKEN}" \
        -d @- "${INDEX_URL}/graphql"
}

case "$CMD" in
    build)
        [ -n "$ARG" ] || die "build needs a build number"
        send 'query B($n: Int!) { app { build(number: $n) {
                number status(legacy: false) webUrl storybookUrl
                createdAt completedAt
                testCount changeCount specCount componentCount
              } } }' "{\"n\": ${ARG}}"
        ;;
    tests)
        [ -n "$ARG" ] || die "tests needs a build number"
        send 'query T($n: Int!, $skip: Int, $limit: Int) { app { build(number: $n) {
                number status(legacy: false) webUrl
                tests(skip: $skip, limit: $limit) {
                  status result
                  spec { name component { name displayName } }
                  parameters { viewport viewportIsDefault }
                  mode { name }
                } } } }' "{\"n\": ${ARG}, \"skip\": 0, \"limit\": 1000}"
        ;;
    raw)
        [ -f "$ARG" ] || die "raw needs a file holding a GraphQL document"
        send "$(cat "$ARG")" '{}'
        ;;
    *) die "unknown subcommand '$CMD'" ;;
esac

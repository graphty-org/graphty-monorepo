#!/usr/bin/env bash
# The open "Release held: ..." issues that stop scheduled release trains (release.yml,
# design/ci/ci-cd-plan.md section 11). Needs GH_TOKEN and GITHUB_REPOSITORY.
#
# There are two kinds of hold, each with its own issue, and they never touch each other:
#   - a train hold, "Release held: <what> failed on <sha>": a release train failed. A later train that fails
#     retitles and comments on it; a train that passes closes it.
#   - a publish hold, "Release held: publish failed on <sha>": the publish of a merged release pull request
#     failed. Only re-running that publish run clears it, so trains never retitle or close it; a passing
#     re-run closes it.
#
#   tools/release-held.sh find [prefix]                    any hold's number (title starts with prefix), or nothing
#   tools/release-held.sh find --train                     the train hold's number, or nothing
#   tools/release-held.sh open <title> <body file>         retitle and comment on the train hold, or open it
#   tools/release-held.sh open <title> <body file> <prefix>  comment on the hold whose title starts with prefix
#                                                          (no retitle), or open it; both print its number
#   tools/release-held.sh close <comment> [prefix]         close the train hold, or the hold whose title starts
#                                                          with prefix
set -euo pipefail

PUBLISH="Release held: publish failed"

# $1: the title prefix (empty: any hold); $2: "train" drops publish holds
find_held() {
    gh issue list -R "$GITHUB_REPOSITORY" --state open --search 'in:title "Release held:"' --limit 50 \
        --json number,title --jq "[.[] | select(.title | startswith(\"${1:-Release held: }\"))
            | select(\"${2:-}\" != \"train\" or (.title | startswith(\"${PUBLISH}\") | not))][0].number // empty"
}

case "${1:-}" in
    find)
        if [ "${2:-}" = --train ]; then find_held "" train; else find_held "${2:-}"; fi
        ;;
    open)
        if [ -n "${4:-}" ]; then open=$(find_held "$4"); else open=$(find_held "" train); fi
        if [ -n "$open" ]; then
            [ -n "${4:-}" ] || gh issue edit "$open" -R "$GITHUB_REPOSITORY" --title "$2" >/dev/null
            gh issue comment "$open" -R "$GITHUB_REPOSITORY" --body-file "$3" >/dev/null
            echo "$open"
        else
            gh issue create -R "$GITHUB_REPOSITORY" --title "$2" \
                --label bug --label priority:high --label effort:medium --body-file "$3"
        fi
        ;;
    close)
        if [ -n "${3:-}" ]; then open=$(find_held "$3"); else open=$(find_held "" train); fi
        [ -z "$open" ] || gh issue close "$open" -R "$GITHUB_REPOSITORY" --comment "$2"
        ;;
    *)
        echo "usage: $0 find [prefix | --train] | open <title> <body file> [prefix] | close <comment> [prefix]" >&2
        exit 2
        ;;
esac

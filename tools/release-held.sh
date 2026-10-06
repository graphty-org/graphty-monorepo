#!/usr/bin/env bash
# The one open "Release held: ..." issue that stops scheduled release trains (release.yml,
# design/ci/ci-cd-plan.md section 11). Needs GH_TOKEN and GITHUB_REPOSITORY.
#
#   tools/release-held.sh find [prefix]             its number (title starts with prefix), or nothing
#   tools/release-held.sh open <title> <body file>  retitle and comment on it, or open it; prints its number
#   tools/release-held.sh close <comment> [prefix]  close it, when its title starts with prefix
set -euo pipefail

find_held() {
    gh issue list -R "$GITHUB_REPOSITORY" --state open --search 'in:title "Release held:"' --limit 50 \
        --json number,title --jq "[.[] | select(.title | startswith(\"${1:-Release held: }\"))][0].number // empty"
}

case "${1:-}" in
    find) find_held "${2:-}" ;;
    open)
        open=$(find_held)
        if [ -n "$open" ]; then
            gh issue edit "$open" -R "$GITHUB_REPOSITORY" --title "$2" >/dev/null
            gh issue comment "$open" -R "$GITHUB_REPOSITORY" --body-file "$3" >/dev/null
            echo "$open"
        else
            gh issue create -R "$GITHUB_REPOSITORY" --title "$2" \
                --label bug --label priority:high --label effort:medium --body-file "$3"
        fi
        ;;
    close)
        open=$(find_held "${3:-}")
        [ -z "$open" ] || gh issue close "$open" -R "$GITHUB_REPOSITORY" --comment "$2"
        ;;
    *)
        echo "usage: $0 find [prefix] | open <title> <body file> | close <comment> [prefix]" >&2
        exit 2
        ;;
esac

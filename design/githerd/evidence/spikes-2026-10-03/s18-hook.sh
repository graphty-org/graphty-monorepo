#!/bin/bash
# Spike S18: record what a hook process sees in its environment (names only, never values).
in=$(cat)
ev=$(jq -r .hook_event_name <<<"$in")
echo "$ev label=$S18_LABEL pushover=$(env | grep -c '^PUSHOVER') claude_vars=$(env | grep -o '^CLAUDE[A-Z_]*' | sort | tr '\n' ',')" >> "$(dirname "$0")/hook-env.log"
exit 0

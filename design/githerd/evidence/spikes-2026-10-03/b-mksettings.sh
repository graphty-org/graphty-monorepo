#!/bin/bash
d=$1; shift; mkdir -p "$d"
jq -n --arg c "/home/apowers/Projects/graphty-monorepo/.worktrees/githerd/tmp/githerd/spikes-b/hook.sh $d" '$ARGS.positional | map({key: ., value: [{hooks: [{type: "command", command: $c}]}]}) | from_entries | {hooks: .}' --args "$@" > "$d/settings.json"

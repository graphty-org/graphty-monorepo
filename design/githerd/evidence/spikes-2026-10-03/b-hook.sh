#!/bin/bash
# Generic spike hook: append the event input to <dir>/hooks.log; if <dir>/reply-<event>[-<source>]
# exists, print it (hook output). Usage: hook.sh <dir>
d=$1; in=$(cat); ev=$(jq -r .hook_event_name <<<"$in"); src=$(jq -r '.source // empty' <<<"$in")
echo "$(date +%s.%N | cut -c1-14) $in" >> "$d/hooks.log"
for f in "$d/reply-$ev-$src" "$d/reply-$ev"; do [ -n "$f" ] && [ -f "$f" ] && { cat "$f"; exit 0; }; done
exit 0

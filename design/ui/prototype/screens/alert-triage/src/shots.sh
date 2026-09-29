#!/usr/bin/env bash
# Renders every state of screens/alert-triage.html to shots/alert-triage/<state>[--dark].png.
# Run from anywhere: bash screens/alert-triage/src/shots.sh [state ...]
cd "$(dirname "$0")/../../.." || exit 1
mkdir -p shots/alert-triage
ids=("$@")
[ ${#ids[@]} -eq 0 ] && ids=($(grep -o '<section class="st[^"]*" id="[^"]*"' screens/alert-triage.html | sed 's/.*id="//;s/"//'))
for id in "${ids[@]}"; do
  if [[ $id == *-z ]]; then size=(--width 1536 --height 740); else size=(); fi
  node kit/shoot.mjs "${size[@]}" --out "alert-triage/$id.png" "screens/alert-triage.html#$id" >/dev/null || echo "FAILED $id"
  node kit/shoot.mjs --dark "${size[@]}" --out "alert-triage/$id--dark.png" "screens/alert-triage.html#$id" >/dev/null || echo "FAILED dark $id"
done
echo "shot ${#ids[@]} states"

#!/usr/bin/env bash
# How many pictures a pull request's own Stories run changed (#5465). Capture impact (tools/capture-impact.sh)
# flags a change to the capture environment; this counts what the story tests themselves found, so a broad,
# intended change to how stories are drawn (#5346 reframed about 1,000 pictures) is called out in its own pull
# request rather than first seen on the nightly candidate. It only reads the captures; it judges nothing.
#
#   tools/many-pictures.sh <captures-dir> <summary.md>
#       <captures-dir> holds the downloaded visual-<project>-<attempt>/ artifacts (results.json each; a
#       not-affected marker has none and is skipped). The highest attempt of each project counts. Writes a
#       per-project table to <summary.md> and prints "changed=<n>": the items whose status is changed.
set -euo pipefail

dir=${1:?usage: many-pictures.sh <captures-dir> <summary.md>}
out=${2:?summary file}

# one line per project: its newest attempt's results.json
# (download-artifact puts a single matching artifact straight into the path, with no folder of its own: #4015)
latest=$([[ ! -f "$dir/results.json" ]] || echo "$dir/results.json"
    find "$dir" -mindepth 2 -maxdepth 2 -path '*/visual-*-*/results.json' | sed -E 's#^(.*/visual-(.+)-([0-9]+))/results.json$#\2 \3 \1/results.json#' |
    sort -k1,1 -k2,2nr | awk '!seen[$1]++ { print $3 }')

changed=0
rows=()
for f in $latest; do
    read -r project n new removed of < <(jq -r '[.project, ([.items[] | select(.status == "changed")] | length),
        ([.items[] | select(.status == "new")] | length), ([.items[] | select(.status == "removed")] | length),
        (.items | length)] | @tsv' "$f")
    changed=$((changed + n))
    rows+=("| $project | $n | $new | $removed | $of |")
done

{
    echo "### Changed pictures"
    echo ""
    echo "This pull request's story tests changed $changed pictures against their approved baselines."
    echo ""
    echo "| project | changed | new | removed | pictures |"
    echo "|---|---|---|---|---|"
    ((${#rows[@]} == 0)) || printf '%s\n' "${rows[@]}"
} >"$out"
echo "changed=$changed"

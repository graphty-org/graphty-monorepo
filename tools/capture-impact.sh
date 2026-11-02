#!/usr/bin/env bash
# What a change to the capture environment does to the pictures (#5304). The Stories jobs run the base
# branch's capture code on a pull request, so a pull request that changes how every picture is drawn never
# shows its own effect there: #4603 moved about 1,700 screenshots by one device pixel and passed with none.
#
#   tools/capture-impact.sh changed <base> <head>
#       prints "true" when the diff changes the capture environment: visual-review/capture/, the capture's
#       settings (visual-review.config.json), the pinned fonts (visual-fonts/), a Playwright or Chromium
#       version (visual-review/package.json, pnpm-lock.yaml) or a Storybook preview (<package>/.storybook/preview*)
#   tools/capture-impact.sh measure <base> <head> <out-dir>
#       captures a fixed sample of every Storybook project's stories (SAMPLE per project, evenly spread over
#       the sorted story ids) twice, from the same built Storybooks under STORYBOOK_ROOT (default: the
#       repository): once with <base>'s capture code, settings, fonts and Playwright, once with <head>'s. Each
#       side is a sparse worktree of its commit with its own Playwright install. Writes <out-dir>/summary.md
#       and prints "changed=<n>" and "pictures=<n>": the pictures that differ (visual-review parity, exact
#       pixels) and the pictures compared.
#
# Only the built-Storybook capture (capture.mjs) is measured; a change only to the story tests' capture
# (story-test.mjs) is not seen here.
set -euo pipefail

mode=${1:?usage: capture-impact.sh changed|measure <base> <head> [out-dir]}
base=${2:?base ref}
head=${3:?head ref}
root=$(git rev-parse --show-toplevel)

if [[ "$mode" == changed ]]; then
    # --no-renames: a file moved out of a watched folder counts by its old path too
    files=$(git diff --name-only --no-renames "$base" "$head")
    if grep -qE '^(visual-review/capture/|visual-fonts/|visual-review\.config\.json$|(.+/)?\.storybook/preview)' <<<"$files" ||
        # a here-string, not a pipe: grep -q stops early, and pipefail would read git diff's SIGPIPE as no match
        grep -qE '^[-+][^-+].*(playwright|chromium)' <<<"$(git diff "$base" "$head" -- visual-review/package.json pnpm-lock.yaml)"; then
        echo true
    else
        echo false
    fi
    exit 0
fi

[[ "$mode" == measure ]] || { echo "unknown mode $mode" >&2; exit 2; }
# CI tees stdout into GITHUB_OUTPUT, which takes only key=value lines (#5636: `playwright install --with-deps`
# printed "Installing dependencies..." there). Keep stdout on fd 3 for the results; everything else goes to stderr.
exec 3>&1 1>&2
out=$(realpath -m "${4:?out dir}")
storybooks=$(realpath "${STORYBOOK_ROOT:-$root}")
sample=${SAMPLE:-6}
rm -rf "$out"
mkdir -p "$out/empty-baselines"
trees=()
cleanup() { for t in "${trees[@]}"; do git -C "$root" worktree remove --force "$t" 2>/dev/null || true; done; }
trap cleanup EXIT

# One side: a sparse worktree of the commit (visual-review/, visual-fonts/ and the root files, the config
# among them) with the pinned fonts and that side's Playwright and pngjs installed next to it.
prepare() {
    local side=$1 ref=$2 dir="$out/$1"
    mkdir -p "$dir"
    git -C "$root" worktree add --quiet --detach --no-checkout "$dir/repo" "$ref"
    trees+=("$dir/repo")
    git -C "$dir/repo" sparse-checkout set --cone visual-review visual-fonts
    GIT_LFS_SKIP_SMUDGE=1 git -C "$dir/repo" checkout --quiet
    git -C "$dir/repo" lfs pull --include "visual-fonts/**"
    local pkg="$dir/repo/visual-review/package.json"
    npm install --prefix "$dir" --no-audit --no-fund --silent \
        "playwright@$(jq -r .devDependencies.playwright "$pkg")" "pngjs@$(jq -r .dependencies.pngjs "$pkg")"
    # CI installs the system packages too; a workstation has them. No browser GC: the side's install is removed
    # at the end, and other checkouts' browsers are not this script's to delete.
    PLAYWRIGHT_SKIP_BROWSER_GC=1 node "$dir/node_modules/playwright/cli.js" install $([[ "${CI:-}" == true ]] && echo --with-deps) chromium
    echo "$side: $(git -C "$dir/repo" rev-parse --short HEAD), playwright $(jq -r .devDependencies.playwright "$pkg")" >&2
}
prepare base "$base"
prepare head "$head"

changed=0
pictures=0
examples=()
rows=()
while read -r project storybook; do
    index="$storybooks/$storybook/index.json"
    if [[ ! -f "$index" ]]; then
        rows+=("| $project | not built | | |")
        continue
    fi
    ids=$(jq -r --argjson n "$sample" '[.entries[] | select(.type == "story") | .id] | sort
        | . as $all | [range(0; $n) | ($all | length) * . / $n | floor] | unique | map($all[.]) | join(",")' "$index")
    for side in base head; do
        (cd "$out/$side/repo" && node visual-review/trusted/cli.mjs capture --project "$project" \
            --storybook "$storybooks/$storybook" --baselines "$out/empty-baselines" \
            --out "$out/$side/$project" --stories "$ids") >"$out/$side/$project.log" 2>&1 ||
            { echo "::error::$side capture of $project failed: see $out/$side/$project.log" >&2; tail -20 "$out/$side/$project.log" >&2; exit 1; }
    done
    # parity exits 1 when the captures differ; that is the finding, not a failure
    parity=$(cd "$out/base/repo" && node visual-review/trusted/cli.mjs parity --project "$project" \
        "$out/base/$project" "$out/head/$project" || true)
    # a story that failed alike on both sides (no picture either way) is not a changed picture
    lines=$(jq -c 'select(.summary or (.first.capture == null and .second.capture == null and .first.status == .second.status) | not)' <<<"$parity")
    n=$(jq -s 'length' <<<"$lines")
    of=$(jq -s '[.[] | select(.summary) | .summary.compared] | add // 0' <<<"$parity")
    changed=$((changed + n))
    pictures=$((pictures + of))
    rows+=("| $project | $of | $n | $(tr ',' ' ' <<<"$ids" | wc -w) |")
    while read -r f; do examples+=("$project/$f"); done < <(jq -r 'select(.file) | .file' <<<"$lines" | head -3)
done < <(jq -r '.projects | to_entries[] | "\(.key) \(.value.storybook)"' "$out/head/repo/visual-review.config.json")

{
    echo "### Capture impact"
    echo ""
    echo "$changed of $pictures sampled pictures change between the base's capture environment and this pull request's."
    echo ""
    echo "| project | pictures | changed | stories sampled |"
    echo "|---|---|---|---|"
    printf '%s\n' "${rows[@]}"
    if ((${#examples[@]} > 0)); then
        echo ""
        echo "Examples:"
        printf -- '- `%s`\n' "${examples[@]:0:8}"
    fi
} >"$out/summary.md"
echo "changed=$changed" >&3
echo "pictures=$pictures" >&3

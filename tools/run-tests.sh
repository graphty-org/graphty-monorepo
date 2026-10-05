#!/usr/bin/env bash
#
# Run a CI test shard locally, with the exact command CI runs for it.
#
# The shard list and each shard's command live in tools/ci-test-matrix.mjs, which ci.yml also
# reads, so this script and CI cannot drift. Almost every shard runs with --coverage, and each
# package's vitest config applies the 80/75 thresholds, so a passing shard here has also passed
# the coverage check CI applies.
#
# Usage:
#   ./tools/run-tests.sh [--list]   print the shard names
#   ./tools/run-tests.sh <shard>    run one shard
#   ./tools/run-tests.sh all        run every shard in turn, then list the ones that failed
#
# Build first, as CI does: pnpm exec nx run-many -t build
#
# The environment CI sets up per shard is reproduced here: CI=true for every shard (several
# tests and configs are stricter under it, and it adds the junit reporter), FC_FONTATIONS=1 for browser shards
# (headless Chromium can crash at startup without it), and for the lavapipe shard the Mesa
# lavapipe Vulkan ICD with GRAPHTY_GPU_ADAPTER=llvmpipe and GRAPHTY_GPU_REQUIRE=any. Install
# mesa-vulkan-drivers for that one, or set VK_DRIVER_FILES yourself.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

# One line per shard: name, needs-browser, needs-lavapipe, command (tab separated).
# The path goes in the environment, not argv: ci-test-matrix.mjs runs its CLI when argv[1] is itself.
SHARDS="$(MATRIX="$ROOT/tools/ci-test-matrix.mjs" node --input-type=module -e '
    const { SHARDS } = await import(process.env.MATRIX);
    for (const s of SHARDS) {
        console.log([s.shard, s["needs-browser"] ? 1 : 0, s["needs-lavapipe"] ? 1 : 0, s["test-command"]].join("\t"));
    }
')" || exit 1

run_shard() {
    local name="$1" line browser lavapipe cmd icd
    line="$(awk -F'\t' -v n="$name" '$1 == n' <<<"$SHARDS")"
    if [ -z "$line" ]; then
        echo "tools/run-tests.sh: no shard named '$name' (--list shows them)" >&2
        return 2
    fi
    IFS=$'\t' read -r _ browser lavapipe cmd <<<"$line"
    (
        export CI=true
        [ "$browser" = 1 ] && export FC_FONTATIONS=1
        if [ "$lavapipe" = 1 ]; then
            if [ -z "${VK_DRIVER_FILES:-}" ]; then
                # the same search CI does (ci.yml, "Locate the lavapipe ICD")
                icd="$(find /usr/share/vulkan/icd.d /etc/vulkan/icd.d /usr/lib/x86_64-linux-gnu/vulkan/icd.d \
                    -name 'lvp_icd*.json' 2>/dev/null | sort | head -1)"
                if [ -z "$icd" ]; then
                    echo "tools/run-tests.sh: no lavapipe ICD found; install mesa-vulkan-drivers or set VK_DRIVER_FILES" >&2
                    exit 1
                fi
                export VK_DRIVER_FILES="$icd"
            fi
            export GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp}"
        fi
        echo "==> $name: $cmd"
        sh -c "$cmd"
    )
}

case "${1:---list}" in
    --list | -l)
        cut -f1 <<<"$SHARDS"
        ;;
    all)
        failed=()
        while IFS= read -r name; do
            run_shard "$name" </dev/null || failed+=("$name")
        done < <(cut -f1 <<<"$SHARDS")
        if [ "${#failed[@]}" -gt 0 ]; then
            echo "FAILED shards: ${failed[*]}" >&2
            exit 1
        fi
        echo "all shards passed"
        ;;
    -h | --help)
        sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
        ;;
    *)
        run_shard "$1"
        ;;
esac

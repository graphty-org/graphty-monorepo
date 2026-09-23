#!/usr/bin/env bash
# One question of the Windows scan investigation, asked on the device.
#
# Runs the scan tests and the two device probes -- test/primitives/scan.test.ts, scan-two-blocks.test.ts,
# scan-uniform-probe.test.ts and workgroup-id-probe.test.ts, the four files whose names begin with those two
# prefixes -- under a set of Dawn toggles, and prints the answer under one marker, [warp-q], so a single grep over
# the job log tells the whole story.
#
#     scripts/warp-question.sh <label> [comma-separated-dawn-toggles] [kernel-name]
#
# A third argument asks for the BACKEND code Dawn generated for that kernel -- the HLSL on D3D12, the SPIR-V on
# Vulkan, the MSL on Metal -- printed after the summary. It only produces anything when the toggles include
# dump_shaders, and disable_symbol_renaming is what keeps the identifiers readable. The WGSL Dawn dumps beside it
# is left in the log file: the WGSL is already in this repository, the generated code is what we cannot see.
#
# The toggles travel through GRAPHTY_DAWN_FEATURES, the variable test/setup/gpu.ts and test/setup/global.ts
# already read: each splits it on commas and hands the list to createNodeGpu, which emits
# `enable-dawn-features=a,b` into dawn.create(). That is the Dawn INSTANCE, built before any adapter is
# requested, so a toggle whose effect is decided at adapter time -- use_dxc, which is also what Dawn gates the
# `subgroups` and `shader-f16` features on -- is in place early enough, and no new mechanism is needed.
#
# Everything the run wrote goes to tmp/narrow/<label>.log, which the lane uploads as an artifact; what this
# prints is the summary. It exits with the run's own exit code.

set -u

label=$1
toggles=${2-}
kernel=${3-}
marker="[warp-q]"
log="tmp/narrow/$label.log"

mkdir -p tmp/narrow
GRAPHTY_DAWN_FEATURES="$toggles" node scripts/run-node-shard.js --project=node \
    test/primitives/scan test/primitives/workgroup-id-probe >"$log" 2>&1
code=$?

say() { echo "$marker $label $*"; }
# The first line of the log that contains a fixed string, without its leading whitespace; "(none)" when absent.
first() {
    local hit
    hit=$(grep -m1 -F -- "$1" "$log" | sed 's/^[[:space:]]*//')
    echo "${hit:-(none)}"
}

say "toggles=${toggles:-none} exit=$code"
say "adapter: $(first '[gpu] adapter vendor=')"
# The decisive numbers: one block against two, the smallest shape the failure has.
say "scan2: $(first '[scan-2block]')"
# Anchored, so the "Failed Tests" banner vitest prints above the failures is not mistaken for the count line.
summary() {
    local hit
    hit=$(grep -m1 -E "^[[:space:]]*$1[[:space:]]+[0-9]" "$log" | sed 's/^[[:space:]]*//')
    echo "${hit:-(none)}"
}
say "files: $(summary 'Test Files')"
say "tests: $(summary 'Tests')"
# Dawn's own log lines -- the channel it warns on when it overrides a toggle that was asked for. Only the
# `Warning:` / `Error:` prefixes, so the text of a dumped shader (which quotes dxcompiler.dll in a comment of its
# own) cannot be mistaken for something the driver said. The three known-noisy lines of the Linux lane are dropped.
notes=$(grep -nE '^[[:space:]]*[WwEe](arning|rror): ' "$log" |
    grep -vE 'maxDynamic(Uniform|Storage)BuffersPerPipelineLayout|loader_scanned_icd|XDG_RUNTIME_DIR' |
    sort -u -t: -k2 | head -5)
if [ -z "$notes" ]; then
    say "dawn: (no line about a toggle)"
else
    echo "$notes" | sed "s/^/$marker $label dawn: /"
fi
# Every probe case, one line each, exactly as the probe printed it.
grep -E '\[wgid-probe\]|\[scan-uniform-probe\]' "$log" | sed "s/^[[:space:]]*/$marker $label /"

# The generated code, when one was asked for. Dawn dumps each module twice -- the WGSL it received, then what it
# generated for the backend -- and dumps it again for every set of pipeline overrides and every fresh context, so
# the blocks are deduplicated by their own text and the WGSL half is left in the log.
if [ -n "$kernel" ]; then
    awk -v want="$kernel" -v marker="$marker" -v label="$label" '
        function finish() {
            if (n && buf ~ want && buf !~ /Dumped WGSL/ && !(buf in seen)) { seen[buf] = 1; printf "%s", buf; printed++ }
        }
        /Dumped/ { finish(); buf = ""; n = 1; total++ }
        n { buf = buf $0 "\n" }
        END { finish(); printf "%s %s generated code: %d dump(s) in the log, %d distinct one(s) naming %s\n", marker, label, total, printed, want }
    ' "$log"
fi

exit $code

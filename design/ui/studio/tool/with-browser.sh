#!/usr/bin/env bash
# Runs a command that launches a headless browser only when one of the machine's shared browser
# slots is free, so this machine never runs more gated browsers at once than it has slots.
# On 2026-10-01 a design round ran 23 browsers at once (49 GB), filled swap and set off an alert.
#
# This is the studio's door to the machine's one browser gate, tools/with-browser.sh: every wait goes
# through that script, so the studio keeps the same slots (the main checkout's tmp/browser-slots), the
# same first-come queue and the same low and high priority lanes as the pre-push gate's browser shards
# and the screenshot previews. This wrapper adds only the studio's slot count, its try mode and its
# pass-through of commands that launch no browser themselves (tool/README.md, "Browsers").
#
# Usage: with-browser.sh <command> [args...].
#
# How many: BROWSER_SLOTS, 1 to 16. A command that draws on the GPU (BROWSER_GPU=1, which real.mjs
# sets for its sessions) defaults to 8: a GPU-drawn graphty page idles at 27-51% CPU, a software-drawn
# one (SwiftShader) at 550-690%, so eight GPU browsers cost the machine less than one software one.
# Every other command defaults to 4. Slots 1 to 4 are the ones the pre-push gate's shards share;
# slots 5 and up are the studio's alone.
#
# BROWSER_SLOT_TRY=1 takes a free slot at once or gives up (exit 75), never waits, and never takes a
# slot while anyone waits for one or one of the four shared slots: the warm pool (real.mjs --warm)
# fills only spare slots above 4, so a waiting start or a test shard never waits behind it.
# BROWSER_SLOT_ALSO=<pool folder>: a planted pool (BROWSER_SLOT_DIR) whose commands start real browsers
# takes a slot of that pool too, after its own, so a self-test's planted pool never runs a browser
# beside the machine's slots: real.mjs --prove's warm-pool and bounded-start checks each started GPU
# browsers in a pool of their own, and next to 8 sessions the machine ran 9 (tier 5's tool dry run).
set -u
if [[ "${BROWSER_GPU:-}" == 1 ]]; then SLOTS=${BROWSER_SLOTS:-8}; else SLOTS=${BROWSER_SLOTS:-4}; fi
if ! [[ "$SLOTS" =~ ^([1-9]|1[0-6])$ ]]; then
    echo "with-browser.sh: BROWSER_SLOTS must be 1 to 16, not \"$SLOTS\"" >&2
    exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
# real.mjs --step, --end and --brief launch no browser: a step talks to a session that already holds
# its slot. Wrapped, it waited for a second slot while its own session held one (r1-s04, void).
# real.mjs --start takes its own slot (it runs its session process through this gate), so wrapped
# it held one slot with no browser while that process waited for a second. real.mjs --prove runs
# the gate itself for every browser it starts, so wrapped it waited forever when the other three
# slots were busy.
# real.mjs --replay and --rewalk start their sessions through the gate as --start does.
if [[ "$*" =~ real\.mjs\ --(start|step|end|brief|prove|replay|rewalk)( |$) ]]; then
    exec "$@"
fi
# bars.mjs launches no browser itself: its tier 2 and tier 3 walks are real.mjs sessions, each
# taking its own slot, and its tier 1 screens run as "bars.mjs ... --inner", which it wraps in this
# gate itself. Wrapped, it held one slot with no browser for its whole run (round 1's tool dry run 2).
if [[ "$*" =~ bars\.mjs( |$) && ! "$*" =~ (^| )--inner( |$) ]]; then
    exec "$@"
fi
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
gate="$(cd "$here/../../../.." && pwd)/tools/with-browser.sh"
# BROWSER_SLOT_DIR: another pool, for the self-test that fills every slot
DIR="${BROWSER_SLOT_DIR:-$main/tmp/browser-slots}"
mkdir -p "$DIR/queue"
if [[ "${BROWSER_SLOT_TRY:-}" == 1 ]]; then
    compgen -G "$DIR/queue/*" >/dev/null || compgen -G "$DIR/.low-*" >/dev/null ||
        compgen -G "$DIR/.high-*" >/dev/null && exit 75
    for i in $(seq "$SLOTS" -1 5); do
        exec 9>"$DIR/slot$i"
        if flock -n 9; then
            echo "$$ $(date -u +%Y-%m-%dT%H:%M:%SZ) $PWD :: $*" >"$DIR/slot$i.holder"
            export BROWSER_SLOT=$i BROWSER_SLOT_FILE="$DIR/slot$i"
            "$@"
            code=$?
            rm -f "$DIR/slot$i.holder"
            exit $code
        fi
        exec 9>&-
    done
    exit 75
fi
# A start looks for a free slot every second, as it did before it went through the shared gate.
export BROWSER_SLOT_POLL=${BROWSER_SLOT_POLL:-1}
# With BROWSER_SLOT_ALSO the command, holding its slot of the planted pool, waits again for one of
# the other pool.
if [[ -n "${BROWSER_SLOT_ALSO:-}" ]]; then
    exec env BROWSER_SLOTS="$SLOTS" BROWSER_SLOT_DIR="$DIR" "$gate" \
        env -u BROWSER_SLOTS -u BROWSER_SLOT_ALSO BROWSER_SLOT_DIR="$BROWSER_SLOT_ALSO" "$here/with-browser.sh" "$@"
fi
exec env BROWSER_SLOTS="$SLOTS" BROWSER_SLOT_DIR="$DIR" "$gate" "$@"

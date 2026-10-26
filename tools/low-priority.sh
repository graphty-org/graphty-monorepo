#!/usr/bin/env bash
# Runs a command as work that yields to the pre-push gate: at niceness 10, so the gate's build and test
# shards get the CPU first, and in the low lane of the machine's test slots (GRAPHTY_SLOT_PRIORITY=low,
# tools/test-slots.mjs) and browser slots (BROWSER_SLOT_PRIORITY=low, tools/with-browser.sh). For the builds
# and test runs an agent starts by hand, outside the gate:
#
#   tools/low-priority.sh pnpm exec nx run-many -t build
#   tools/low-priority.sh pnpm exec vite build
#   tools/low-priority.sh pnpm exec vitest run src/foo.test.ts
#
# Never for the gate itself (tools/prepush.sh), which runs at normal priority. Exits
# with the command's exit code.
[ $# -gt 0 ] || { echo "usage: tools/low-priority.sh <command...>" >&2; exit 2; }
export GRAPHTY_SLOT_PRIORITY=low BROWSER_SLOT_PRIORITY=low
exec nice -n 10 "$@"

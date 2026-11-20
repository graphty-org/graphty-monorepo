/**
 * Every recorder entry point runs itself again inside two locks, so an author just runs `node x.mjs`:
 *
 *  1. a recording slot: flock on <main>/tmp/demo-video/rec-slots/slotN, N = 1..DEMO_REC_SLOTS
 *     (default 1, the measured number of recordings that run at once with no loss of smoothness;
 *     README.md, "How the page is filmed");
 *  2. a GPU browser slot of the machine's browser gate (design/ui/studio/tool/with-browser.sh).
 *
 * Inside both, DEMO_GATED=1 is set and the call returns; outside, it never returns.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { GATE, mkdirp, OUT } from "./env.mjs";

const TAKE = `
dir=$1; slots=$2; gate=$3; shift 3
# headless Chromium dumps a 450 MB core into the working directory as its GPU process exits
ulimit -c 0
for i in $(seq 1 "$slots"); do
  exec 8>"$dir/slot$i"
  if flock -n 8; then export DEMO_REC_SLOT=$i; exec env DEMO_GATED=1 BROWSER_GPU=1 "$gate" "$@"; fi
  exec 8>&-
done
echo "demo-video: all $slots recording slot(s) busy; waiting for slot 1" >&2
exec 8>"$dir/slot1"; flock 8
export DEMO_REC_SLOT=1; exec env DEMO_GATED=1 BROWSER_GPU=1 "$gate" "$@"
`;

/** Run this process again inside a recording slot and a GPU browser slot, unless it already is. */
export function gated() {
    if (process.env.DEMO_GATED === "1") return;
    const slots = process.env.DEMO_REC_SLOTS || "1";
    if (!/^[1-8]$/.test(slots)) throw new Error("DEMO_REC_SLOTS must be 1 to 8");
    const dir = mkdirp(join(OUT, "rec-slots"));
    const r = spawnSync("bash", ["-c", TAKE, "bash", dir, slots, GATE, process.execPath, ...process.argv.slice(1)], {
        stdio: "inherit",
    });
    process.exit(r.status ?? 1);
}

#!/usr/bin/env node
/**
 * The frame-rate gate for a cinematic take: fails when any window of the raw take holds too few
 * unique frames (a frame counts when ffmpeg's scene score against the one before is above
 * --score), which is judder in the finished video however the ramp speeds it up. Run it after
 * record.mjs, before cutting:
 *
 *   node tools/demo-video/frame-gate.mjs growth-world                  every 2 s window, at least 20
 *   node tools/demo-video/frame-gate.mjs growth-world --min 20 --window 2 --from 4 --to 90
 *
 * Prints each window's count and exits 1 when one is under --min.
 *
 * ffmpeg's scene score is min(mafd, |mafd - previous mafd|): it measures a change in how much the
 * picture changes, so a steady motion (an auto-rotate turn, a constant pan) scores near 0 on every
 * frame although every frame differs. `--metric diff` counts instead the frames whose mean absolute
 * luma difference from the frame before is above --diff (0-255, default 0.5; a repeated frame is
 * about 0, a steady slow turn about 6):
 *
 *   node tools/demo-video/frame-gate.mjs hotkeys-auto-rotate --metric diff
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { OUT } from "./lib/env.mjs";
import { duration, run } from "./lib/ffmpeg.mjs";

const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        min: { type: "string", default: "20" },
        window: { type: "string", default: "2" },
        score: { type: "string", default: "0.0015" },
        from: { type: "string", default: "0" },
        to: { type: "string" },
        metric: { type: "string", default: "scene" },
        diff: { type: "string", default: "0.5" },
    },
});
if (positionals.length !== 1) throw new Error("usage: frame-gate.mjs <clip id | mp4> [--min n] [--window s]");
const file = [join(OUT, "clips", `${positionals[0]}.mp4`), positionals[0]].find((f) => existsSync(f));
if (!file) throw new Error(`no video for ${positionals[0]}`);
if (!["scene", "diff"].includes(o.metric)) throw new Error("--metric is scene or diff");
const filter =
    o.metric === "diff"
        ? `tblend=all_mode=difference,signalstats,metadata=select:key=lavfi.signalstats.YAVG:value=${o.diff}:function=greater,showinfo`
        : `select='gt(scene,${o.score})',showinfo`;
const log = await run(["-i", file, "-vf", filter, "-f", "null", "-"], { quiet: false });
const times = [...log.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
const win = Number(o.window);
const end = Math.min(Number(o.to ?? Infinity), await duration(file));
let bad = 0;
for (let t = Number(o.from); t + win <= end + 1e-6; t += win) {
    const n = times.filter((x) => x >= t && x < t + win).length;
    const low = n < Number(o.min) * (win / 2);
    if (low) bad += 1;
    console.log(
        `${t.toFixed(1).padStart(6)}-${(t + win).toFixed(1).padEnd(6)} ${String(n).padStart(3)}${low ? "  LOW" : ""}`,
    );
}
console.log(bad ? `FAIL: ${bad} window(s) under ${o.min} unique frames per 2 s` : "ok");
process.exitCode = bad ? 1 : 0;

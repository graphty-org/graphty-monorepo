/**
 * A jump cut over a wait the app cannot shorten yet: keeps a recorded clip from its start to the
 * "cut-out" mark and from the "cut-in" mark to its end, and drops the wait between them from the
 * mp4 and from the clip's json (events and cursor shift back, the cut is listed under `jumpCut`).
 *
 *   node tools/demo-video/clips/ch7/jumpcut.js fifty-thousand
 *
 * Not a .mjs file, so record.mjs does not take it for a clip. It runs after record.mjs because the
 * recorder has no way to skip a wait inside a clip (reported as a framework issue). Re-running it
 * on a clip already cut does nothing.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FPS, OUT } from "../../lib/env.mjs";
import { duration, run } from "../../lib/ffmpeg.mjs";

const id = process.argv[2];
if (!id) throw new Error("usage: jumpcut.js <clip id>");
const json = join(OUT, "clips", `${id}.json`);
const mp4 = join(OUT, "clips", `${id}.mp4`);
const meta = JSON.parse(readFileSync(json, "utf8"));
if (meta.jumpCut) {
    console.log(`${id}: already cut`);
    process.exit(0);
}
const mark = (name) => {
    const e = meta.events.find((x) => x.type === "mark" && x.name === name);
    if (!e) throw new Error(`${id} has no "${name}" mark`);
    return e.t / 1000;
};
// "cut-out" is where the dropped part starts. A clip whose click or key itself freezes the page
// (Generate on 50,000 nodes, or Enter on a style change that redraws 156,000 edges, blocks the page's
// main thread, so the input returns only when the work is done) marks "cut-out-after-input" right
// after it instead: the cut then starts RING_MS after that last click or key, so the press and its
// ring stay in the take.
const RING_MS = 400;
function cutOut() {
    const after = meta.events.find((x) => x.type === "mark" && x.name === "cut-out-after-input");
    if (!after) return mark("cut-out");
    const input = meta.events.findLast((x) => (x.type === "click" || x.type === "key") && x.t < after.t);
    if (!input) throw new Error(`${id} has no click or key before "cut-out-after-input"`);
    return (input.t + RING_MS) / 1000;
}
const out = cutOut();
const into = mark("cut-in");
if (into <= out) throw new Error(`${id}: cut-in is not after cut-out`);
const gap = into - out;
const tmp = mp4.replace(/\.mp4$/, ".cut.mp4");
await run([
    "-i",
    mp4,
    "-filter_complex",
    `[0:v]trim=0:${out.toFixed(3)},setpts=PTS-STARTPTS[a];[0:v]trim=start=${into.toFixed(3)},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]`,
    "-map",
    "[v]",
    "-r",
    String(FPS),
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "14",
    "-movflags",
    "+faststart",
    tmp,
]);
renameSync(tmp, mp4);
const shift = (t) => (t >= into * 1000 ? t - gap * 1000 : t);
const inGap = (t) => t > out * 1000 && t < into * 1000;
meta.events = meta.events.filter((e) => !inGap(e.t)).map((e) => ({ ...e, t: shift(e.t) }));
meta.cursor = meta.cursor.filter((p) => !inGap(p.t)).map((p) => ({ ...p, t: shift(p.t) }));
meta.jumpCut = { atMs: Math.round(out * 1000), droppedMs: Math.round(gap * 1000) };
meta.runMs -= Math.round(gap * 1000);
meta.totalMs -= Math.round(gap * 1000);
meta.seconds = +(await duration(mp4)).toFixed(3);
// the frozen wait sent almost no frames: the rate that matters is over what is left
meta.capturedFps = +((meta.capturedFrames * 1000) / meta.totalMs).toFixed(1);
writeFileSync(json, JSON.stringify(meta, null, 1) + "\n");
console.log(`${id}: cut ${gap.toFixed(1)} s at ${out.toFixed(1)} s -> ${meta.seconds} s`);

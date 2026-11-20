#!/usr/bin/env node
/**
 * Review frames: a PNG every --every seconds (default 0.5) of a recorded clip or of a final video,
 * plus one half-size contact sheet, to look at before keeping a take.
 *
 *   node tools/demo-video/frames.mjs drop-gephi            clips/drop-gephi.mp4
 *   node tools/demo-video/frames.mjs out/tour.mp4 --every 2
 *
 * Writes <main>/tmp/demo-video/review/<name>/t<seconds>.png and sheet.jpg. Each frame's file name
 * is its time in the video; the clip's json says when each click and key happened.
 */
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

import { OUT } from "./lib/env.mjs";
import { duration, run } from "./lib/ffmpeg.mjs";

const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        every: { type: "string", default: "0.5" },
        from: { type: "string", default: "0" },
        to: { type: "string" },
    },
});
if (positionals.length !== 1)
    throw new Error("usage: frames.mjs <clip id | path under tmp/demo-video> [--every s] [--from s] [--to s]");
const arg = positionals[0];
const file = [join(OUT, "clips", `${arg}.mp4`), join(OUT, arg), arg].find((f) => existsSync(f));
if (!file) throw new Error(`no video for ${arg}`);
const dir = join(OUT, "review", basename(file, ".mp4"));
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const every = Number(o.every);
const end = Math.min(Number(o.to ?? Infinity), await duration(file));
for (let t = Number(o.from); t < end; t += every) {
    await run(["-ss", t.toFixed(3), "-i", file, "-frames:v", "1", join(dir, `t${t.toFixed(1).padStart(5, "0")}.png`)]);
}
const shots = Math.ceil((end - Number(o.from)) / every);
await run([
    "-ss",
    o.from,
    "-i",
    file,
    "-t",
    String(end - Number(o.from)),
    "-vf",
    `fps=1/${every},scale=480:-1,tile=6x${Math.ceil(shots / 6)}`,
    "-frames:v",
    "1",
    join(dir, "sheet.jpg"),
]);
console.log(dir);

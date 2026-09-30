#!/usr/bin/env node
/**
 * pixel-diff.mjs -- per-pixel comparison of two PNG screenshots of the same size.
 *
 * Prints JSON: how many pixels differ by more than the threshold (and what fraction), the largest
 * per-channel difference, the mean signed drift of the changed pixels (a uniform tint shows up as a
 * large drift), the bounding box of the changed region and a one-line reading of it: spread across
 * the frame (a camera move or global shading) or local (one element changed). Writes a diff image
 * with changed pixels in red over a faded copy of the first image.
 *
 * Usage:
 *   node tools/pixel-diff.mjs <a.png> <b.png> [--threshold <0-255>] [--out <diff.png>]
 *     --threshold  per-channel difference at or below which a pixel counts as unchanged (default 12,
 *                  which absorbs compression and anti-aliasing jitter)
 *     --out        the diff image (default: <b without .png>.diff.png)
 *
 * Exits 0 when nothing differs above the threshold, 1 when something does, 2 on bad input.
 * Pairs with tools/diff-stories.mjs, which writes <story>.baseline.png and <story>.head.png.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { PNG } from "pngjs";

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        threshold: { type: "string", default: "12" },
        out: { type: "string" },
    },
});
const [fileA, fileB] = positionals;
const THRESH = Number(values.threshold);
if (!fileA || !fileB || !Number.isFinite(THRESH)) {
    console.error("usage: pixel-diff.mjs <a.png> <b.png> [--threshold <0-255>] [--out <diff.png>]");
    process.exit(2);
}
const out = values.out ?? `${fileB.replace(/\.png$/i, "")}.diff.png`;

const a = PNG.sync.read(readFileSync(fileA));
const b = PNG.sync.read(readFileSync(fileB));
if (a.width !== b.width || a.height !== b.height) {
    console.error(`size differs: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    process.exit(2);
}

const { width: w, height: h } = a;
const diff = new PNG({ width: w, height: h });
let changed = 0;
let maxDelta = 0;
let [minX, minY, maxX, maxY] = [w, h, 0, 0];
let [sumR, sumG, sumB] = [0, 0, 0];
for (let i = 0; i < a.data.length; i += 4) {
    const dr = a.data[i] - b.data[i];
    const dg = a.data[i + 1] - b.data[i + 1];
    const db = a.data[i + 2] - b.data[i + 2];
    const m = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
    maxDelta = Math.max(maxDelta, m);
    if (m > THRESH) {
        changed++;
        sumR += dr;
        sumG += dg;
        sumB += db;
        const px = (i / 4) % w;
        const py = Math.floor(i / 4 / w);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        diff.data.set([255, 0, 0, 255], i);
    } else {
        diff.data.set([a.data[i], a.data[i + 1], a.data[i + 2], 80], i);
    }
}
writeFileSync(out, PNG.sync.write(diff));

const total = w * h;
const box = changed
    ? {
          minX,
          minY,
          maxX,
          maxY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
          coversFrac: +(((maxX - minX + 1) * (maxY - minY + 1)) / total).toFixed(3),
      }
    : null;
console.log(
    JSON.stringify(
        {
            a: fileA,
            b: fileB,
            diff: out,
            canvas: `${w}x${h}`,
            threshold: THRESH,
            changedPixels: changed,
            changedFrac: +(changed / total).toFixed(4),
            maxChannelDelta: maxDelta,
            meanSignedDrift: changed
                ? { r: +(sumR / changed).toFixed(1), g: +(sumG / changed).toFixed(1), b: +(sumB / changed).toFixed(1) }
                : null,
            boundingBox: box,
            reading: !box
                ? "identical above threshold"
                : box.coversFrac > 0.5
                  ? "spread across the frame: a camera move or global shading"
                  : "local: a specific element changed",
        },
        null,
        2,
    ),
);
process.exit(changed ? 1 : 0);

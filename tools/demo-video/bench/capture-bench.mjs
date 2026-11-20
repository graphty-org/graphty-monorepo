#!/usr/bin/env node
/**
 * Measures how smoothly each capture method films a busy scene at 1920x1080: the College football
 * sample opening in 3D (its force layout settling) and then a 2-second camera drag.
 *
 *   node tools/demo-video/bench/capture-bench.mjs --method screencast|displaymedia|recordvideo [--tag t]
 *   DEMO_REC_SLOTS=3 ... (run several at once to measure concurrency)
 *
 * Prints and writes <main>/tmp/demo-video/bench/<method>-<tag>.json: the page's own frame rate over
 * the scene (requestAnimationFrame count), and the video's frames, unique frames per second,
 * duplicates, longest freeze and stutters (lib/ffmpeg.mjs smoothness).
 */
import { readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { displaymedia, screencast } from "../lib/capture.mjs";
import { appUrl, launch, mkdirp, OUT, serve } from "../lib/env.mjs";
import { duration, smoothness } from "../lib/ffmpeg.mjs";
import { gated } from "../lib/gate.mjs";

gated();
const { values: o } = parseArgs({ options: { method: { type: "string" }, tag: { type: "string", default: "1" } } });
const dir = mkdirp(join(OUT, "bench"));
const name = `${o.method}-${o.tag}`;
const srv = await serve();
const vidDir = mkdirp(join(dir, `${name}-raw`));
const b = await launch({
    channel: o.method === "displaymedia" ? "chromium" : process.env.SC_CHANNEL || undefined,
    args:
        o.method === "displaymedia"
            ? ["--auto-accept-this-tab-capture", "--auto-select-tab-capture-source-by-title=graphty"]
            : [],
    context: o.method === "recordvideo" ? { recordVideo: { dir: vidDir, size: { width: 1920, height: 1080 } } } : {},
});
const { page } = b;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("crash", () => console.error("PAGE CRASHED"));
page.on("close", () => console.error("PAGE CLOSED"));
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text().slice(0, 300)));
b.context.on("close", () => console.error("CONTEXT CLOSED"));
await page.goto(appUrl(srv.origin));
await page.getByRole("button", { name: "No thanks" }).click();
const card = page.getByRole("button", { name: /^Open the College football sample/ });
await card.scrollIntoViewIfNeeded();
await page.mouse.click(5, 300); // a user activation for getDisplayMedia, on empty page
// the page's own frame count, for comparing what it drew against what was filmed
await page.evaluate(() => {
    globalThis.__raf = 0;
    globalThis.__rafT = [];
    const tick = () => {
        globalThis.__raf++;
        globalThis.__rafT.push(performance.timeOrigin + performance.now());
        globalThis.requestAnimationFrame(tick);
    };
    globalThis.requestAnimationFrame(tick);
});
const out = join(dir, `${name}.${o.method === "screencast" ? "mp4" : "webm"}`);
let cap = null; // recordvideo needs nothing started
if (o.method === "screencast")
    cap = await screencast(page, join(dir, `${name}-frames`), out, {
        quality: Number(process.env.SC_QUALITY) || undefined,
    });
if (o.method === "displaymedia")
    cap = await displaymedia(page, out, {
        mimeType: process.env.DM_MIME || undefined,
        bitrate: Number(process.env.DM_BITRATE) || undefined,
    });
const t0 = Date.now();
const raf0 = await page.evaluate(() => globalThis.__raf);
await card.click();
await page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
await page.waitForTimeout(3000); // the force layout settles on screen
const canvas = await page.locator("canvas").first().boundingBox();
const cx = canvas.x + canvas.width / 2;
const cy = canvas.y + canvas.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 120; i++) {
    await page.mouse.move(cx + 400 * Math.sin((i / 120) * Math.PI), cy + 60 * (i / 120));
    await page.evaluate(() => new Promise((r) => globalThis.requestAnimationFrame(r)));
}
await page.mouse.up();
await page.waitForTimeout(1000);
const raf1 = await page.evaluate(() => globalThis.__raf);
const rafT = (await page.evaluate(() => globalThis.__rafT)).filter((t) => t >= t0 && t <= Date.now());
const t1 = Date.now();
const res = cap ? await cap.stop() : null;
await b.close();
srv.close();
let file = out;
let span = { from: 0, to: (t1 - t0) / 1000 };
if (o.method === "recordvideo") {
    renameSync(join(vidDir, readdirSync(vidDir)[0]), out);
    const d = await duration(out);
    span = { from: Math.max(0, d - (t1 - t0) / 1000 - 0.3), to: d - 0.3 }; // the video ends when the context closes
} else if (res) {
    span = { from: (t0 - res.t0) / 1000, to: (t1 - res.t0) / 1000 };
}
const stats = await smoothness(file, span);
const result = {
    method: o.method,
    tag: o.tag,
    concurrent: Number(process.env.DEMO_REC_SLOTS || 1),
    renderer: b.renderer,
    pageFps: +(((raf1 - raf0) * 1000) / (t1 - t0)).toFixed(1),
    sceneSeconds: +((t1 - t0) / 1000).toFixed(2),
    deliveredFrames: res?.frames ? res.frames.filter((t) => t >= t0 && t <= t1).length : null,
    ...stats,
    errors,
    file,
};
if (res?.frames) {
    result.deliveredFps = +((result.deliveredFrames * 1000) / (t1 - t0)).toFixed(1);
    const ts = res.frames.filter((t) => t >= t0 && t <= t1);
    const gaps = ts
        .slice(1)
        .map((t, i) => t - ts[i])
        .sort((a, b) => a - b);
    const q = (p) => Math.round(gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))]);
    result.frameGapMs = { p50: q(0.5), p90: q(0.9), p99: q(0.99), max: q(1) };
    // a capture gap over 50 ms while the page itself drew frames at least every 50 ms is a frame the capture lost
    let lost = 0;
    for (let i = 1; i < ts.length; i++) {
        if (ts[i] - ts[i - 1] <= 50) continue;
        const inside = rafT.filter((t) => t > ts[i - 1] && t < ts[i]);
        const pts = [ts[i - 1], ...inside, ts[i]];
        if (pts.slice(1).every((t, k) => t - pts[k] <= 50)) lost++;
    }
    result.captureGapsWhilePageDrew = lost;
    const rg = rafT
        .slice(1)
        .map((t, i) => t - rafT[i])
        .sort((a, b) => a - b);
    const rq = (p) => Math.round(rg[Math.min(rg.length - 1, Math.floor(p * rg.length))]);
    result.pageGapMs = { p50: rq(0.5), p90: rq(0.9), p99: rq(0.99), max: rq(1) };
}
writeFileSync(join(dir, `${name}.json`), JSON.stringify(result, null, 1) + "\n");
console.log(JSON.stringify(result));

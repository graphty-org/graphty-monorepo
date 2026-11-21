#!/usr/bin/env node
/**
 * Records demo-video clips: each clips/<chapter-folder>/<id>.mjs drives the real graphty app (built
 * graphty/dist, every experiment on) with the human-like hand, filmed by CDP screencast.
 *
 *   node tools/demo-video/record.mjs --only drop-gephi,find-groups
 *   node tools/demo-video/record.mjs --chapter 2
 *   node tools/demo-video/record.mjs --all
 *   node tools/demo-video/record.mjs --list
 *
 * Writes <main>/tmp/demo-video/clips/<id>.mp4 (1920x1080 H.264, constant fps) and <id>.json
 * (caption, chapter, timings, cursor path, clicks and keys with target boxes). See README.md.
 */
import { readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism, loadavg } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import * as app from "./lib/app.mjs";
import { screencast } from "./lib/capture.mjs";
import { appUrl, FPS, H, launch, mkdirp, OUT, serve, TOOL, W } from "./lib/env.mjs";
import { duration, run as ffmpeg } from "./lib/ffmpeg.mjs";
import { gated } from "./lib/gate.mjs";
import { createHuman } from "./lib/human.mjs";
import { closeLook, png } from "./lib/look.mjs";

const LEAD_MS = 800; // a still beat before the action
const HOLD_MS = 2000; // the hold on the result (at least 1.5 s, the plan's rule)
const CLIPS = join(OUT, "clips");

// every .mjs file under a folder, in name order
function walk(d) {
    return readdirSync(d)
        .sort()
        .flatMap((n) => {
            if (statSync(join(d, n)).isDirectory()) return walk(join(d, n));
            return n.endsWith(".mjs") ? [join(d, n)] : [];
        });
}

/**
 * Every clip module, in folder and file order.
 * @param [only] - the ids being recorded: a shared id elsewhere (another author mid-move) is then
 * no reason to refuse; only a picked id must be unique
 * @returns the clips' default exports, each with its `file`
 */
export async function allClips(only = null) {
    const out = [];
    for (const f of walk(join(TOOL, "clips"))) {
        let m;
        try {
            m = (await import(pathToFileURL(f).href)).default;
        } catch (err) {
            // another author's clip half-written is no reason to refuse to record the ones picked
            if (!only) throw err;
            console.warn(`skipped ${f}: ${err.message.split("\n")[0]}`);
            continue;
        }
        if (!m?.id) continue; // a chapter's shared helpers, not a clip
        out.push({ ...m, file: f });
    }
    const ids = out.map((c) => c.id);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i && (!only || only.includes(id)));
    if (dup) throw new Error(`two clips share the id ${dup}`);
    return out;
}

async function recordPlaceholder(clip) {
    const card = await png(
        "placeholder",
        { text: clip.placeholder, caption: clip.caption },
        join(CLIPS, `${clip.id}.card.png`),
    );
    const seconds = clip.seconds ?? 6;
    const mp4 = join(CLIPS, `${clip.id}.part.mp4`);
    await ffmpeg([
        "-loop",
        "1",
        "-framerate",
        String(FPS),
        "-i",
        card,
        "-t",
        String(seconds),
        "-vf",
        "format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "14",
        "-r",
        String(FPS),
        "-movflags",
        "+faststart",
        mp4,
    ]);
    renameSync(mp4, join(CLIPS, `${clip.id}.mp4`));
    return { placeholder: clip.placeholder, totalMs: seconds * 1000, leadMs: 0, runMs: seconds * 1000, holdMs: 0 };
}

async function recordReal(clip, origin) {
    const b = await launch();
    const { page } = b;
    const problems = [];
    page.on("pageerror", (e) => problems.push(`page error: ${e.message.split("\n")[0]}`));
    // a crashed tab only shows as "Target page closed" in the clip's next call: say so at once
    page.on("crash", () => console.log(`  ${clip.id}: the page crashed`));
    b.context.on("close", () => console.log(`  ${clip.id}: the browser closed (${new Date().toISOString()})`));
    page.on("console", (m) => {
        if (m.type() === "error" && !/site\.json|Failed to load resource/.test(m.text()))
            problems.push(`console error: ${m.text().slice(0, 200)}`);
    });
    try {
        const h = await createHuman(page, clip.id);
        h.app = Object.fromEntries(Object.entries(app).map(([k, f]) => [k, (...a) => f(page, ...a)]));
        h.file = (name) => join(TOOL, "data", name);
        // "commit": the load event once never fired while the splash bar sat part-filled; start() waits on the page itself
        await page.goto(appUrl(origin, "", clip.featuresOff), { waitUntil: "commit" });
        await app.start(page);
        await app.closeToast(page);
        if (clip.dataset) await app.openSample(page, clip.dataset);
        await h.park();
        await clip.setup?.(h);
        await app.frames(page, 60); // the page has drawn a second of frames since setup
        h.events.length = 0;
        h.path.length = 0;
        // filmed to a temporary name, renamed only when the encode is done: a killed recorder leaves the old take whole
        const tmpMp4 = join(CLIPS, `${clip.id}.part.mp4`);
        const cap = await screencast(page, join(CLIPS, `${clip.id}.frames`), tmpMp4);
        const t0 = Date.now();
        await h.pause(clip.leadMs ?? LEAD_MS);
        const tRun = Date.now();
        await clip.run(h);
        const tHold = Date.now();
        await h.pause(clip.holdMs ?? HOLD_MS);
        const res = await cap.stop();
        const rel = (t) => t - res.t0;
        renameSync(tmpMp4, join(CLIPS, `${clip.id}.mp4`));
        rmSync(join(CLIPS, `${clip.id}.frames`), { recursive: true, force: true });
        return {
            renderer: b.renderer,
            leadMs: rel(tRun),
            runMs: tHold - tRun,
            holdMs: res.t1 - tHold,
            totalMs: res.t1 - res.t0,
            firstFrameLagMs: res.frames[0] - t0,
            capturedFrames: res.frames.length,
            capturedFps: +((res.frames.length * 1000) / (res.t1 - res.t0)).toFixed(1),
            // share of the 30 fps slots that got a new frame (the rest repeat the one before)
            slotsFilled: +(res.filled / res.slots).toFixed(3),
            events: h.events.map((e) => ({ ...e, t: rel(e.t) })),
            cursor: h.path.map((p) => ({ ...p, t: rel(p.t) })),
            problems,
        };
    } finally {
        await b.close();
    }
}

// the clips the command line names
function choose(clips, o) {
    const only = o.only?.split(",").filter(Boolean);
    const unknown = only?.filter((id) => !clips.some((c) => c.id === id)) ?? [];
    if (unknown.length) throw new Error(`no clip with id: ${unknown.join(", ")} (see --list)`);
    let picked = [];
    if (only) picked = clips.filter((c) => only.includes(c.id));
    else if (o.chapter) picked = clips.filter((c) => String(c.chapter) === o.chapter);
    else if (o.all) picked = clips;
    if (!picked.length) throw new Error("say which clips: --only <id,...> | --chapter <n> | --all (--list shows them)");
    return picked;
}

/**
 * What is wrong with a caption, by the craft rules (research-craft.md, rule 9): one line a viewer reads
 * in a glance, a real em dash, never "--".
 * @param text - the caption
 * @returns the problems, in words (none for a good caption)
 */
export function captionProblems(text) {
    const out = [];
    const words = text.split(/\s+/).filter((w) => w && w !== "\u2014").length;
    if (words > 10) out.push(`CAPTION ${words} words (at most 10, aim at 3-7)`);
    if (text.length > 42) out.push(`CAPTION ${text.length} characters (at most 42)`);
    if (text.includes("--")) out.push(String.raw`CAPTION uses "--": write the em dash as \u2014`);
    if (/\bdots?\b/i.test(text)) out.push('CAPTION says "dots": they are nodes');
    return out;
}

// record one clip and write its json
async function recordOne(clip, origin) {
    const r = clip.placeholder ? await recordPlaceholder(clip) : await recordReal(clip, origin);
    const mp4 = join(CLIPS, `${clip.id}.mp4`);
    const meta = {
        id: clip.id,
        chapter: clip.chapter,
        caption: clip.caption,
        tag: clip.tag ?? null,
        dataset: clip.dataset ?? null,
        featuresOff: clip.featuresOff ?? [],
        size: `${W}x${H}`,
        fps: FPS,
        seconds: +(await duration(mp4)).toFixed(3),
        recordedAt: new Date().toISOString(),
        ...r,
    };
    writeFileSync(join(CLIPS, `${clip.id}.json`), JSON.stringify(meta, null, 1) + "\n");
    const notes = [`${meta.seconds} s`];
    if (meta.capturedFps) notes.push(`filmed at ${meta.capturedFps} fps`);
    if (meta.seconds > 10.1) notes.push("OVER 10 s: split or cut it");
    notes.push(...captionProblems(clip.caption ?? ""));
    if (meta.problems?.length) notes.push(`PROBLEMS: ${meta.problems.join(" | ")}`);
    console.log(`${clip.id}: ${notes.join(", ")} -> ${mp4}`);
}

async function main() {
    const { values: o } = parseArgs({
        options: {
            only: { type: "string" },
            chapter: { type: "string" },
            all: { type: "boolean", default: false },
            list: { type: "boolean", default: false },
        },
    });
    const clips = await allClips(o.only?.split(",").filter(Boolean));
    if (o.list) {
        for (const c of clips)
            console.log(
                `${String(c.chapter).padEnd(6)} ${c.id.padEnd(28)} ${c.placeholder ? "[placeholder] " : ""}${c.caption}`,
            );
        return;
    }
    const picked = choose(clips, o);
    gated();
    // a busy machine films fewer frames (18 fps at a load of 75 on 32 threads, against 30 when quiet)
    const [load] = loadavg();
    if (load > availableParallelism())
        console.warn(
            `load average ${load.toFixed(0)} on ${availableParallelism()} threads: takes may stutter; check capturedFps`,
        );
    mkdirp(CLIPS);
    const srv = await serve();
    let failed = 0;
    try {
        for (const clip of picked) {
            const started = Date.now();
            try {
                await recordOne(clip, srv.origin);
            } catch (err) {
                failed++;
                const why = err.message.split("\n").slice(0, 4).join(" ");
                console.error(`${clip.id}: FAILED after ${((Date.now() - started) / 1000).toFixed(1)} s: ${why}`);
            }
        }
    } finally {
        srv.close();
        await closeLook();
    }
    process.exit(failed ? 1 : 0);
}

if (process.argv[1] === import.meta.filename) await main();

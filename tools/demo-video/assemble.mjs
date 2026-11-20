#!/usr/bin/env node
/**
 * Builds a finished video from a cut file and the recorded clips: chapter cards held long enough to
 * read, captions burned in the band above the stage with a short fade, crossfades between every part, chapter marks in the mp4 and in
 * a YouTube chapter list, and a local page to watch the results.
 *
 *   node tools/demo-video/assemble.mjs tools/demo-video/cuts/tour.json
 *   node tools/demo-video/assemble.mjs tools/demo-video/cuts/highlight.json
 *
 * Writes <main>/tmp/demo-video/out/<name>.mp4, <name>-chapters.txt (the tour's is also chapters.txt)
 * and index.html (every video in out/ with its chapter list). A placeholder (a clip not recorded
 * yet, a placeholder take or card) stops the build, so no production note reaches a finished video:
 * skip the item with a reason, or pass --draft to build with placeholder cards for review.
 *
 * A clip item's `seconds` trims it to its last `seconds` (the result and its hold), or from `from`.
 *
 * Cut file (JSON):
 *   { "name": "tour", "crossfadeMs": 400, "music": null | "<path to an audio file>",
 *     "sections": [ { "marker": "Intro" | null, "chapter": { "number": 1, "title": "...", "seconds": 2 }?,
 *                     "items": [ { "clip": "<id>", "seconds": 5?, "caption": "<used if not recorded>"? }
 *                              | { "card": "title" | "end" | "placeholder", "seconds": 3, ...card fields } ] } ] }
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { FPS, mkdirp, OUT } from "./lib/env.mjs";
import { duration, run } from "./lib/ffmpeg.mjs";
import { gated } from "./lib/gate.mjs";
import { closeLook, png, STAGE } from "./lib/look.mjs";

// parts are near-lossless and quick to make; only the final pass spends time on compression
const ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "10", "-pix_fmt", "yuv420p", "-r", String(FPS)];
const FINAL = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS)];
const CLIPS = join(OUT, "clips");

const DRAFT = process.argv.includes("--draft");
const cutPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!cutPath || !existsSync(cutPath)) throw new Error("usage: assemble.mjs <cut.json> [--draft]");

/**
 * Refuse a placeholder in a finished video (--draft allows it).
 * @param what - which item, for the message
 */
function noPlaceholder(what) {
    if (!DRAFT)
        throw new Error(
            `${what} is a placeholder: record it, give its cut item a "skip" reason, or build with --draft`,
        );
}
gated(); // cards and captions are drawn by a (gated) browser
const cut = JSON.parse(readFileSync(resolve(cutPath), "utf8"));
// every length and cut point is a whole number of frames, so chapter marks never drift
const toFrames = (sec) => Math.round(sec * FPS);
const snap = (sec) => toFrames(sec) / FPS;
const XF = snap((cut.crossfadeMs ?? 400) / 1000);
const work = join(OUT, "build", cut.name);
rmSync(work, { recursive: true, force: true });
mkdirp(work);
const outDir = mkdirp(join(OUT, "out"));
let n = 0;
const next = (ext) => join(work, `${String(++n).padStart(3, "0")}.${ext}`);
const stageBg = await png("stage", {}, join(work, "stage.png"));
const stageCorners = await png("corners", {}, join(work, "corners.png"));

/**
 * A still PNG held for `seconds`.
 * @param pngFile - the picture
 * @param seconds - how long
 * @returns the mp4
 */
async function still(pngFile, seconds) {
    const mp4 = next("mp4");
    await run([
        "-loop",
        "1",
        "-framerate",
        String(FPS),
        "-i",
        pngFile,
        "-frames:v",
        String(toFrames(seconds)),
        "-vf",
        "format=yuv420p",
        ...ENC,
        "-tune",
        "stillimage",
        mp4,
    ]);
    return mp4;
}

// ---------------------------------------------------------------- how long a card holds
// Long enough to find the text, read it and read it again (research-craft.md, rule 8): at full
// opacity, 1.0 s + 0.33 s a word + 0.8 s, a web address counting three words; at least 4 s for a
// chapter or the title, 6 s for the end card; the title at most 5 s (it follows the cold open, where
// viewers leave). The crossfades in and out come on top. A chapter's `short: true` is a 2 s mini card
// (the highlight's domain changes). The cut's `seconds` may ask for longer, never shorter.
const CARD_FLOOR = { chapter: 4, title: 4, end: 6 };
const CARD_CAP = { title: 5 };
/**
 * How long a card holds.
 * @param kind - "title", "chapter", "end" or "placeholder"
 * @param item - its fields (number, title, sub, big, lines, laterLines, text, seconds)
 * @returns seconds, a whole number of frames
 */
function cardSeconds(kind, item) {
    if (!(kind in CARD_FLOOR)) return snap(item.seconds ?? 3);
    const text = [
        kind === "chapter" && item.number != null ? `Chapter ${item.number}` : "",
        item.title,
        item.sub,
        item.big ?? (kind === "end" ? "graphty.app" : ""),
        ...(item.lines ?? []),
        ...(item.laterLines ?? []),
    ].join(" ");
    const words = text.split(/\s+/).filter((w) => /\w/.test(w));
    const count = words.length + 2 * words.filter((w) => /\w\.\w{2,}/.test(w)).length;
    const later = item.laterLines?.length ? (item.laterSec ?? 1.5) : 0;
    const read = item.short ? 2 : Math.max(1 + 0.33 * count + 0.8 + later, CARD_FLOOR[kind]);
    const full = Math.min(read, CARD_CAP[kind] ?? Infinity);
    return snap(Math.max(full + 2 * XF, item.seconds ?? 0));
}

// a card (title, chapter, placeholder, end) as a part of the video; a title with
// `over: { clip, sec? }` is laid over that clip's result frame (`sec` before its end, default 0.3);
// a title's `laterLines` fade in `laterSec` (1.5) after it appears
async function cardSegment(item) {
    if (item.card === "placeholder") noPlaceholder(`card "${item.text ?? item.caption}"`);
    const seconds = cardSeconds(item.card, item);
    const over = Boolean(item.over && clipMeta(item.over.clip));
    let frame = null;
    if (over) {
        frame = next("png");
        const src = join(CLIPS, `${item.over.clip}.mp4`);
        await run(["-sseof", String(-(item.over.sec ?? 0.3)), "-i", src, "-frames:v", "1", frame]);
    }
    const card = await png(item.card, { ...item, over }, next("png"));
    const later = item.laterLines?.length
        ? { card: await png(item.card, { ...item, over: true, reveal: true }, next("png")), at: item.laterSec ?? 1.5 }
        : null;
    if (!frame && !later) return { file: await still(card, seconds), seconds };
    return { file: await overFrame(frame, card, seconds, later), seconds };
}

/**
 * A piece of footage framed on the ink stage, its caption faded in and out in the band under it.
 * @param src - the footage (any size; scaled to the stage)
 * @param start - where in it to start, s
 * @param want - how long, s
 * @param caption - the caption
 * @param tag - a small label at the caption band's right ("Synthetic data"), or none
 * @param zoom - keyframes [{ t, rect: {x, y, w, h} }] (s from `start`, source pixels) to push in on, or none
 * @returns the mp4
 */
async function framed(src, start, want, caption, tag, zoom = []) {
    const mp4 = next("mp4");
    // the clip framed on the ink stage, its caption in the band above it: no caption ever covers the
    // app, and no player control covers the caption
    const cap = await png("caption", { text: caption ?? "", tag }, next("png"));
    const out = Math.max(0.6, want - 0.55);
    const loop = (f) => ["-loop", "1", "-framerate", String(FPS), "-i", f];
    await run([
        ...seek(src, start),
        ...loop(stageBg),
        ...loop(stageCorners),
        ...loop(cap),
        "-filter_complex",
        // footage of another shape (an exported video) keeps its proportions, centered on the app's light gray
        `[0]fps=${FPS},${zoomFilter(zoom)}scale=${STAGE.w}:${STAGE.h}:flags=lanczos:force_original_aspect_ratio=decrease,` +
            `pad=${STAGE.w}:${STAGE.h}:(ow-iw)/2:(oh-ih)/2:color=0xf4f4f4,setsar=1,setpts=PTS-STARTPTS[v];[1][v]overlay=${STAGE.x}:${STAGE.y}:eof_action=repeat[a];[a][2]overlay=format=auto[b];` +
            `[3]format=rgba,fade=in:st=0.25:d=0.35:alpha=1,fade=out:st=${out.toFixed(3)}:d=0.35:alpha=1[c];[b][c]overlay=format=auto,format=yuv420p`,
        "-frames:v",
        String(toFrames(want)),
        "-an",
        ...ENC,
        mp4,
    ]);
    return mp4;
}

/**
 * A perspective filter that pushes in on parts of the frame: from one keyframe to the next the
 * shown rectangle's scale eases in log scale (an even perceived speed: a linear width makes the
 * last third of a push-in lurch) and its center eases linearly, both on smoothstep, by frame;
 * sampled with cubic interpolation so the motion has no whole-pixel judder. Empty with no keyframes.
 * @param keys - [{ t, rect }] in time order
 * @returns the filter and its trailing comma, or ""
 */
function zoomFilter(keys) {
    if (!keys.length) return "";
    const f = keys.map((k) => Math.round(k.t * FPS));
    const v = keys.map(({ rect: r }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, ls: Math.log(1920 / r.w) }));
    const n = (x) => x.toFixed(4);
    // one edge of the shown rectangle: axis "x" or "y", sign -1 (left, top) or +1 (right, bottom)
    const edge = (axis, sign) => {
        const half = axis === "x" ? 960 : 540;
        const at = (p) => n(v[p][axis] + (sign * half) / Math.exp(v[p].ls));
        // commas inside a filter's option are escaped for the filtergraph
        let e = at(keys.length - 1);
        for (let i = keys.length - 2; i >= 0; i--) {
            const d = Math.max(1, f[i + 1] - f[i]);
            const c = String.raw`clip((in-${f[i]})/${d}\,0\,1)`;
            const u = `(${c}*${c}*(3-2*${c}))`;
            const a = v[i];
            const b = v[i + 1];
            const mid = `(${n(a[axis])}+(${n(b[axis] - a[axis])})*${u}${sign < 0 ? "-" : "+"}${half}/exp(${n(a.ls)}+(${n(b.ls - a.ls)})*${u}))`;
            e = String.raw`if(lt(in\,${f[i + 1]})\,${mid}\,${e})`;
        }
        return String.raw`if(lt(in\,${f[0]})\,${at(0)}\,${e})`;
    };
    const L = edge("x", -1);
    const T = edge("y", -1);
    const R = edge("x", 1);
    const B = edge("y", 1);
    return `perspective=x0=${L}:y0=${T}:x1=${R}:y1=${T}:x2=${L}:y2=${B}:x3=${R}:y3=${B}:eval=frame:interpolation=cubic,`;
}

// ---------------------------------------------------------------- the automatic push-in
// Controls are small at the stage's 80%: while the hand works in the app's panels and popovers, the
// shot may push in on them, gently and rarely (research-craft.md, rules 1-5): at most 1.5x and only
// if at least 1.3x; 1 s in and 1 s out; held at least 2.5 s; only for input on controls lasting
// 2.5 s; at most one push-in a clip; 6 s of wide shot between push-ins, counted across clips; never
// in a clip's first or last 500 ms, so no push-in crosses a cut. Never on the canvas (a box or a
// point the hand aims at is the drawing or a drawn file window; only Locator targets are controls).
const ZOOM = {
    max: 1.5,
    min: 1.3,
    padX: 170,
    padY: 120,
    gapMs: 2500,
    minMs: 2500,
    holdMs: 2500,
    inMs: 1000,
    outMs: 1000,
    restMs: 6000,
    edgeMs: 500,
};
const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
const isControl = (e) => e.box && e.box.label !== "box" && e.box.label !== "point";

const union = (a, b) => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
        x,
        y,
        width: Math.max(a.x + a.width, b.x + b.width) - x,
        height: Math.max(a.y + a.height, b.y + b.height) - y,
    };
};
const scaleFor = (u) => Math.min(ZOOM.max, 1920 / (u.width + 2 * ZOOM.padX), 1080 / (u.height + 2 * ZOOM.padY));

/**
 * Runs of a clip's logged input on controls (Locator targets, never canvas boxes or points) that fit
 * together at 1.3x or more and follow one another within 2.5 s; a move to the canvas or a drag ends
 * a run. Typing and key presses extend the run they follow (in before the first key, held through it).
 * @param events - the clip's events
 * @returns [{ from, end, box }] in ms of the clip
 */
function controlRuns(events) {
    const runs = [];
    let cur = null;
    for (const e of events) {
        const end = e.t + (e.ms ?? 0) + 300;
        const moving = e.type === "move" || e.type === "file-drag" || e.type === "drag";
        if (moving && !(e.type === "move" && isControl(e))) cur = null;
        else if (moving && cur && e.t - cur.end < ZOOM.gapMs && scaleFor(union(cur.box, e.box)) >= ZOOM.min) {
            cur.box = union(cur.box, e.box);
            cur.end = Math.max(cur.end, end);
        } else if (moving) {
            cur = { from: e.t, end, box: e.box };
            runs.push(cur);
        } else if (cur && e.type !== "mark" && e.type !== "window") cur.end = Math.max(cur.end, end);
    }
    return runs;
}

/**
 * The source rectangle shown at zoom `k` around a point, kept inside the frame.
 * @param c - the point to center on
 * @param k - the zoom
 * @returns the rectangle: x, y, w and h, in source pixels
 */
function zoomRect(c, k) {
    const w = 1920 / k;
    const h = 1080 / k;
    return { x: Math.min(1920 - w, Math.max(0, c.x - w / 2)), y: Math.min(1080 - h, Math.max(0, c.y - h / 2)), w, h };
}

/**
 * The clip's one push-in, if it earns one: on the first run of input on controls (controlRuns) long
 * enough and wide enough, once the rest since the last push-in is over, all of it inside the clip's
 * first and last 500 ms.
 * @param meta - the clip's json
 * @param start - where the segment starts in the clip, s
 * @param want - the segment's length, s
 * @param o - limits
 * @param o.hold - true: stay pushed in to the end (the result is in a panel)
 * @param o.restMs - the wide time still owed to the last push-in at the segment's start, ms
 * @param o.after - runs that start before this time (ms of the clip) are skipped
 * @returns the keyframes (`keys`: t in s from `start`, rect) and when it is fully out (`out`, s from `start`; null: no push-in)
 */
function autoZoom(meta, start, want, { hold = false, restMs = 0, after = 0 } = {}) {
    const s0 = start * 1000;
    const s1 = (start + want) * 1000;
    const at = (ms) => (ms - s0) / 1000;
    const earliest = s0 + Math.max(ZOOM.edgeMs, restMs);
    const lastOut = s1 - ZOOM.edgeMs;
    for (const run of controlRuns(meta.events ?? [])) {
        const k = scaleFor(run.box);
        if (k < ZOOM.min || run.end - run.from < ZOOM.minMs || run.end < s0 || run.from < after) continue;
        const tin = Math.max(run.from, earliest);
        if (tin + ZOOM.inMs >= s1) break;
        const rect = zoomRect({ x: run.box.x + run.box.width / 2, y: run.box.y + run.box.height / 2 }, k);
        const inAt = tin + ZOOM.inMs;
        if (hold)
            return {
                keys: [
                    { t: at(tin), rect: FULL },
                    { t: at(inAt), rect },
                ],
                out: want,
            };
        const end = Math.min(Math.max(run.end, inAt + ZOOM.holdMs), lastOut - ZOOM.outMs);
        if (end - inAt < ZOOM.holdMs) continue; // no room to hold it: stay wide
        return {
            keys: [
                { t: at(tin), rect: FULL },
                { t: at(inAt), rect },
                { t: at(end), rect },
                { t: at(end + ZOOM.outMs), rect: FULL },
            ],
            out: at(end + ZOOM.outMs),
        };
    }
    return { keys: [], out: null };
}

// an accurate input seek to a frame: a quarter frame early, so rounding never drops the frame asked for
const seek = (file, sec) => [...(sec > 0 ? ["-ss", Math.max(0, sec - 0.25 / FPS).toFixed(4)] : []), "-i", file];

/**
 * A span of a take between two of its marks.
 * @param meta - the clip's json
 * @param spec - [markA, offA, markB, offB]: offsets in s after each mark
 * @returns [from, to] in s of the take
 */
function markSpan(meta, spec) {
    const [ma, oa, mb, ob] = spec;
    const at = (name) => {
        const e = (meta.events ?? []).find((x) => x.type === "mark" && x.name === name);
        if (!e) throw new Error(`${meta.id}: no mark "${name}" for dropMarks`);
        return e.t / 1000;
    };
    const span = [at(ma) + oa, at(mb) + ob];
    if (span[1] - span[0] < 0.2) throw new Error(`${meta.id}: dropMarks span ${span} is empty`);
    return span;
}

const clipMeta = (id) => {
    const json = join(CLIPS, `${id}.json`);
    return existsSync(json) && existsSync(join(CLIPS, `${id}.mp4`)) ? JSON.parse(readFileSync(json, "utf8")) : null;
};

/**
 * A clip, trimmed to `seconds` if asked, framed on the stage with its caption under it.
 * The caption is the clip's own (checked against its take); the cut's caption is used only for a
 * clip not recorded yet.
 * @param item - the cut's item: { clip, seconds?, from?, drop?: [s, s] | [[s, s], ...], dropMarks?: [mark, s, mark, s], zoom?, zoomAfter?, caption?, tag?, placeholder? }
 * @returns the part: { file, seconds, clip, start }
 */
async function clipSegment(item) {
    const meta = clipMeta(item.clip);
    if (!meta || meta.placeholder) noPlaceholder(`clip ${item.clip}`);
    if (!meta) {
        // what the clip will show, said in its own caption
        const card = item.placeholder
            ? { text: item.placeholder, caption: item.caption }
            : { text: item.caption ?? item.clip, tag: "NOT RECORDED YET" };
        return { ...(await cardSegment({ card: "placeholder", ...card, seconds: item.seconds ?? 5 })), missing: true };
    }
    let src = join(CLIPS, `${item.clip}.mp4`);
    // `drop`: [a, b] or a list of them; `dropMarks: [markA, offA, markB, offB]`: from offA s after
    // markA to offB s after markB (a layout settling while the hand rests), found in the take, so a
    // re-take needs no new numbers. Cut latest first, so each span's times still hold.
    const dropped = Array.isArray(item.drop?.[0]) ? item.drop : [item.drop];
    const spans = [...(item.dropMarks ? [markSpan(meta, item.dropMarks)] : []), ...(item.drop ? dropped : [])].sort(
        (x, y) => y[0] - x[0],
    );
    for (const span of spans) {
        // a still stretch (a freeze, a settle, a wait) cut out of the take; the input log moves
        // back with it, so the push-in still follows the hand
        const [a, b] = span.map((x) => snap(x));
        const cut = next("mp4");
        await run([
            "-i",
            src,
            "-filter_complex",
            `[0:v]trim=0:${a},setpts=PTS-STARTPTS[x];[0:v]trim=start=${b},setpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=1[v]`,
            "-map",
            "[v]",
            ...ENC,
            cut,
        ]);
        src = cut;
        const gap = (b - a) * 1000;
        meta.events = (meta.events ?? [])
            .filter((e) => e.t < a * 1000 || e.t >= b * 1000)
            .map((e) => (e.t >= b * 1000 ? { ...e, t: e.t - gap } : e));
    }
    const total = await duration(src);
    // `from` alone drops the start (dead lead-in); `seconds` alone keeps the end (the result and its hold)
    const want = snap(Math.min(item.seconds ?? total - (item.from ?? 0), total));
    const start = snap(Math.max(0, Math.min(item.from ?? total - want, total - want)));
    if (meta.placeholder) {
        const mp4 = next("mp4");
        await run([...seek(src, start), "-frames:v", String(toFrames(want)), "-an", ...ENC, mp4]);
        return { file: mp4, seconds: want, clip: item.clip, start };
    }
    const z =
        item.zoom === false
            ? { keys: [], out: null }
            : autoZoom(meta, start, want, {
                  hold: item.zoom === "hold",
                  // `zoomAfter`: a mark in the clip; the menu clicks before it (that open the dialog) get no push-in
                  after: item.zoomAfter ? ((meta.events ?? []).find((e) => e.name === item.zoomAfter)?.t ?? 0) : 0,
                  restMs: Math.max(0, (lastOut + ZOOM.restMs / 1000 - playhead) * 1000),
              });
    if (z.out !== null) {
        lastOut = playhead + z.out;
        const k = 1920 / z.keys[1].rect.w;
        console.log(`push-in: ${item.clip} at ${(playhead + z.keys[0].t).toFixed(1)} s, ${k.toFixed(2)}x`);
    }
    const file = await framed(src, start, want, meta.caption ?? item.caption, item.tag ?? meta.tag, z.keys);
    return { file, seconds: want, clip: item.clip, start };
}

/**
 * Footage that is not a clip (a file the app exported, such as the fly-through video), framed like a clip.
 * @param item - { video: path, caption, tag?, seconds?, from? }
 * @returns the part
 */
async function videoSegment(item) {
    const src = resolve(item.video.replace(/^~\//, OUT + "/"));
    if (!existsSync(src))
        return cardSegment({
            card: "placeholder",
            text: item.caption,
            tag: "NOT RECORDED YET",
            seconds: item.seconds ?? 5,
        });
    // a browser-recorded webm often carries no duration: then trust the cut's seconds
    const total = await duration(src).catch(() => item.seconds ?? 4);
    const want = snap(Math.min(item.seconds ?? total, total - (item.from ?? 0)));
    return { file: await framed(src, item.from ?? 0, want, item.caption, item.tag), seconds: want };
}

/**
 * The outro: result frames from named clips, in turn, framed with one caption. Calm on purpose
 * (research-craft.md, rule 6): at most four stills, each 2.5 s, joined by 500 ms crossfades, with no
 * push-in, no scale change and no hard cut.
 * @param item - { montage: [{ clip, sec? (from the clip's end, default 0.3) }], caption, tag?, each? }
 * @returns the part
 */
async function montageSegment(item) {
    let shots = item.montage.filter((m) => clipMeta(m.clip) && !clipMeta(m.clip).placeholder);
    if (shots.length > 4) {
        console.warn(`montage: ${shots.length} stills; only the first 4 are shown`);
        shots = shots.slice(0, 4);
    }
    if (!shots.length) return cardSegment({ card: "placeholder", text: item.caption, tag: "NOT RECORDED YET" });
    const each = snap(item.each ?? 2.5);
    const xf = snap(0.5);
    const seconds = snap(each * shots.length);
    // every still spans the whole part; each later one fades in over the one before (this ffmpeg has no xfade)
    const inputs = [];
    for (const m of shots) {
        const f = next("png");
        await run(["-sseof", String(-(m.sec ?? 0.3)), "-i", join(CLIPS, `${m.clip}.mp4`), "-frames:v", "1", f]);
        inputs.push("-loop", "1", "-framerate", String(FPS), "-t", seconds.toFixed(3), "-i", f);
    }
    let graph = "[0]format=yuv420p[x0]";
    for (let i = 1; i < shots.length; i++)
        graph +=
            `;[${i}]format=yuva420p,fade=in:st=${(i * each - xf).toFixed(3)}:d=${xf}:alpha=1[s${i}]` +
            `;[x${i - 1}][s${i}]overlay=format=auto[x${i}]`;
    const show = next("mp4");
    await run([
        ...inputs,
        "-filter_complex",
        `${graph};[x${shots.length - 1}]format=yuv420p[v]`,
        "-map",
        "[v]",
        "-frames:v",
        String(toFrames(seconds)),
        ...ENC,
        show,
    ]);
    return { file: await framed(show, 0, seconds, item.caption, item.tag), seconds };
}

/**
 * A chapter card laid over the first frame of what follows it (opaque if that is a card).
 * @param chapter - { number, title, seconds? }
 * @param first - the section's first part
 * @returns the part: { file, seconds }
 */
async function chapterSegment(chapter, first) {
    const seconds = cardSeconds("chapter", chapter);
    if (!first?.clip && !first?.footage) return cardSegment({ card: "chapter", ...chapter, seconds });
    const frame = next("png");
    await run(["-i", first.file, "-frames:v", "1", frame]);
    const card = await png("chapter", { ...chapter, over: true }, next("png"));
    return { file: await overFrame(frame, card, seconds), seconds };
}

/**
 * A card laid over a blurred still frame (or on its own), held still; a second card (the same card
 * with more lines) may fade in over it later.
 * @param frame - the frame (PNG), or null for an opaque card
 * @param card - the card (transparent PNG over a frame)
 * @param seconds - how long
 * @param later - { card, at }: the fuller card, faded in over 0.5 s from `at` s, or null
 * @returns the mp4
 */
async function overFrame(frame, card, seconds, later = null) {
    const mp4 = next("mp4");
    const loop = (f) => ["-loop", "1", "-framerate", String(FPS), "-i", f];
    const inputs = [...(frame ? loop(frame) : []), ...loop(card), ...(later ? loop(later.card) : [])];
    const c = frame ? 1 : 0;
    let graph = frame ? `[0]boxblur=12:2[f];[f][1]overlay=format=auto[a]` : `[0]null[a]`;
    graph += later
        ? `;[${c + 1}]format=rgba,fade=in:st=${later.at}:d=0.5:alpha=1[l];[a][l]overlay=format=auto,format=yuv420p`
        : ";[a]format=yuv420p";
    await run([...inputs, "-filter_complex", graph, "-frames:v", String(toFrames(seconds)), ...ENC, mp4]);
    return mp4;
}

// ---------------------------------------------------------------- the parts, in order
const segments = [];
const marks = [];
// where the next part starts in the finished video, and when the last push-in was fully out (s):
// the 6 s of wide shot between push-ins is counted across clips and cards
let playhead = 0;
let lastOut = -Infinity;
for (const section of cut.sections) {
    const items = [];
    if (section.chapter) playhead += cardSeconds("chapter", section.chapter) - XF;
    for (const item of section.items) {
        if (item.skip) {
            console.log(`skipped ${item.clip ?? item.card}: ${item.skip}`);
            continue;
        }
        if (item.clip) items.push(await clipSegment(item));
        else if (item.montage) items.push(await montageSegment(item));
        else if (item.video) items.push(await videoSegment(item));
        else items.push(await cardSegment(item));
        playhead += items.at(-1).seconds - XF;
    }
    const head = section.chapter ? [await chapterSegment(section.chapter, items[0])] : [];
    if (section.marker) marks.push({ title: section.marker, index: segments.length });
    segments.push(...head, ...items);
}
const offsets = [];
let t = 0;
for (const s of segments) {
    offsets.push(t);
    t += s.seconds - XF;
}
const total = t + XF;

// ---------------------------------------------------------------- crossfades, then one concatenation
// Each crossfade is its own short clip (the end of one part under the start of the next, faded in),
// and each part's middle is cut out between them; the pieces are then joined end to end. One
// decoder at a time, so memory stays flat however long the cut is (a single graph overlaying every
// part held all of them at once: 7 GB and growing for the tour).
const PIECE = [...ENC, "-an"];
const pieces = [];
const piece = async (args) => {
    const f = next("mp4");
    await run([...args, ...PIECE, f]);
    pieces.push(f);
};
const cutOf = (s, from) => seek(s.file, from);
const count = (sec) => ["-frames:v", String(toFrames(sec))];
console.log(`${cut.name}: ${segments.length} parts, ${total.toFixed(1)} s; joining...`);
// the first part fades in from black
await piece([...cutOf(segments[0], 0), ...count(XF), "-vf", `fade=in:st=0:d=${XF}`]);
for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const last = i === segments.length - 1;
    const end = last ? s.seconds : s.seconds - XF;
    if (end - XF > 0.01)
        await piece([
            ...cutOf(s, XF),
            ...count(end - XF),
            ...(last ? ["-vf", `fade=out:st=${(end - XF - 0.6).toFixed(3)}:d=0.6`] : []),
        ]);
    if (last) break;
    const b = segments[i + 1];
    await piece([
        ...cutOf(s, s.seconds - XF),
        ...cutOf(b, 0),
        "-filter_complex",
        `[0]setpts=PTS-STARTPTS[a];[1]setpts=PTS-STARTPTS,format=yuva420p,fade=in:st=0:d=${XF}:alpha=1[b];[a][b]overlay=format=auto,format=yuv420p`,
        ...count(XF),
    ]);
}
const piecesList = join(work, "pieces.ffconcat");
writeFileSync(piecesList, "ffconcat version 1.0\n" + pieces.map((f) => `file '${f}'`).join("\n") + "\n");
const silent = join(work, "video.mp4");
await run(["-f", "concat", "-safe", "0", "-i", piecesList, ...FINAL, "-movflags", "+faststart", silent]);

// ---------------------------------------------------------------- chapters, music, the page
const ms = (s) => Math.round(s * 1000);
const chapters = marks.map((m, i) => ({
    title: m.title,
    start: i === 0 ? 0 : offsets[m.index],
    end: i + 1 < marks.length ? offsets[marks[i + 1].index] : total,
}));
const meta = join(work, "chapters.ffmeta");
writeFileSync(
    meta,
    `;FFMETADATA1\ntitle=graphty \u2014 ${cut.name}\n` +
        chapters
            .map((c) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${ms(c.start)}\nEND=${ms(c.end)}\ntitle=${c.title}\n`)
            .join(""),
);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const list = chapters.map((c) => `${clock(c.start)} ${c.title}`).join("\n") + "\n";
writeFileSync(join(outDir, `${cut.name}-chapters.txt`), list);
if (cut.name === "tour") writeFileSync(join(outDir, "chapters.txt"), list);
writeFileSync(
    join(outDir, `${cut.name}.json`),
    JSON.stringify(
        {
            seconds: total,
            chapters,
            parts: segments.map((s, i) => ({
                start: offsets[i],
                seconds: s.seconds,
                clip: s.clip ?? null,
                missing: s.missing ?? false,
            })),
        },
        null,
        1,
    ) + "\n",
);

const final = join(outDir, `${cut.name}.mp4`);
const music = cut.music && existsSync(cut.music) ? cut.music : null;
await run([
    "-i",
    silent,
    "-i",
    meta,
    ...(music ? ["-i", music] : []),
    "-map",
    "0:v",
    ...(music
        ? [
              "-map",
              "2:a",
              "-af",
              `afade=out:st=${(total - 2).toFixed(3)}:d=2`,
              "-c:a",
              "aac",
              "-b:a",
              "192k",
              "-shortest",
          ]
        : []),
    "-map_metadata",
    "1",
    "-map_chapters",
    "1",
    "-c:v",
    "copy",
    "-movflags",
    "+faststart",
    final,
]);

// index.html: every finished video in out/, with its chapters as links
const order = (f) => (f === "tour.mp4" ? "0" : "1") + f; // the tour first
const videos = readdirSync(outDir)
    .filter((f) => f.endsWith(".mp4"))
    .sort((a, b) => order(a).localeCompare(order(b)));
const esc = (s) => String(s).replaceAll(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);
const blocks = videos.map((v) => {
    const name = basename(v, ".mp4");
    const info = existsSync(join(outDir, `${name}.json`))
        ? JSON.parse(readFileSync(join(outDir, `${name}.json`), "utf8"))
        : { chapters: [] };
    const link = (c) => `<a href="#" data-v="${name}" data-t="${c.start}">` + clock(c.start) + "</a>";
    const items = info.chapters.map((c) => "<li>" + link(c) + " " + esc(c.title) + "</li>").join("");
    return `<section><h2>${esc(name)} <small>${clock(info.seconds ?? 0)}</small></h2><video id="${name}" src="${v}" controls preload="metadata"></video><ol>${items}</ol></section>`;
});
writeFileSync(
    join(outDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>graphty demo video</title><style>
:root { color-scheme: light dark; --bg: #f6f7f9; --fg: #12171f; --mute: #5b6472; }
@media (prefers-color-scheme: dark) { :root { --bg: #12171f; --fg: #eef1f5; --mute: #9aa4b2; } }
body { margin: 0; padding: 24px 16px 60px; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; } h1 { font-size: 26px; } h2 small { color: var(--mute); font-weight: 400; }
video { width: 100%; border-radius: 10px; background: #000; } ol { padding-left: 20px; columns: 2 260px; } a { color: #5b8a00; }
</style></head><body><main><h1>graphty demo video</h1>${blocks.join("")}</main>
<script>for (const a of document.querySelectorAll("a[data-v]")) a.onclick = (e) => { e.preventDefault(); const v = document.getElementById(a.dataset.v); v.currentTime = Number(a.dataset.t); v.play(); };</script>
</body></html>\n`,
);
await closeLook();
console.log([final, join(outDir, `${cut.name}-chapters.txt`), join(outDir, "index.html")].join("\n"));

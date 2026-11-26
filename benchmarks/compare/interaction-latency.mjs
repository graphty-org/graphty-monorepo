// How long a reader waits after each kind of input: hovering, clicking, dragging, turning the camera, keys and touch on
// graphty-element, and the graphty app's own controls around it. See INTERACTION-LATENCY.md.
//
//   node interaction-latency.mjs tier <quick|full> <results.jsonl> [--page Q1,E3] [--reps 3]
//                                        the suite's pages (INPUT-CATALOG.md, sections 3.3 and 3.4); tracked by
//                                        tools/interaction-latency.mjs, which runs this and keeps the history
//   node interaction-latency.mjs element <results.jsonl> [--sizes 100,1k,10k,50k,100k] [--paths objects,batched]
//                                        [--dims 3d,2d] [--modes plain,default,styled,heavy] [--dpr2-sizes 50k,100k]
//                                        [--reps 5] [--only <regex>]
//   node interaction-latency.mjs app <results.jsonl> [--dist <graphty dist>] [--features ,cosmograph,file-styles]
//                                    [--graphs lesmis,yed-live,gen-1k,gen-10k,staff-50k,gen-100k]
//                                    [--app-dims 3d,2d] [--reps 5] [--only <regex>]
//   node interaction-latency.mjs report <results.jsonl>             Markdown tables, slowest first
//   node interaction-latency.mjs check                              every input a tier names is one a page runs
//
// Latency is measured in the page, from the input event's own timeStamp (the moment the browser received the real
// mouse, wheel, key or touch input Playwright sent) to the frame after the result is DRAWN: the canvas pixels at the
// target (read back from graphty-element's canvas, which keeps each drawn frame) differ from what they were before the
// input. The moment the result became readable through the public API (selection, hovered node, camera, a style's
// resolved value) or the app's accessibility tree is kept beside it as stateMs. A result the canvas never shows (a
// hover with no hover look) is marked noVisible after `waitForPainted()` resolves and ten more frames stay unchanged.
//
// `element` runs one page per graph size, render path, dimension, look and pixel ratio (the bench page this directory
// builds, see RUNBOOK.md, section 1, BENCH_URL or BENCH_BUILD); `app` one page per graph, feature set and dimension of
// the built graphty app (graphty/dist; never the Vite dev server). Each page is one child process, run through
// LAT_WRAP when set (a command prefix, words split on spaces: the GPU lock and the reserved cores), and appends one
// JSON line per interaction cell to the results file. LAT_SMOKE=1 runs on any renderer (SwiftShader), for checking
// that every case drives, never for numbers.
import { spawnSync } from "node:child_process";
import {
    appendFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { loadavg } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
// eslint-disable-next-line sonarjs/no-os-command-from-path -- a local measuring tool, run from the owner's PATH
const common = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: HERE });
const MAIN = dirname(common.stdout.toString().trim());
const EGL = process.env.BENCH_EGL ?? join(MAIN, "tmp/egl/root/usr/lib/x86_64-linux-gnu");
const FILES = join(REPO, "design/ui/studio/tool/files");
const CAP_MS = Number(process.env.LAT_CAP_MS ?? 30000);
const SMOKE = process.env.LAT_SMOKE === "1";
const PERCEIVED_MS = 300;
const K = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));
const SIZES = { 100: 100, 200: 200, "1k": 1000, "10k": 10000, "50k": 50000, "100k": 100000 };

// ------------------------------------------------------------------ the probe, in every page

/* global document, requestAnimationFrame, addEventListener, removeEventListener, devicePixelRatio, innerWidth, innerHeight, B -- the probe and the bench page run in the browser */
const PROBE = () => {
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const el = () => document.querySelector("graphty-element");
    const cam = () => JSON.stringify(el().getCameraState());
    // The element's drawing canvas: the largest canvas in it (the minimap is a small one).
    const canvasOf = () => {
        const e = el();
        const all = [...(e.shadowRoot?.querySelectorAll("canvas") ?? []), ...e.querySelectorAll("canvas")];
        return all.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
    };
    const scratch = document.createElement("canvas");
    const g2 = scratch.getContext("2d", { willReadFrequently: true });
    // A region of the drawn canvas as RGBA bytes: `pix` is { x, y, w, h } in page pixels around a point, or "all" for
    // a 256 x 200 thumbnail of the whole canvas (one node's halo still covers tens of its pixels). The canvas keeps
    // its last drawn frame (graphty-element's preserveDrawingBuffer, on by default), so this reads what is on screen.
    const grab = (pix) => {
        const c = canvasOf();
        if (!c) return null;
        const r = c.getBoundingClientRect();
        const kx = c.width / r.width,
            ky = c.height / r.height;
        let sx = 0,
            sy = 0,
            sw = c.width,
            sh = c.height,
            dw = 256,
            dh = 200;
        if (pix !== "all") {
            const w = pix.w ?? 12,
                h = pix.h ?? 12;
            sx = Math.max(0, Math.round((pix.x - w / 2 - r.left) * kx));
            sy = Math.max(0, Math.round((pix.y - h / 2 - r.top) * ky));
            sw = Math.max(1, Math.min(c.width - sx, Math.round(w * kx)));
            sh = Math.max(1, Math.min(c.height - sy, Math.round(h * ky)));
            dw = Math.min(sw, 256);
            dh = Math.min(sh, 256);
        }
        if (scratch.width !== dw) scratch.width = dw;
        if (scratch.height !== dh) scratch.height = dh;
        g2.clearRect(0, 0, dw, dh);
        g2.drawImage(c, sx, sy, sw, sh, 0, 0, dw, dh);
        return g2.getImageData(0, 0, dw, dh).data;
    };
    // Changed: at least one pixel in 2000 (and at least two) moved by more than 24 levels in a channel. A canvas
    // cleared by a resize (every pixel transparent) is not a drawn result.
    const blank = (a) => {
        for (let i = 3; i < a.length; i += 4) if (a[i] !== 0) return false;
        return true;
    };
    const differs = (a, b) => {
        if (!a || !b || a.length !== b.length || blank(a)) return false;
        let n = 0;
        for (let i = 0; i < a.length; i += 4)
            if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 24) n++;
        return n >= Math.max(2, a.length / 4 / 2000);
    };
    // How many pixels of a box are drawn in `rgb`: a look's own color, where it is drawn now. A saturated color is
    // matched by hue (within 25 degrees, saturation over 0.35), so 3D shading that darkens a lit node still
    // matches; a gray one by distance (within 70 levels).
    const hsv = (r, g, b) => {
        const mx = Math.max(r, g, b),
            mn = Math.min(r, g, b),
            d = mx - mn;
        let h = 0;
        if (d && mx === r) h = ((g - b) / d) % 6;
        else if (d && mx === g) h = (b - r) / d + 2;
        else if (d) h = (r - g) / d + 4;
        return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
    };
    const near = (a, [r0, g0, b0]) => {
        const [h0, s0] = hsv(r0, g0, b0);
        let n = 0;
        for (let i = 0; i < a.length; i += 4) {
            if (a[i + 3] === 0) continue;
            if (s0 > 0.35) {
                const [h, sat, v] = hsv(a[i], a[i + 1], a[i + 2]);
                const dh = Math.min(Math.abs(h - h0), 360 - Math.abs(h - h0));
                if (dh < 25 && sat > 0.35 && v > 0.15) n++;
            } else if (Math.hypot(a[i] - r0, a[i + 1] - g0, a[i + 2] - b0) < 70) n++;
        }
        return n;
    };
    // `look`: { id | x, y, w, h, rgb, absent } -- the box at node id's position this frame (or at x, y) shows the
    // color rgb (or, with absent, no longer shows it). For a graph a layout moves every frame, where "the box
    // changed" proves nothing (INPUT-CATALOG.md, section 4.4).
    const lookSeen = (look) => {
        let at = look;
        if (look.id !== undefined) {
            const e = el();
            // "@hovered" and "@selected": whichever node is hovered or selected now (on a moving graph the node
            // under the pointer is not known until it is there).
            const sel = e.session.selection;
            const id = { "@hovered": sel.hovered, "@selected": sel.nodes[0] }[look.id] ?? look.id;
            if (id === null || id === undefined) return false;
            const p = e.nodeScreenPosition(id);
            if (!p?.visible) return false;
            const r = e.getBoundingClientRect();
            at = { x: r.left + p.x, y: r.top + p.y };
        }
        const a = grab({ x: at.x, y: at.y, w: look.w ?? 30, h: look.h ?? 30 });
        if (!a || blank(a)) return false;
        const n = near(a, look.rgb);
        return look.absent ? n < 3 : n >= 6;
    };
    const canvasSize = () => {
        const c = canvasOf();
        return c ? `${c.width}x${c.height}` : "";
    };
    // A camera animation the element's stable frame does not wait for (the app's Focus selected glide): up to 60
    // frames for the camera to start moving, then until it holds still for three frames.
    const cameraSettled = async (cam0, capMs) => {
        const t0 = performance.now();
        let last = cam(),
            same = 0;
        for (let i = 0; i < 60 && last === cam0; i++) {
            await raf();
            last = cam();
        }
        while (same < 3 && performance.now() - t0 < capMs) {
            await raf();
            const now = cam();
            same = now === last ? same + 1 : 0;
            last = now;
        }
    };
    let armed = null;
    globalThis.__lat = {
        grab,
        differs,
        canvasSize,
        // Watches for the first `type` input event; from then, each frame, for `cond` (an expression over el, the
        // element; s, this measurement; p, the params) to hold and, with `pix`, for the pixels there to change.
        // With `settle`, then waits for waitForStableFrame (a layout or a glide finishing) as settledMs.
        // With `startNow` (a change no input event carries: a pixel ratio change), the clock starts at arming.
        arm({ type, cond, params, event, capMs, pix, look, settle, startNow }) {
            const s = { tInput: null, tState: null, tPix: null, tEvent: null, frames: 0, cam0: cam() };
            const base = pix ? grab(pix) : null;
            // A look already drawn before the input means the case's setup failed, as for cond below.
            if (look && lookSeen(look)) s.preTrue = true;
            if (startNow) {
                s.tInput = performance.now();
                s.wallInput = performance.timeOrigin + s.tInput;
            }
            const onInput = (e) => {
                if (s.tInput === null) {
                    s.tInput = e.timeStamp;
                    s.wallInput = performance.timeOrigin + e.timeStamp;
                }
            };
            const onEvent = (e) => {
                if (s.tEvent === null && s.tInput !== null) {
                    s.tEvent = performance.now();
                    s.detail = e.detail;
                }
            };
            addEventListener(type, onInput, { capture: true });
            if (event) el().addEventListener(event, onEvent);
            // When a press and its release reach the page: more than 300 ms apart, graphty-element does not count
            // them as a click (CLICK_MAX_DURATION_MS), so a click case that times out is a dropped click, not a slow one.
            const press = { down: null, up: null };
            const onDown = () => (press.down ??= performance.now());
            const onUp = () => (press.up ??= performance.now());
            addEventListener("pointerdown", onDown, { capture: true });
            addEventListener("pointerup", onUp, { capture: true });
            // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
            const test = new Function("el", "s", "p", `return (${cond});`);
            const wait = { painted: null, after: 0, asked: false, noState: 0 };
            // A result that already holds before the input means the case's setup failed, not a fast input.
            if (cond !== "true")
                try {
                    // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                    s.preTrue ||= !!test(el(), { ...s }, params ?? {});
                } catch {
                    s.preTrue = false;
                }
            const pixSeen = () => (base && differs(grab(pix), base)) || (look && lookSeen(look));
            // One frame after the input: true when the result is drawn, or never will be.
            const over = () => {
                // The frame after the pixels changed is the one that presents them.
                if (s.tPix !== null && s.tPixNext === undefined) s.tPixNext = performance.now();
                // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                if (s.tState === null && test(el(), s, params ?? {})) s.tState = performance.now();
                if (s.tPix === null && pixSeen()) s.tPix = performance.now();
                // Drawn, but the state never says so (a 2D pinch moves no camera field): ten frames' grace, then done.
                if (s.tState === null && s.tPix !== null && ++wait.noState >= 10) return true;
                if (s.tState === null) return false;
                if ((!base && !look) || s.tPix !== null) return true;
                if (!wait.asked) {
                    wait.asked = true;
                    Promise.resolve(el().waitForPainted?.()).then(() => (wait.painted = performance.now()));
                }
                if (wait.painted !== null && ++wait.after >= 10) s.noVisible = true;
                return !!s.noVisible;
            };
            const settled = async () => {
                if (!settle || s.timeout) return null;
                await Promise.race([el().waitForStableFrame(), new Promise((r) => setTimeout(r, capMs))]).catch(
                    () => {},
                );
                if (settle === "camera") await cameraSettled(s.cam0, capMs);
                return performance.now();
            };
            s.done = (async () => {
                const t0 = performance.now();
                for (;;) {
                    await raf();
                    s.frames++;
                    if (s.tInput !== null && over()) break;
                    if (performance.now() - t0 > capMs) {
                        s.timeout = true;
                        break;
                    }
                }
                await raf();
                const tDrawn = performance.now();
                const tSettled = await settled();
                removeEventListener(type, onInput, { capture: true });
                if (event) el().removeEventListener(event, onEvent);
                removeEventListener("pointerdown", onDown, { capture: true });
                removeEventListener("pointerup", onUp, { capture: true });
                const held = press.down !== null && press.up !== null ? press.up - press.down : null;
                const r = (t) => (t === null || s.tInput === null ? null : +(t - s.tInput).toFixed(1));
                // A result the canvas never shows: its state time stands in.
                const end = s.noVisible ? s.tState : (s.tPixNext ?? tDrawn);
                return {
                    ms: s.timeout ? null : r(end),
                    stateMs: r(s.tState),
                    pixMs: r(s.tPix),
                    eventMs: r(s.tEvent),
                    settledMs: r(tSettled),
                    noVisible: !!s.noVisible,
                    wallInput: s.wallInput ?? null,
                    frames: s.frames,
                    sawInput: s.tInput !== null,
                    timeout: !!s.timeout,
                    capMs,
                    endsOn: base || look ? "pixels" : "state",
                    ...(held !== null && held > 300 ? { clickWindowMissed: +held.toFixed(1) } : {}),
                    ...(s.preTrue ? { preTrue: true } : {}),
                };
            })();
            armed = s;
        },
        result: () => armed.done,
        // A burst: records every `type` input (each coalesced pointer event too) and, each frame, `track` (an
        // expression over el and p); `end()` waits until `track` holds still for `still` frames after the last input.
        // The lag is from the last input to the frame after the canvas pixels first changed following it (a
        // 256 x 200 thumbnail, read only from `tail()`, called just before the last input, so the readback costs the
        // burst nothing); `track` stands in when the pixels never change (noVisible) or `pix` is false (a DOM
        // result). `close()` stops counting inputs, so the burst's own release is not one. Frames dropped are counted
        // against 60 Hz.
        burst({ type, track, params, still = 6, pix = true }) {
            // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
            const read = new Function("el", "p", `return JSON.stringify(${track});`);
            const inputs = [];
            const frames = [];
            const onInput = (e) => {
                const all = e.getCoalescedEvents?.() ?? [];
                if (all.length) for (const c of all) inputs.push(c.timeStamp);
                else inputs.push(e.timeStamp);
            };
            addEventListener(type, onInput, { capture: true });
            const run = { on: true, tail: false };
            const loop = (async () => {
                while (run.on) {
                    await raf();
                    // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                    const f = { t: performance.now(), v: read(el(), params ?? {}), n: inputs.length };
                    if (pix && run.tail) f.px = grab("all");
                    frames.push(f);
                }
            })();
            return {
                async tail() {
                    run.tail = true;
                    await raf();
                    await raf();
                },
                close() {
                    removeEventListener(type, onInput, { capture: true });
                },
                async end() {
                    const t0 = performance.now();
                    for (;;) {
                        await raf();
                        const last = inputs.at(-1) ?? 0;
                        const tail = frames.filter((f) => f.t > last);
                        const n = tail.length;
                        if (
                            (n > still && tail.slice(-still).every((f) => f.v === tail.at(-1).v)) ||
                            performance.now() - t0 > 10000
                        )
                            break;
                    }
                    run.on = false;
                    await loop;
                    removeEventListener(type, onInput, { capture: true });
                    const last = inputs.at(-1);
                    const sent = inputs.slice(0, -1);
                    if (last === undefined) return { sawInput: false, timeout: true, ms: null, capMs: 10000 };
                    const before = frames.findLast((f) => f.t <= last);
                    const seen = frames.find((f) => f.t > last && f.v !== before?.v);
                    const basePx = frames.findLast((f) => f.t <= last && f.px)?.px;
                    const seenPx = basePx && frames.find((f) => f.t > last && f.px && differs(f.px, basePx));
                    const shown = seenPx ?? seen;
                    const next = shown && frames.find((f) => f.t > shown.t);
                    const span = frames.filter((f) => f.t >= inputs[0] && f.t <= (next?.t ?? last));
                    const gaps = span.slice(1).map((f, i) => f.t - span[i].t);
                    const drops = gaps.reduce((a, g) => a + Math.max(0, Math.round(g / (1000 / 60)) - 1), 0);
                    // The rate over the inputs sent back to back (the last waits for the page, then for tail()).
                    const inSpan = (sent.at(-1) ?? last) - inputs[0];
                    return {
                        ms: next ? +(next.t - last).toFixed(1) : null,
                        stateMs: seen ? +(seen.t - last).toFixed(1) : null,
                        pixMs: seenPx ? +(seenPx.t - last).toFixed(1) : null,
                        noVisible: !!seen && !seenPx && !!pix,
                        endsOn: seenPx ? "pixels" : "state",
                        drops,
                        maxGapMs: gaps.length ? +Math.max(...gaps).toFixed(1) : null,
                        inputs: inputs.length,
                        spanMs: +inSpan.toFixed(1),
                        achievedHz:
                            sent.length > 1 && inSpan > 0 ? +(((sent.length - 1) * 1000) / inSpan).toFixed(1) : null,
                        idlePeriodMs: globalThis.__lat.period ?? null,
                        sawInput: true,
                        timeout: !shown,
                        capMs: 10000,
                    };
                },
            };
        },
        // The frame period: the median gap over 30 idle frames.
        async measurePeriod() {
            const ts = [];
            for (let i = 0; i < 31; i++) {
                await raf();
                ts.push(performance.now());
            }
            const g = ts
                .slice(1)
                .map((t, i) => t - ts[i])
                .sort((a, b) => a - b);
            globalThis.__lat.period = g[15];
            return g[15];
        },
        // Untimed: up to `frames` frames until `cond` holds.
        async until(cond, params, frames = 600) {
            // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
            const test = new Function("el", "p", `return (${cond});`);
            for (let i = 0; i < frames; i++) {
                // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                if (test(el(), params ?? {})) return true;
                await raf();
            }
            return false;
        },
        // Untimed: until the camera holds still for three frames, up to `frames` frames.
        async camStill(frames = 300) {
            let last = cam(),
                same = 0;
            for (let i = 0; i < frames && same < 3; i++) {
                await raf();
                const now = cam();
                same = now === last ? same + 1 : 0;
                last = now;
            }
            return same >= 3;
        },
        frames: async (k) => {
            for (let i = 0; i < k; i++) await raf();
        },
    };
};

/**
 * One timed input: arm the probe, act, read the result.
 * @param {import("playwright").Page} page - The page.
 * @param {object} spec - type (the input event), cond, params, event, pix, settle.
 * @param {() => Promise<void>} act - The real input.
 * @returns {Promise<object>} The measurement.
 */
async function timed(page, spec, act) {
    // While a layout moves every node, every pixel changes every frame, so "the box changed" proves nothing: such a
    // phase reads the look's own color at the node's position each frame (`moving`), or ends on state alone.
    const s = STATE_ONLY.has(page) ? { ...spec, pix: undefined, look: spec.look ?? spec.moving } : spec;
    await page.evaluate((a) => globalThis.__lat.arm(a), { capMs: CAP_MS, ...s });
    await act();
    return page.evaluate(() => globalThis.__lat.result());
}
const STATE_ONLY = new WeakSet();
// A drag's moves after the first, which only crosses the drag threshold; a first move that timed out is kept, so a
// drag that never moves anything is recorded as a timeout, not as no samples.
const afterFirst = (out) => (out.length === 1 && out[0].timeout ? out : out.slice(1));
const until = (page, cond, params, frames) =>
    page.evaluate(([c, p, f]) => globalThis.__lat.until(c, p, f), [cond, params ?? {}, frames ?? 600]);
const camStill = (page) => page.evaluate(() => globalThis.__lat.camStill());
const frames = (page, k) => page.evaluate((n) => globalThis.__lat.frames(n), k);
const SEL_IS = "el.session.selection.nodes.length === 1 && String(el.session.selection.nodes[0]) === p.id";
const CAM_MOVED = "JSON.stringify(el.getCameraState()) !== s.cam0";
const CAM = "el.getCameraState()";
// A node's look, as the styles resolve it: its color, or null.
const COLOR_OF = (id) =>
    `(() => { const v = el.session.styles.explain({ node: ${JSON.stringify(id)} }).merged['node.color']; return v ? String(v.hex ?? v).toUpperCase() : null; })()`;
const at = (t, w = 14, h = 14) => ({ x: t.x, y: t.y, w, h });
// Where a tooltip can be drawn: a wide box around and above the point.
const tipBox = (t) => ({ x: t.x, y: t.y - 40, w: 280, h: 160 });

// ------------------------------------------------------------------ the browser

function serve(dir) {
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
    const types2 = { ".wasm": "application/wasm", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };
    const http = createServer(async (req, res) => {
        const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""); // eslint-disable-line sonarjs/no-clear-text-protocols -- parses the request's path; the server is loopback only
        const f = join(dir, path);
        if (f !== dir && !f.startsWith(dir + sep)) return res.writeHead(403).end();
        const body = await readFile(f).catch(() => null);
        if (body) {
            const type = types[extname(f)] ?? types2[extname(f)] ?? "application/octet-stream";
            return res.writeHead(200, { "content-type": type }).end(body);
        }
        if (extname(f)) return res.writeHead(404).end();
        res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(dir, "index.html")));
    });
    return new Promise((ok) => http.listen(0, "127.0.0.1", () => ok(http)));
}

async function launch(viewport, dpr = 1) {
    const { chromium } = createRequire(join(REPO, "visual-review/package.json"))("playwright");
    if (!SMOKE && !existsSync(join(EGL, "libEGL.so.1"))) throw new Error(`no libEGL.so.1 in ${EGL}`);
    const profiles = join(HERE, "profiles");
    mkdirSync(profiles, { recursive: true });
    const udd = mkdtempSync(join(profiles, "lat-"));
    const ctx = await chromium.launchPersistentContext(udd, {
        args: SMOKE
            ? ["--enable-unsafe-swiftshader", "--enable-unsafe-webgpu", "--js-flags=--max-old-space-size=16384"]
            : [
                  "--enable-unsafe-webgpu",
                  "--enable-features=Vulkan",
                  "--use-angle=vulkan",
                  "--disable-vulkan-surface",
                  "--js-flags=--max-old-space-size=16384",
              ],
        env: SMOKE
            ? { ...process.env, FC_FONTATIONS: "1" }
            : { ...process.env, FC_FONTATIONS: "1", LD_LIBRARY_PATH: EGL },
        viewport,
        deviceScaleFactor: dpr,
        acceptDownloads: true,
    });
    await ctx.addInitScript(PROBE);
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    page.setDefaultTimeout(600000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.split("\n")[0].slice(0, 200)));
    const close = async () => {
        await ctx.close().catch(() => {});
        rmSync(udd, { recursive: true, force: true });
    };
    return { ctx, page, errors, close };
}

async function rendererOf(page) {
    return page.evaluate(() => {
        const g = document.createElement("canvas").getContext("webgl2");
        const e = g?.getExtension("WEBGL_debug_renderer_info");
        return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "no WebGL";
    });
}

function checkRenderer(renderer) {
    if (!SMOKE && !/NVIDIA/i.test(renderer)) throw new Error("void: renderer is " + renderer);
}

// ------------------------------------------------------------------ points on the canvas (page pixels)

/** Two or more nodes the element itself picks at their drawn centers, inside the canvas's middle. */
function nodeTargets(page, k, seed = 11) {
    return page.evaluate(
        ([k, seed]) => {
            const el = document.querySelector("graphty-element");
            const r = el.getBoundingClientRect();
            const ids = el.session.data.nodes().map((n) => n.id);
            let a = seed >>> 0;
            const rnd = () => {
                a = (a * 1664525 + 1013904223) >>> 0;
                return a / 4294967296;
            };
            const out = [];
            const seen = new Set();
            let picks = 0;
            for (let t = 0; out.length < k && t < 20000; t++) {
                const id = ids[Math.floor(rnd() * ids.length)];
                const at = el.nodeScreenPosition(id);
                if (!at?.visible) continue;
                if (at.x < 0.15 * r.width || at.x > 0.85 * r.width || at.y < 0.15 * r.height || at.y > 0.85 * r.height)
                    continue;
                // ponytail: 400 picks at most; a pick costs tens of ms on a software renderer with the heavy look
                if (++picks > 400) break;
                const hit = el.elementAt({ x: at.x, y: at.y });
                if (hit?.kind !== "node" || seen.has(String(hit.id))) continue;
                const top = document.elementFromPoint(r.left + at.x, r.top + at.y);
                if (!(top === el || el.contains(top))) continue;
                seen.add(String(hit.id));
                out.push({ id: String(hit.id), x: r.left + at.x, y: r.top + at.y });
            }
            return out;
        },
        [k, seed],
    );
}

/** Where node `id` is drawn now, in page pixels. */
function whereIs(page, id) {
    return page.evaluate((id) => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        const at = el.nodeScreenPosition(id);
        return { id, x: r.left + at.x, y: r.top + at.y };
    }, id);
}

/** A point no node, edge or outline covers, as the element picks, not under the app's own UI. */
function emptyPoint(page) {
    return page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        const cands = [];
        for (let fy = 0.05; fy < 0.97; fy += 0.04) for (const fx of [0.03, 0.97, 0.1, 0.9, 0.5]) cands.push([fx, fy]);
        for (const [fx, fy] of cands) {
            const p = { x: fx * r.width, y: fy * r.height };
            if (el.elementAt(p) !== null || el.groupOutlineAt?.(p)) continue;
            const top = document.elementFromPoint(r.left + p.x, r.top + p.y);
            if (top === el || el.contains(top)) return { x: r.left + p.x, y: r.top + p.y };
        }
        return null;
    });
}

/** An edge whose middle the element picks as that edge, clear of nodes and of the app's UI. */
function edgeTarget(page, skip = 0) {
    return page.evaluate((skip) => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        const inside = (p) => p.x >= 20 && p.y >= 20 && p.x <= r.width - 20 && p.y <= r.height - 20;
        // ponytail: 400 picks at most; a dense 100k drawing rarely leaves an edge's middle clear, and a pick costs
        // tens of ms on a software renderer
        const budget = { picks: 400 };
        // A point the element picks as edge e and nothing of the page covers: the straight middle, then points
        // off it to either side, since a curved edge bows away from its chord.
        const pointOn = (e, a, b) => {
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const nx = -(b.y - a.y) / len,
                ny = (b.x - a.x) / len;
            for (const off of [0, 10, -10, 20, -20, 35, -35]) {
                const mid = { x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off };
                if (!inside(mid) || budget.picks-- <= 0) continue;
                const hit = el.elementAt(mid);
                const top = document.elementFromPoint(r.left + mid.x, r.top + mid.y);
                if (hit?.kind === "edge" && String(hit.id) === String(e.id) && (top === el || el.contains(top)))
                    return mid;
            }
            return null;
        };
        let n = 0,
            found = 0;
        for (const e of el.session.data.edges()) {
            if (++n > 200000 || budget.picks <= 0) break;
            const [a, b] = [el.nodeScreenPosition(e.source), el.nodeScreenPosition(e.target)];
            if (!a?.visible || !b?.visible || Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 40) continue;
            const mid = pointOn(e, a, b);
            if (mid && found++ >= skip) return { id: String(e.id), x: r.left + mid.x, y: r.top + mid.y };
        }
        return null;
    }, skip);
}

// ------------------------------------------------------------------ the interactions

/**
 * Moves onto a point, untimed, until the element says the pointer is over `id`.
 * @param {import("playwright").Page} page - The page.
 * @param {{x: number, y: number, id: string}} t - The node.
 */
// The untimed set-up steps throw when they did not reach their state, so a case whose set-up failed (a click the
// element dropped on a slow frame) reads as a set-up error, not as a slow or timed-out input.
async function hoverUntimed(page, t) {
    await page.mouse.move(t.x, t.y);
    if (!(await until(page, "String(el.session.selection.hovered) === p.id", { id: t.id }, 600)))
        throw new Error(`set-up: the pointer on node ${t.id} did not hover it`);
}

async function clickEmptyUntimed(page, ctx) {
    // A cold page starts with nothing selected; a click on the canvas would warm the picking a cold input times.
    if (ctx.cold) return;
    await page.mouse.move(ctx.empty.x, ctx.empty.y);
    await frames(page, 2);
    await page.mouse.down();
    await page.mouse.up();
    if (!(await until(page, "el.session.selection.nodes.length === 0 && el.session.selection.edges.length === 0")))
        throw new Error("set-up: a click on empty canvas did not clear the selection");
}

async function selectUntimed(page, t) {
    await hoverUntimed(page, t);
    await page.mouse.down();
    await page.mouse.up();
    if (!(await until(page, SEL_IS, { id: t.id })))
        throw new Error(`set-up: a click on node ${t.id} did not select it`);
}

const clickHere = async (page) => {
    await page.mouse.down();
    await page.mouse.up();
};

/**
 * A drag measured move by move: each move is timed from its pointermove to the frame after the pixels at `pix`
 * changed, with the camera (or `cond`) as the state. The camera is let come to rest before each move, untimed, so
 * inertia from the last move is not counted.
 */
async function measuredDrag(
    page,
    from,
    dx,
    dy,
    moves,
    { button = "left", cond = CAM_MOVED, params, pix = "all" } = {},
) {
    const out = [];
    await page.mouse.move(from.x, from.y);
    await frames(page, 2);
    await page.mouse.down({ button });
    let x = from.x,
        y = from.y;
    for (let i = 0; i < moves; i++) {
        await camStill(page);
        x += dx;
        y += dy;
        const p = typeof params === "function" ? await params(x, y) : params;
        const px = typeof pix === "function" ? pix(x, y) : pix;
        const r = await timed(page, { type: "pointermove", cond, params: p, pix: px }, () => page.mouse.move(x, y));
        out.push(r);
        if (r.timeout) break; // the drag does nothing here (a menu took the button); one cap is enough
    }
    await page.mouse.up({ button });
    await camStill(page);
    return out;
}

/**
 * A burst of inputs at `hz`: `send(i)` sends input i of `count` through the page's CDP session (`ctx.cdp`) without
 * waiting for the page to handle it, so a slow page cannot slow the sender (Playwright's mouse waits for each). The
 * in-page recorder reports the lag from the last input to the frame showing it, the rate the page received, and
 * the frames dropped during the burst.
 */
async function burst(page, { type, track, params, hz, count, send, before, after, pix = true }) {
    await page.evaluate(() => globalThis.__lat.measurePeriod());
    if (before) await before();
    await page.evaluate((a) => (globalThis.__burst = globalThis.__lat.burst(a)), { type, track, params, pix });
    const period = 1000 / hz;
    const t0 = performance.now();
    const sent = [];
    for (let i = 0; i < count - 1; i++) {
        sent.push(send(i));
        const wait = t0 + (i + 1) * period - performance.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    const sentHz = +(((count - 2) * 1000) / (performance.now() - t0 - period)).toFixed(1);
    // Each input is answered once the page has handled it: then the pixels before the last input are read, the
    // last is sent, and counting stops before the burst's own release.
    await Promise.all(sent);
    await page.evaluate(() => globalThis.__burst.tail());
    await send(count - 1);
    await page.evaluate(() => globalThis.__burst.close());
    if (after) await after();
    const r = await page.evaluate(() => globalThis.__burst.end());
    return { ...r, hz, sentHz };
}

// Raw mouse input for bursts: a move (with `button` held, or none) or a wheel tick, as Playwright's mouse sends it.
const BUTTONS = { none: 0, left: 1, right: 2 };
const rawMove = (cdp, x, y, button = "none") =>
    cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        button,
        buttons: BUTTONS[button],
        // As Playwright sends a move with a button held: a pressed pointer has pressure.
        force: button === "none" ? 0 : 0.5,
    });
const rawWheel = (cdp, x, y, deltaY, modifiers = 0) =>
    cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY, modifiers });
/**
 * Lets go of a button held through a burst, where the burst left the pointer (Playwright's mouse thinks it is
 * still where it pressed).
 */
const releaseAt = async (page, x, y, button = "left") => {
    await page.mouse.move(x, y);
    await page.mouse.up({ button });
};

const NODE_AT = (id) =>
    `(() => { const a = el.nodeScreenPosition(${JSON.stringify(id)}); return a ? [Math.round(a.x), Math.round(a.y)] : null; })()`;

function bursts(hzs) {
    const out = [];
    for (const hz of hzs) {
        out.push(
            {
                id: `burst-drag-node-${hz}hz`,
                name: `Drag a node, ${hz} pointer moves a second (lag after the last move; dropped frames)`,
                async run(page, ctx, rep) {
                    const t = (await nodeTargets(page, 1, 1500 + rep))[0];
                    if (!t) return { skip: "no node to drag" };
                    const dir = t.x < 600 ? 1 : -1;
                    const xAt = (i) => t.x + dir * (6 + 4 * (i + 1));
                    await page.mouse.move(t.x, t.y);
                    await frames(page, 2);
                    await page.mouse.down();
                    await page.mouse.move(t.x + 6 * dir, t.y);
                    await frames(page, 3);
                    const r = await burst(page, {
                        type: "pointermove",
                        track: NODE_AT(t.id),
                        hz,
                        count: 30,
                        send: (i) => rawMove(ctx.cdp, xAt(i), t.y + (i % 2), "left"),
                    });
                    await releaseAt(page, xAt(29), t.y + 1);
                    await camStill(page);
                    return r;
                },
            },
            {
                id: `burst-orbit-${hz}hz`,
                name: `Orbit (3D) or pan (2D) by left-drag, ${hz} moves a second`,
                async run(page, ctx, rep) {
                    const s = ctx.empty;
                    const dir = rep % 2 ? -1 : 1;
                    const at = (i) => [s.x + dir * 4 * (i + 1), s.y + (i % 3)];
                    return burst(page, {
                        type: "pointermove",
                        track: CAM,
                        hz,
                        count: 30,
                        before: async () => {
                            await page.mouse.move(s.x, s.y);
                            await camStill(page);
                            await page.mouse.down();
                        },
                        send: (i) => rawMove(ctx.cdp, ...at(i), "left"),
                        after: () => releaseAt(page, ...at(29)),
                    });
                },
            },
            {
                id: `burst-pan-${hz}hz`,
                name: `Pan (right-drag in 3D, left-drag in 2D), ${hz} moves a second`,
                async run(page, ctx, rep) {
                    const s = ctx.empty;
                    const button = ctx.dim === "3d" ? "right" : "left";
                    const dir = rep % 2 ? -1 : 1;
                    const at = (i) => [s.x + (i % 3), s.y + dir * 4 * (i + 1)];
                    return burst(page, {
                        type: "pointermove",
                        track: CAM,
                        hz,
                        count: 30,
                        before: async () => {
                            await page.mouse.move(s.x, s.y);
                            await camStill(page);
                            await page.mouse.down({ button });
                        },
                        send: (i) => rawMove(ctx.cdp, ...at(i), button),
                        after: () => releaseAt(page, ...at(29), button),
                    });
                },
            },
            {
                id: `burst-wheel-${hz}hz`,
                name: `Mouse wheel, ${hz} ticks a second`,
                async run(page, ctx, rep) {
                    // The 60 and 120 Hz bursts go opposite ways, so zooming never runs into its limit.
                    const dir = (rep + (hz === 120 ? 1 : 0)) % 2 ? 1 : -1;
                    return burst(page, {
                        type: "wheel",
                        track: CAM,
                        hz,
                        count: 20,
                        before: async () => {
                            await page.mouse.move(ctx.center.x, ctx.center.y);
                            await camStill(page);
                        },
                        send: () => rawWheel(ctx.cdp, ctx.center.x, ctx.center.y, dir * 40),
                    });
                },
            },
            {
                id: `burst-hover-sweep-${hz}hz`,
                name: `Sweep the pointer across the drawing onto a node, ${hz} moves a second (hovered node)`,
                async run(page, ctx, rep) {
                    const t = ctx.nodes[rep % 2];
                    const from = { x: t.x - 300 * (t.x > ctx.center.x ? 1 : -1), y: t.y - 60 };
                    return burst(page, {
                        type: "pointermove",
                        track: "String(el.session.selection.hovered)",
                        hz,
                        count: 30,
                        before: async () => {
                            await page.mouse.move(from.x, from.y);
                            await frames(page, 3);
                        },
                        // 29 moves to a point 60 px short of the node, then the last one onto it: the hovered node
                        // changes after the last input, which is what the burst times.
                        send: (i) => {
                            const dx = t.x - from.x,
                                dy = t.y - from.y;
                            const len = Math.hypot(dx, dy);
                            const f = i < 29 ? ((i + 1) / 29) * ((len - 60) / len) : 1;
                            return rawMove(ctx.cdp, from.x + dx * f, from.y + dy * f);
                        },
                        after: () => page.mouse.move(t.x, t.y),
                    });
                },
            },
            {
                id: `burst-trackpad-scroll-${hz}hz`,
                name: `Trackpad two-finger scroll: small wheel deltas, ${hz} a second`,
                async run(page, ctx, rep) {
                    const dir = (rep + (hz === 120 ? 1 : 0)) % 2 ? 1 : -1;
                    return burst(page, {
                        type: "wheel",
                        track: CAM,
                        hz,
                        count: 30,
                        before: async () => {
                            await page.mouse.move(ctx.center.x, ctx.center.y);
                            await camStill(page);
                        },
                        send: (i) => rawWheel(ctx.cdp, ctx.center.x, ctx.center.y, dir * (2 + (i % 3))),
                    });
                },
            },
            {
                id: `burst-pinch-wheel-${hz}hz`,
                name: `Trackpad pinch (Ctrl+wheel), ${hz} events a second`,
                async run(page, ctx, rep) {
                    // The 60 and 120 Hz bursts go opposite ways, so zooming never runs into its limit.
                    const dir = (rep + (hz === 120 ? 1 : 0)) % 2 ? 1 : -1;
                    return burst(page, {
                        type: "wheel",
                        track: CAM,
                        hz,
                        count: 20,
                        before: async () => {
                            await page.mouse.move(ctx.center.x, ctx.center.y);
                            await camStill(page);
                        },
                        // Ctrl as the wheel event's own modifier, as a trackpad pinch arrives.
                        send: () => rawWheel(ctx.cdp, ctx.center.x, ctx.center.y, dir * 6, 2),
                    });
                },
            },
        );
    }
    return out;
}

const elementRect = (page) =>
    page.evaluate(() => {
        const r = document.querySelector("graphty-element").getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    });
// The node is drawn within `tol` px of p.x, p.y (element pixels).
const NEAR = (tol) =>
    `(() => { const a = el.nodeScreenPosition(p.id); return !!a && Math.hypot(a.x - p.x, a.y - p.y) <= ${tol}; })()`;
// Settled: the camera state is the same as on the frame before (s keeps the last one).
const CAM_HELD =
    "(() => { const c = JSON.stringify(el.getCameraState()); const held = c === s.lastCam; s.lastCam = c; return held; })()";

/** A node drag measured move by move, to the frame whose pixels under the pointer show the node. */
async function dragNode(page, t, moves) {
    const rect = await elementRect(page);
    const dir = t.x < rect.left + rect.width / 2 ? 1 : -1;
    const r = await measuredDrag(page, t, 10 * dir, 0, moves, {
        cond: NEAR(2),
        params: (x, y) => ({ id: t.id, x: x - rect.left, y: y - rect.top }),
        pix: (x, y) => ({ x, y, w: 30, h: 30 }),
    });
    return afterFirst(r);
}

/** The highest-degree node of `k` pickable ones (degree counted over the element's edges). */
async function hubTarget(page, k = 40) {
    const ts = await nodeTargets(page, k, 77);
    if (!ts.length) return null;
    const deg = await page.evaluate(
        (ids) => {
            const want = new Set(ids);
            const d = Object.fromEntries(ids.map((i) => [i, 0]));
            for (const e of document.querySelector("graphty-element").session.data.edges()) {
                if (want.has(String(e.source))) d[String(e.source)]++;
                if (want.has(String(e.target))) d[String(e.target)]++;
            }
            return d;
        },
        ts.map((t) => t.id),
    );
    return ts.reduce((a, b) => (deg[b.id] > deg[a.id] ? b : a));
}

/** Sets graphty-element's behavior option `key` (a public property), merged into what is there. */
const setBehavior = (page, key, value) =>
    page.evaluate(
        ([k, v]) => {
            const el = document.querySelector("graphty-element");
            el.layoutBehavior = { ...el.layoutBehavior, [k]: { ...el.layoutBehavior?.[k], ...v } };
        },
        [key, value],
    );

// Pen input: CDP mouse events with pointerType "pen" (Playwright has no pen).
const pen = (cdp, type, p, buttons = 0) =>
    cdp.send("Input.dispatchMouseEvent", {
        type,
        x: p.x,
        y: p.y,
        button: type === "mouseMoved" && !buttons ? "none" : "left",
        buttons,
        clickCount: type === "mouseMoved" ? 0 : 1,
        pointerType: "pen",
    });

// A held key's auto-repeat, which Playwright cannot send: CDP key events with autoRepeat.
const KEYS = { ArrowLeft: 37, ArrowRight: 39 };
const cdpKey = (cdp, type, key, autoRepeat = false) =>
    cdp.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: KEYS[key],
        nativeVirtualKeyCode: KEYS[key],
        autoRepeat,
    });

const ELEMENT = [
    {
        id: "hover-node",
        name: "Hover a node",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await until(page, "el.session.selection.hovered === null");
            await frames(page, 2);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "String(el.session.selection.hovered) === p.id",
                    params: { id: t.id },
                    event: "graphty-node-hover",
                    pix: at(t, 40, 40),
                },
                () => page.mouse.move(t.x, t.y),
            );
        },
    },
    {
        id: "pointer-leaves-node",
        name: "Move the pointer off a node",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await hoverUntimed(page, t);
            await frames(page, 3);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "el.session.selection.hovered === null",
                    pix: at(t, 40, 40),
                    moving: ctx.hoverRgb && { id: t.id, rgb: ctx.hoverRgb, absent: true },
                },
                () => page.mouse.move(ctx.empty.x, ctx.empty.y),
            );
        },
    },
    {
        id: "hover-edge",
        name: "Hover an edge",
        async run(page, ctx, rep) {
            const e = ctx.edges[rep % ctx.edges.length];
            if (!e) return { skip: "no edge whose middle is clear of nodes" };
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await frames(page, 3);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "s.tEvent !== null && String(s.detail?.edgeId) === p.id",
                    params: { id: e.id },
                    event: "graphty-edge-hover",
                    pix: at(e, 30, 30),
                },
                () => page.mouse.move(e.x, e.y),
            );
        },
    },
    {
        id: "click-select-node",
        name: "Click a node to select it",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await hoverUntimed(page, t);
            await frames(page, 3);
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id }, pix: at(t, 40, 40) }, () =>
                clickHere(page),
            );
        },
    },
    {
        id: "shift-click-add-node",
        name: "Shift-click a second node to add it",
        async run(page, ctx) {
            const [a, b] = ctx.nodes;
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, a);
            await page.keyboard.down("Shift");
            await hoverUntimed(page, b);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                    pix: at(b, 40, 40),
                },
                () => clickHere(page),
            );
            await page.keyboard.up("Shift");
            return r;
        },
    },
    {
        id: "ctrl-click-toggle-node",
        name: "Ctrl-click a selected node to take it out",
        async run(page, ctx) {
            const [a, b0] = ctx.nodes;
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, a);
            // In the app a selection starts the Focus selected glide: find the second node where it is drawn now.
            await camStill(page);
            let b = await whereIs(page, b0.id);
            await page.keyboard.down("Shift");
            await hoverUntimed(page, b);
            await clickHere(page);
            await page.keyboard.up("Shift");
            await until(page, "el.session.selection.has(p.b)", { b: b.id });
            await camStill(page);
            b = await whereIs(page, b0.id);
            await hoverUntimed(page, b);
            await frames(page, 3);
            await page.keyboard.down("Control");
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && !el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                    pix: at(b, 40, 40),
                },
                () => clickHere(page),
            );
            await page.keyboard.up("Control");
            return r;
        },
    },
    {
        id: "click-select-edge",
        name: "Click an edge to select it",
        async run(page, ctx, rep) {
            const e = ctx.edges[rep % ctx.edges.length];
            if (!e) return { skip: "no edge whose middle is clear of nodes" };
            await clickEmptyUntimed(page, ctx);
            await page.mouse.move(e.x, e.y);
            await frames(page, 3);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.edges.map(String).includes(p.id)",
                    params: e,
                    pix: at(e, 30, 30),
                },
                () => clickHere(page),
            );
        },
    },
    {
        id: "click-empty-deselect",
        name: "Click empty canvas to clear the selection",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await selectUntimed(page, t);
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await frames(page, 3);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.nodes.length === 0",
                    pix: at(t, 40, 40),
                    moving: ctx.selRgb && { id: t.id, rgb: ctx.selRgb, absent: true, w: 50, h: 50 },
                },
                () => clickHere(page),
            );
        },
    },
    {
        id: "right-click-node",
        name: "Right-click an unselected node (selects it)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await hoverUntimed(page, t);
            await frames(page, 3);
            return timed(
                page,
                { type: "pointerdown", cond: SEL_IS, params: { id: t.id }, pix: at(t, 40, 40) },
                async () => {
                    await page.mouse.down({ button: "right" });
                    await page.mouse.up({ button: "right" });
                },
            );
        },
    },
    {
        id: "drag-node",
        name: "Drag a node (per pointer move)",
        moves: 10,
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 500 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            return dragNode(page, t, this.moves);
        },
    },
    {
        id: "drop-node",
        name: "Let go of a dragged node (it is drawn pinned: the Pinned look's halo at the node)",
        event: true,
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 900 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            await page.mouse.move(t.x, t.y);
            await frames(page, 2);
            await page.mouse.down();
            for (let i = 1; i <= 5; i++) {
                await page.mouse.move(t.x + 8 * i, t.y);
                await frames(page, 1);
            }
            await frames(page, 3);
            const now = await whereIs(page, t.id);
            return timed(
                page,
                {
                    type: "pointerup",
                    cond: "s.tEvent !== null",
                    event: "graphty-node-drag-end",
                    pix: at(now, 50, 50),
                },
                () => page.mouse.up(),
            );
        },
    },
    {
        id: "drag-orbit-3d",
        name: "Left-drag empty canvas to orbit (per pointer move)",
        dims: ["3d"],
        moves: 10,
        run: (page, ctx, rep) => measuredDrag(page, ctx.empty, rep % 2 ? -8 : 8, 0, 10),
    },
    {
        id: "drag-pan",
        name: "Pan: right-drag in 3D, left-drag in 2D (per pointer move)",
        moves: 10,
        run: (page, ctx, rep) =>
            measuredDrag(page, ctx.empty, 0, rep % 2 ? -8 : 8, 10, { button: ctx.dim === "3d" ? "right" : "left" }),
    },
    {
        id: "wheel-zoom",
        name: "One mouse-wheel tick",
        async run(page, ctx, rep) {
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await camStill(page);
            return timed(page, { type: "wheel", cond: CAM_MOVED, pix: "all" }, () =>
                page.mouse.wheel(0, rep % 2 ? 120 : -120),
            );
        },
    },
    {
        id: "pinch-ctrl-wheel",
        name: "Trackpad pinch (Ctrl+wheel)",
        async run(page, ctx, rep) {
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await camStill(page);
            await page.keyboard.down("Control");
            const r = await timed(page, { type: "wheel", cond: CAM_MOVED, pix: "all" }, () =>
                page.mouse.wheel(0, rep % 2 ? 10 : -10),
            );
            await page.keyboard.up("Control");
            return r;
        },
    },
    {
        id: "key-camera-turn-or-pan",
        name: "Arrow key on the focused canvas (3D turns, 2D pans)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            const key = rep % 2 ? "ArrowRight" : "ArrowLeft";
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.down(key),
            );
            await page.keyboard.up(key);
            await camStill(page);
            return r;
        },
    },
    {
        id: "key-camera-zoom",
        name: "Zoom key on the focused canvas (W / S in 3D, = / - in 2D)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            const key = { "3d": ["w", "s"], "2d": ["=", "-"] }[ctx.dim][rep % 2];
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.down(key),
            );
            await page.keyboard.up(key);
            await camStill(page);
            return r;
        },
    },
    {
        id: "region-select",
        name: "Shift-drag a rectangle, release to select (element option)",
        async run(page, ctx) {
            await page.evaluate(() => {
                const el = document.querySelector("graphty-element");
                el.layoutBehavior = { ...el.layoutBehavior, selection: { region: "rectangle" } };
            });
            await clickEmptyUntimed(page, ctx);
            const to = ctx.center;
            await page.keyboard.down("Shift");
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await page.mouse.down();
            for (let i = 1; i <= 8; i++) {
                await page.mouse.move(
                    ctx.empty.x + ((to.x - ctx.empty.x) * i) / 8,
                    ctx.empty.y + ((to.y - ctx.empty.y) * i) / 8,
                );
                await frames(page, 1);
            }
            await frames(page, 3);
            const r = await timed(
                page,
                { type: "pointerup", cond: "el.session.selection.nodes.length > 0", pix: "all" },
                () => page.mouse.up(),
            );
            await page.keyboard.up("Shift");
            await clickEmptyUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "minimap-click",
        name: "Click in the minimap (element option)",
        async run(page, ctx, rep) {
            const box = await page.evaluate(async () => {
                const el = document.querySelector("graphty-element");
                el.minimap = true;
                for (let i = 0; i < 30 && !el.shadowRoot.querySelector("[part~=minimap]"); i++)
                    await new Promise((r) => requestAnimationFrame(r));
                const m = el.shadowRoot.querySelector("[part~=minimap]");
                if (!m) return null;
                const r = m.getBoundingClientRect();
                return { x: r.left, y: r.top, w: r.width, h: r.height };
            });
            if (!box || box.w < 10) return { skip: "no minimap drawn" };
            await camStill(page);
            const f = rep % 2 ? 0.3 : 0.7;
            return timed(page, { type: "pointerdown", cond: CAM_MOVED, pix: "all" }, () =>
                page.mouse.click(box.x + f * box.w, box.y + f * box.h),
            );
        },
    },
    {
        id: "node-list-walk",
        name: "Keyboard walk of the accessible node list (ArrowDown; element option; DOM only)",
        async run(page) {
            const ok = await page.evaluate(async () => {
                const el = document.querySelector("graphty-element");
                el.accessibleNodeList = true;
                for (let i = 0; i < 60 && !el.shadowRoot.querySelector("[part~=node-list]"); i++)
                    await new Promise((r) => requestAnimationFrame(r));
                const list = el.shadowRoot.querySelector("[part~=node-list]");
                list?.focus();
                return !!list && el.shadowRoot.activeElement === list;
            });
            if (!ok) return { skip: "the node list did not take focus" };
            const before = await page.evaluate(() =>
                document
                    .querySelector("graphty-element")
                    .shadowRoot.querySelector("[part~=node-list]")
                    .getAttribute("aria-activedescendant"),
            );
            return timed(
                page,
                {
                    type: "keydown",
                    cond: "el.shadowRoot.querySelector('[part~=node-list]').getAttribute('aria-activedescendant') !== p.before",
                    params: { before },
                },
                () => page.keyboard.press("ArrowDown"),
            );
        },
    },
    {
        id: "node-list-select",
        name: "Enter on the accessible node list selects the node (element option)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const ok = await page.evaluate(() => {
                const el = document.querySelector("graphty-element");
                el.accessibleNodeList = true;
                const list = el.shadowRoot.querySelector("[part~=node-list]");
                list?.focus();
                return !!list && el.shadowRoot.activeElement === list;
            });
            if (!ok) return { skip: "the node list did not take focus" };
            await page.keyboard.press("ArrowDown");
            await frames(page, 3);
            return timed(page, { type: "keydown", cond: "el.session.selection.nodes.length === 1", pix: "all" }, () =>
                page.keyboard.press("Enter"),
            );
        },
    },
];

// The rest of the catalog's canvas inputs (INPUT-CATALOG.md, section 2).
const ELEMENT_MORE = [
    {
        id: "hover-neighbor",
        name: "Move the pointer straight from one node onto another",
        async run(page, ctx, rep) {
            const [a, b] = rep % 2 ? [ctx.nodes[1], ctx.nodes[0]] : ctx.nodes;
            await hoverUntimed(page, a);
            await frames(page, 3);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "String(el.session.selection.hovered) === p.id",
                    params: { id: b.id },
                    pix: at(b, 40, 40),
                },
                () => page.mouse.move(b.x, b.y),
            );
        },
    },
    {
        id: "pointer-leaves-element",
        name: "Move the pointer from a node out of the element",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            if (!ctx.outside) return { skip: "no point outside the element in the viewport" };
            await hoverUntimed(page, t);
            await frames(page, 3);
            return timed(
                page,
                { type: "pointermove", cond: "el.session.selection.hovered === null", pix: at(t, 40, 40) },
                () => page.mouse.move(ctx.outside.x, ctx.outside.y),
            );
        },
    },
    {
        id: "pen-hover",
        name: "Pen hover onto a node",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            await pen(cdp, "mouseMoved", ctx.empty);
            await until(page, "el.session.selection.hovered === null");
            await frames(page, 2);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "String(el.session.selection.hovered) === p.id",
                    params: { id: t.id },
                    pix: at(t, 40, 40),
                },
                () => pen(cdp, "mouseMoved", t),
            );
        },
    },
    {
        id: "pen-tap-select",
        name: "Pen tap on a node selects it",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await pen(cdp, "mouseMoved", t);
            await frames(page, 3);
            return timed(
                page,
                { type: "pointerdown", cond: SEL_IS, params: { id: t.id }, pix: at(t, 40, 40) },
                async () => {
                    await pen(cdp, "mousePressed", t, 1);
                    await pen(cdp, "mouseReleased", t);
                },
            );
        },
    },
    {
        id: "pen-drag-node",
        name: "Pen drag a node (per move)",
        moves: 8,
        async run(page, ctx, rep, cdp) {
            const t = (await nodeTargets(page, 1, 1700 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            const rect = await elementRect(page);
            const dir = t.x < rect.left + rect.width / 2 ? 1 : -1;
            await pen(cdp, "mouseMoved", t);
            await frames(page, 2);
            await pen(cdp, "mousePressed", t, 1);
            const out = [];
            let x = t.x;
            for (let i = 0; i < this.moves; i++) {
                await camStill(page);
                x += 10 * dir;
                const p = { x, y: t.y };
                out.push(
                    await timed(
                        page,
                        {
                            type: "pointermove",
                            cond: NEAR(2),
                            params: { id: t.id, x: x - rect.left, y: t.y - rect.top },
                            pix: { x, y: t.y, w: 30, h: 30 },
                        },
                        () => pen(cdp, "mouseMoved", p, 1),
                    ),
                );
                if (out.at(-1).timeout) break;
            }
            await pen(cdp, "mouseReleased", { x, y: t.y });
            await camStill(page);
            return afterFirst(out);
        },
    },
    ...[
        ["shift-click-add-edge", "Shift", "Shift-click a second edge to add it", true],
        ["ctrl-click-toggle-edge", "Control", "Ctrl-click a selected edge to take it out", false],
    ].map(([id, key, name, adds]) => ({
        id,
        name,
        async run(page, ctx) {
            const [a, b] = ctx.edges;
            if (!b) return { skip: "fewer than two edges whose middles are clear of nodes" };
            await clickEmptyUntimed(page, ctx);
            // A frame or more between moving and pressing: on the batched path the pick under the pointer is read
            // back a frame later, and a press before it picks what was there before.
            await page.mouse.move(a.x, a.y);
            await frames(page, 3);
            await clickHere(page);
            await until(page, "el.session.selection.edges.map(String).includes(p.id)", { id: a.id });
            if (!adds) {
                await page.keyboard.down("Shift");
                await page.mouse.move(b.x, b.y);
                await frames(page, 3);
                await clickHere(page);
                await page.keyboard.up("Shift");
                await until(page, "el.session.selection.edges.map(String).includes(p.id)", { id: b.id });
            }
            await page.mouse.move(b.x, b.y);
            await frames(page, 3);
            await page.keyboard.down(key);
            const has = "el.session.selection.edges.map(String).includes(p.b)";
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: adds ? has : `!${has}`,
                    params: { b: b.id },
                    pix: at(b, 30, 30),
                },
                () => clickHere(page),
            );
            await page.keyboard.up(key);
            return r;
        },
    })),
    ...[
        ["right-click-edge", "edge"],
        ["right-click-empty", "empty"],
    ].map(([id, what]) => ({
        id,
        name: `Right-click ${what === "edge" ? "an edge" : "empty canvas"} (the host's contextmenu event; selection kept)`,
        async run(page, ctx) {
            const p = what === "edge" ? ctx.edges[0] : ctx.empty;
            if (!p) return { skip: "no edge whose middle is clear of nodes" };
            await page.mouse.move(p.x, p.y);
            await frames(page, 3);
            return timed(page, { type: "pointerdown", cond: "s.tEvent !== null", event: "contextmenu" }, async () => {
                await page.mouse.down({ button: "right" });
                await page.mouse.up({ button: "right" });
            });
        },
    })),
    {
        id: "drag-hub-node",
        name: "Drag the highest-degree node in view (per pointer move)",
        moves: 10,
        async run(page) {
            const t = await hubTarget(page);
            if (!t) return { skip: "no node to drag" };
            return dragNode(page, t, this.moves);
        },
    },
    {
        id: "undo-while-dragging",
        name: "Ctrl+Z while still holding a dragged node (drawn back where the drag began)",
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 2100 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            const rect = await elementRect(page);
            await page.mouse.move(t.x, t.y);
            await frames(page, 2);
            await page.mouse.down();
            for (let i = 1; i <= 5; i++) {
                await page.mouse.move(t.x + 8 * i, t.y);
                await frames(page, 1);
            }
            await until(page, NEAR(3), { id: t.id, x: t.x + 40 - rect.left, y: t.y - rect.top }, 120);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: NEAR(3),
                    params: { id: t.id, x: t.x - rect.left, y: t.y - rect.top },
                    pix: at(t, 30, 30),
                },
                () => page.keyboard.press("Control+z"),
            );
            await page.mouse.up();
            await camStill(page);
            return r;
        },
    },
    ...[
        ["undo-node-move", "Control+z", "Ctrl+Z after moving a node (drawn back where it was)"],
        ["redo-node-move", "Control+Shift+z", "Shift+Ctrl+Z after undoing a node move (drawn moved again)"],
    ].map(([id, key, name]) => ({
        id,
        name,
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 2300 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            const rect = await elementRect(page);
            await page.mouse.move(t.x, t.y);
            await frames(page, 2);
            await page.mouse.down();
            for (let i = 1; i <= 5; i++) {
                await page.mouse.move(t.x + 8 * i, t.y);
                await frames(page, 1);
            }
            await page.mouse.up();
            const moved = { id: t.id, x: t.x + 40 - rect.left, y: t.y - rect.top };
            const home = { id: t.id, x: t.x - rect.left, y: t.y - rect.top };
            if (!(await until(page, NEAR(3), moved, 600)))
                return { skip: "the dragged node did not follow the pointer" };
            await camStill(page);
            if (id === "redo-node-move") {
                await page.keyboard.press("Control+z");
                if (!(await until(page, NEAR(3), home, 600))) return { skip: "Ctrl+Z did not undo the node move" };
            }
            const want = id === "redo-node-move" ? moved : home;
            return timed(
                page,
                {
                    type: "keydown",
                    cond: NEAR(3),
                    params: want,
                    pix: { x: rect.left + want.x, y: rect.top + want.y, w: 30, h: 30 },
                },
                () => page.keyboard.press(key),
            );
        },
    })),
    {
        id: "region-outline-move",
        name: "Shift-drag a rectangle: the outline follows the pointer (per move; DOM)",
        moves: 6,
        async run(page, ctx) {
            await setBehavior(page, "selection", { region: "rectangle" });
            await clickEmptyUntimed(page, ctx);
            const OUTLINE =
                "[...(el.shadowRoot ? [el.shadowRoot, el] : [el])].map((r) => r.querySelector('polygon[stroke-dasharray]')).find(Boolean)?.getAttribute('points') ?? ''";
            await page.keyboard.down("Shift");
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await page.mouse.down();
            const out = [];
            let { x, y } = ctx.empty;
            const dx = (ctx.center.x - x) / 8,
                dy = (ctx.center.y - y) / 8;
            for (let i = 0; i < this.moves + 1; i++) {
                const before = await page.evaluate(
                    `(() => { const el = document.querySelector("graphty-element"); return ${OUTLINE}; })()`,
                );
                x += dx;
                y += dy;
                out.push(
                    await timed(
                        page,
                        { type: "pointermove", cond: `(${OUTLINE}) !== p.before`, params: { before } },
                        () => page.mouse.move(x, y),
                    ),
                );
            }
            await page.keyboard.press("Escape");
            await page.mouse.up();
            await page.keyboard.up("Shift");
            await clickEmptyUntimed(page, ctx);
            return afterFirst(out);
        },
    },
    {
        id: "lasso-select",
        name: "Shift-drag a lasso around nodes, release to select (element option)",
        async run(page, ctx) {
            await setBehavior(page, "selection", { region: "lasso" });
            await clickEmptyUntimed(page, ctx);
            const c = ctx.center;
            const rad = 120;
            await page.keyboard.down("Shift");
            await page.mouse.move(c.x + rad, c.y);
            await page.mouse.down();
            for (let i = 1; i <= 16; i++) {
                const a = (i / 16) * 2 * Math.PI;
                await page.mouse.move(c.x + rad * Math.cos(a), c.y + rad * Math.sin(a));
                await frames(page, 1);
            }
            const r = await timed(
                page,
                { type: "pointerup", cond: "el.session.selection.nodes.length > 0", pix: "all" },
                () => page.mouse.up(),
            );
            await page.keyboard.up("Shift");
            await setBehavior(page, "selection", { region: "rectangle" });
            await clickEmptyUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "drag-pan-middle",
        name: "Middle-drag pan in 3D (per pointer move)",
        dims: ["3d"],
        moves: 10,
        run: (page, ctx, rep) => measuredDrag(page, ctx.empty, 0, rep % 2 ? -8 : 8, 10, { button: "middle" }),
    },
    {
        id: "focus-tab",
        name: "Tab into the canvas (focus on the element)",
        async run(page, ctx) {
            if (!ctx.outside) return { skip: "no point outside the element" };
            await page.mouse.click(ctx.outside.x, ctx.outside.y);
            await page.evaluate(() => document.activeElement?.blur?.());
            await frames(page, 2);
            const r = await timed(page, { type: "keydown", cond: "el.matches(':focus-within')" }, () =>
                page.keyboard.press("Tab"),
            );
            if (r.timeout) return { skip: "Tab from the page start does not reach the element on this page" };
            return r;
        },
    },
    {
        id: "key-camera-roll",
        name: "Roll key on the focused canvas (A / D in 3D, Q / E in 2D)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            const key = { "3d": ["a", "d"], "2d": ["q", "e"] }[ctx.dim][rep % 2];
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.down(key),
            );
            await page.keyboard.up(key);
            await camStill(page);
            return r;
        },
    },
    {
        id: "hold-camera-key-30hz",
        name: "Hold an arrow key (auto-repeat at 30 a second; lag after the last repeat; dropped frames)",
        async run(page, ctx, rep, cdp) {
            const key = rep % 2 ? "ArrowRight" : "ArrowLeft";
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            const r = await burst(page, {
                type: "keydown",
                track: CAM,
                hz: 30,
                count: 30,
                send: (i) => cdpKey(cdp, "keyDown", key, i > 0),
                after: () => cdpKey(cdp, "keyUp", key),
            });
            await camStill(page);
            return r;
        },
    },
    {
        id: "release-camera-key",
        name: "Let go of a held arrow key (camera holds still)",
        async run(page, ctx, rep, cdp) {
            const key = rep % 2 ? "ArrowRight" : "ArrowLeft";
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            for (let i = 0; i < 15; i++) {
                await cdpKey(cdp, "keyDown", key, i > 0);
                await frames(page, 2);
            }
            const r = await timed(page, { type: "keyup", cond: CAM_HELD }, () => cdpKey(cdp, "keyUp", key));
            await camStill(page);
            return r;
        },
    },
    {
        id: "tour-stop-on-press",
        name: "Press the canvas during a camera tour (the camera stops)",
        async run(page, ctx) {
            await page.evaluate(() => {
                const el = document.querySelector("graphty-element");
                globalThis.__tour = el
                    .playTour({
                        stops: [
                            { view: "topView", duration: 4000, hold: 0 },
                            { view: "fitToGraph", duration: 4000, hold: 0 },
                        ],
                    })
                    .catch((e) => ({ reason: String(e?.message ?? e) }));
            });
            const c0 = await camOf(page);
            await until(page, "JSON.stringify(el.getCameraState()) !== p.c0", { c0 }, 120);
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            const r = await timed(page, { type: "pointerdown", cond: CAM_HELD }, () => clickHere(page));
            await page.evaluate(() => globalThis.__tour);
            await ctx.refit?.();
            return r;
        },
    },
    {
        id: "auto-rotate-stop",
        name: "Press the canvas while auto-rotate is on (the turning stops)",
        dims: ["3d"],
        async run(page, ctx) {
            await setBehavior(page, "camera", { autoRotate: 1, autoRotateResume: "never" });
            const c0 = await camOf(page);
            await until(page, "JSON.stringify(el.getCameraState()) !== p.c0", { c0 }, 120);
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            const r = await timed(page, { type: "pointerdown", cond: CAM_HELD }, () => clickHere(page));
            await setBehavior(page, "camera", { autoRotate: 0, autoRotateResume: 0 });
            await camStill(page);
            return r;
        },
    },
    {
        id: "minimap-drag",
        name: "Drag in the minimap (per move; element option)",
        moves: 6,
        async run(page, ctx, rep) {
            const box = await minimapBox(page);
            if (!box) return { skip: "no minimap drawn" };
            const from = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
            return afterFirst(await measuredDrag(page, from, rep % 2 ? -4 : 4, 2, this.moves + 1));
        },
    },
    {
        id: "minimap-key",
        name: "Arrow key on the focused minimap (element option)",
        async run(page, ctx, rep) {
            const box = await minimapBox(page);
            if (!box) return { skip: "no minimap drawn" };
            const ok = await page.evaluate(() => {
                const m = document.querySelector("graphty-element").shadowRoot.querySelector("[part~=minimap]");
                m.focus();
                return document.querySelector("graphty-element").shadowRoot.activeElement === m;
            });
            if (!ok) return { skip: "the minimap does not take focus" };
            await camStill(page);
            const key = rep % 2 ? "ArrowRight" : "ArrowLeft";
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.down(key),
            );
            await page.keyboard.up(key);
            await camStill(page);
            return r;
        },
    },
    {
        id: "pixel-ratio-change",
        name: "The pixel ratio changes (browser zoom or another screen): backing size matches and redrawn",
        async run(page, ctx, rep, cdp) {
            const vp = page.viewportSize();
            const now = await page.evaluate(() => devicePixelRatio);
            const to = now >= 2 ? 1 : 2;
            // The element follows the screen's pixel ratio only with pixel-ratio="device" (its default is 1).
            const had = await page.evaluate(() => {
                const el = document.querySelector("graphty-element");
                const a = el.getAttribute("pixel-ratio");
                el.setAttribute("pixel-ratio", "device");
                return a;
            });
            await frames(page, 10);
            const r = await timed(
                page,
                {
                    type: "none",
                    startNow: true,
                    cond: "(() => { const c = [...(el.shadowRoot?.querySelectorAll('canvas') ?? []), ...el.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; return devicePixelRatio === p.to && Math.abs(c.width - Math.round(c.getBoundingClientRect().width * p.to)) <= 2; })()",
                    params: { to },
                },
                () =>
                    cdp.send("Emulation.setDeviceMetricsOverride", {
                        width: vp.width,
                        height: vp.height,
                        deviceScaleFactor: to,
                        mobile: false,
                    }),
            );
            const seen = r.timeout
                ? await page.evaluate(() => {
                      const el = document.querySelector("graphty-element");
                      const c = [
                          ...(el.shadowRoot?.querySelectorAll("canvas") ?? []),
                          ...el.querySelectorAll("canvas"),
                      ].sort((a, b) => b.width * b.height - a.width * a.height)[0];
                      return `devicePixelRatio ${devicePixelRatio}, canvas ${c.width} px wide for a ${c.getBoundingClientRect().width} px box`;
                  })
                : null;
            await cdp.send("Emulation.clearDeviceMetricsOverride");
            await until(page, "devicePixelRatio === p.dpr", { dpr: now });
            await page.evaluate((a) => {
                const el = document.querySelector("graphty-element");
                if (a === null) el.removeAttribute("pixel-ratio");
                else el.setAttribute("pixel-ratio", a);
            }, had);
            await frames(page, 10);
            ctx.dirty = true;
            if (seen) throw new Error(`the canvas did not follow the new pixel ratio ${to}: ${seen}`);
            return r;
        },
    },
];

/** The minimap's box in page pixels, switching the element's minimap option on; null when none is drawn. */
function minimapBox(page) {
    return page.evaluate(async () => {
        const el = document.querySelector("graphty-element");
        el.minimap = true;
        for (let i = 0; i < 30 && !el.shadowRoot.querySelector("[part~=minimap]"); i++)
            await new Promise((r) => requestAnimationFrame(r));
        const m = el.shadowRoot.querySelector("[part~=minimap]");
        if (!m) return null;
        const r = m.getBoundingClientRect();
        return r.width < 10 ? null : { x: r.left, y: r.top, w: r.width, h: r.height };
    });
}

ELEMENT.push(...ELEMENT_MORE);

// The first of each, timed once before anything warms the page up.
const COLD_ELEMENT = ["hover-node", "click-select-node", "right-click-node"];

// Hover tooltips: a layer that sets node.tooltip and edge.tooltip is added (untimed) before these run.
const TIPS = [
    {
        id: "hover-node-tooltip",
        name: "Hover a node until its tooltip is drawn",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await until(page, "el.session.selection.hovered === null");
            await frames(page, 30);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "String(el.session.selection.hovered) === p.id",
                    params: { id: t.id },
                    pix: tipBox(t),
                },
                () => page.mouse.move(t.x, t.y),
            );
        },
    },
    {
        id: "hover-edge-tooltip",
        name: "Hover an edge until its tooltip is drawn",
        async run(page, ctx, rep) {
            const e = ctx.edges[rep % ctx.edges.length];
            if (!e) return { skip: "no edge whose middle is clear of nodes" };
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await frames(page, 30);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "s.tEvent !== null && String(s.detail?.edgeId) === p.id",
                    params: { id: e.id },
                    event: "graphty-edge-hover",
                    pix: tipBox(e),
                },
                () => page.mouse.move(e.x, e.y),
            );
        },
    },
];

async function addTooltips(page) {
    await page.evaluate(async () => {
        const el = document.querySelector("graphty-element");
        await el.session.styles.add({
            name: "latency node tooltips",
            target: "node",
            selector: { match: "everything" },
            set: { "node.tooltip": "a node tooltip" },
        });
        await el.session.styles.add({
            name: "latency edge tooltips",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.tooltip": "an edge tooltip" },
        });
        await el.waitForPainted();
    });
}

// Touch runs after the mouse, with touch emulation switched on for the page.
const fingersAt = (c) => (gap) => [
    { x: c.x - gap / 2, y: c.y, id: 0, radiusX: 1, radiusY: 1, force: 1 },
    { x: c.x + gap / 2, y: c.y, id: 1, radiusX: 1, radiusY: 1, force: 1 },
];
const TOUCH = [
    {
        id: "touch-tap-select",
        name: "Tap a node to select it",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            const tp = (p) => [{ x: p.x, y: p.y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            return timed(
                page,
                { type: "pointerdown", cond: SEL_IS, params: { id: t.id }, pix: at(t, 40, 40) },
                async () => {
                    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(t) });
                    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
                },
            );
        },
    },
    {
        id: "touch-drag-camera",
        name: "One-finger drag on empty canvas (3D turns, 2D pans; per move)",
        moves: 8,
        async run(page, ctx, rep, cdp) {
            const tp = (x, y) => [{ x, y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            const out = [];
            let { x, y } = ctx.empty;
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(x, y) });
            for (let i = 0; i < 8; i++) {
                await camStill(page);
                x += rep % 2 ? -10 : 10;
                y += 4;
                out.push(
                    await timed(page, { type: "pointermove", cond: CAM_MOVED, pix: "all" }, () =>
                        cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(x, y) }),
                    ),
                );
                if (out.at(-1).timeout) break;
            }
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await camStill(page);
            return afterFirst(out);
        },
    },
    {
        id: "touch-pinch",
        name: "Two-finger pinch zoom (per move)",
        moves: 6,
        async run(page, ctx, rep, cdp) {
            const fingers = fingersAt(ctx.center);
            const out = [];
            let gap = rep % 2 ? 300 : 120;
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(gap) });
            for (let i = 0; i < 6; i++) {
                await camStill(page);
                gap += rep % 2 ? -25 : 25;
                out.push(
                    await timed(page, { type: "touchmove", cond: CAM_MOVED, pix: "all" }, () =>
                        cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(gap) }),
                    ),
                );
                if (out.at(-1).timeout) break;
            }
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await camStill(page);
            return afterFirst(out);
        },
    },
    {
        id: "touch-tap-empty",
        name: "Tap empty canvas to clear the selection",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            const tp = (p) => [{ x: p.x, y: p.y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(t) });
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await until(page, SEL_IS, { id: t.id });
            await frames(page, 5);
            return timed(
                page,
                { type: "pointerdown", cond: "el.session.selection.nodes.length === 0", pix: at(t, 40, 40) },
                async () => {
                    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(ctx.empty) });
                    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
                },
            );
        },
    },
    {
        id: "touch-drag-node",
        name: "One-finger drag on a node (per move)",
        moves: 8,
        async run(page, ctx, rep, cdp) {
            const t = (await nodeTargets(page, 1, 1900 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            const rect = await elementRect(page);
            const dir = t.x < rect.left + rect.width / 2 ? 1 : -1;
            const tp = (x, y) => [{ x, y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(t.x, t.y) });
            const out = [];
            let x = t.x;
            for (let i = 0; i < this.moves; i++) {
                await camStill(page);
                x += 10 * dir;
                out.push(
                    await timed(
                        page,
                        {
                            type: "pointermove",
                            cond: NEAR(2),
                            params: { id: t.id, x: x - rect.left, y: t.y - rect.top },
                            pix: { x, y: t.y, w: 30, h: 30 },
                        },
                        () => cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(x, t.y) }),
                    ),
                );
                if (out.at(-1).timeout) break;
            }
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await camStill(page);
            return afterFirst(out);
        },
    },
    {
        id: "touch-twist",
        name: "Two-finger twist (per move)",
        moves: 6,
        async run(page, ctx, rep, cdp) {
            const c = ctx.center;
            const fingers = (a) => [
                { x: c.x - 80 * Math.cos(a), y: c.y - 80 * Math.sin(a), id: 0, radiusX: 1, radiusY: 1, force: 1 },
                { x: c.x + 80 * Math.cos(a), y: c.y + 80 * Math.sin(a), id: 1, radiusX: 1, radiusY: 1, force: 1 },
            ];
            const out = [];
            let a = 0;
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(a) });
            for (let i = 0; i < this.moves; i++) {
                await camStill(page);
                a += (rep % 2 ? -1 : 1) * 0.12;
                out.push(
                    await timed(page, { type: "touchmove", cond: CAM_MOVED, pix: "all" }, () =>
                        cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(a) }),
                    ),
                );
                if (out.at(-1).timeout) break;
            }
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await camStill(page);
            return afterFirst(out);
        },
    },
    {
        id: "touch-pinch-burst",
        name: "Two-finger pinch, 60 moves a second (lag after the last move; dropped frames)",
        async run(page, ctx, rep, cdp) {
            const fingers = fingersAt(ctx.center);
            // Out first: the single-move pinch before it zoomed in.
            const g0 = rep % 2 ? 120 : 320;
            const step = rep % 2 ? 6 : -6;
            return burst(page, {
                type: "touchmove",
                track: CAM,
                hz: 60,
                count: 30,
                before: async () => {
                    await camStill(page);
                    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(g0) });
                },
                send: (i) =>
                    cdp.send("Input.dispatchTouchEvent", {
                        type: "touchMove",
                        touchPoints: fingers(g0 + step * (i + 1)),
                    }),
                after: () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }),
            });
        },
    },
];

// Switching the layout: graphty-element has no layout control of its own, so the page gets the button a consumer
// would add (its click calls setLayout), and the real click on it is the input: to the first frame whose drawing
// changed, and to the settled frame.
const LAYOUTS = [
    {
        id: "element-layout-switch",
        name: "Click a consumer's layout button (circular / grid alternately): first changed frame; settled",
        async run(page, ctx, rep) {
            const type = rep % 2 ? "grid" : "circular";
            const box = await page.evaluate((type) => {
                let b = document.getElementById("latency-layout-button");
                if (!b) {
                    b = document.createElement("button");
                    b.id = "latency-layout-button";
                    b.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:10;padding:8px";
                    b.addEventListener("click", () =>
                        document.querySelector("graphty-element").setLayout(b.dataset.type),
                    );
                    document.body.append(b);
                }
                b.dataset.type = type;
                b.textContent = type;
                const r = b.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }, type);
            await page.mouse.move(box.x, box.y);
            await frames(page, 2);
            const before = await page.evaluate(() => document.querySelector("graphty-element").layout ?? null);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: "(el.layout ?? null) !== p.before",
                    params: { before },
                    pix: "all",
                    settle: true,
                },
                () => page.mouse.click(box.x, box.y),
            );
        },
    },
];

// While a force layout keeps moving the graph, last: it changes the drawing for good. Pixels change every frame
// here, so these read the look's color at the node's position each frame (`look`), or end on state.

// Grabs a node of a moving graph: the pointer onto a drawn node until some node is hovered (on a moving graph the
// node under the pointer may be another than the one aimed at), untimed.
async function hoverMoving(page, rep, seed) {
    const t0 = (await nodeTargets(page, 1, seed + rep))[0];
    if (!t0) return null;
    // A pick runs on a pointer move, not when a node slides under a still pointer: follow the node, up to 20 moves.
    for (let i = 0; i < 20; i++) {
        const t = await whereIs(page, t0.id);
        await page.mouse.move(t.x + (i % 2), t.y);
        if (await until(page, "el.session.selection.hovered !== null", {}, 3)) {
            const id = await page.evaluate(() =>
                String(document.querySelector("graphty-element").session.selection.hovered),
            );
            return { ...t, id };
        }
    }
    return null;
}
const awayFromNodes = async (page, ctx) => {
    await page.mouse.move(ctx.empty.x, ctx.empty.y);
    await until(page, "el.session.selection.hovered === null", {}, 60);
};

const RUNNING = [
    {
        id: "hover-node-running-layout",
        name: "Hover a node while a force layout runs (the hover color at whichever node is hovered)",
        async run(page, ctx, rep) {
            await awayFromNodes(page, ctx);
            const t0 = (await nodeTargets(page, 1, 300 + rep))[0];
            if (!t0) return { skip: "no node in view" };
            // Where the node is drawn now: finding it took frames in which it moved.
            const t = await whereIs(page, t0.id);
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "el.session.selection.hovered !== null",
                    event: "graphty-node-hover",
                    look: ctx.hoverRgb && { id: "@hovered", rgb: ctx.hoverRgb },
                    capMs: 3000,
                },
                () => page.mouse.move(t.x, t.y),
            );
        },
    },
    {
        id: "pointer-leaves-node-running-layout",
        name: "Move the pointer off a node while a force layout runs (its hover color gone)",
        async run(page, ctx, rep) {
            const t = await hoverMoving(page, rep, 400);
            if (!t) return { skip: "no node stayed under the pointer" };
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "el.session.selection.hovered === null",
                    look: ctx.hoverRgb && { id: t.id, rgb: ctx.hoverRgb, absent: true },
                    capMs: 3000,
                },
                () => page.mouse.move(ctx.empty.x, ctx.empty.y),
            );
        },
    },
    {
        id: "click-select-running-layout",
        name: "Click a node while a force layout runs (the Selected halo at whichever node is selected)",
        async run(page, ctx, rep) {
            await page.evaluate(() => document.querySelector("graphty-element").session.selection.clear());
            const t = await hoverMoving(page, rep, 700);
            if (!t) return { skip: "no node stayed under the pointer" };
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.nodes.length === 1",
                    look: ctx.selRgb && { id: "@selected", rgb: ctx.selRgb, w: 50, h: 50 },
                    capMs: 3000,
                },
                () => clickHere(page),
            );
        },
    },
    {
        id: "click-empty-deselect-running-layout",
        name: "Click empty canvas while a force layout runs (the Selected halo gone)",
        async run(page, ctx, rep) {
            const t = await hoverMoving(page, rep, 800);
            if (!t) return { skip: "no node stayed under the pointer" };
            await clickHere(page);
            if (!(await until(page, "el.session.selection.nodes.length === 1", {}, 60)))
                return { skip: "the moving node slid out from under the click" };
            const id = await page.evaluate(() =>
                String(document.querySelector("graphty-element").session.selection.nodes[0]),
            );
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await frames(page, 2);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.nodes.length === 0",
                    look: ctx.selRgb && { id, rgb: ctx.selRgb, absent: true, w: 50, h: 50 },
                    capMs: 3000,
                },
                () => clickHere(page),
            );
        },
    },
    {
        id: "drag-node-running-layout",
        name: "Drag a node while a force layout runs (per move; node under the pointer; state only)",
        moves: 8,
        async run(page, ctx, rep) {
            const t = await hoverMoving(page, rep, 1100);
            if (!t) return { skip: "no node stayed under the pointer" };
            const rect = await elementRect(page);
            const near =
                "(() => { const a = el.nodeScreenPosition(p.id); return a && Math.hypot(a.x - p.x, a.y - p.y) <= 3; })()";
            const out = [];
            await page.mouse.down();
            let x = t.x;
            const dir = t.x < rect.left + rect.width / 2 ? 1 : -1;
            for (let i = 0; i < 9; i++) {
                x += 10 * dir;
                out.push(
                    await timed(
                        page,
                        {
                            type: "pointermove",
                            cond: near,
                            params: { id: t.id, x: x - rect.left, y: t.y - rect.top },
                            // State only: the dragged node already shows its hover color 10 px away, so its color
                            // under the pointer cannot tell this move's frame from the last one's.
                            capMs: 5000,
                        },
                        () => page.mouse.move(x, t.y),
                    ),
                );
            }
            await page.mouse.up();
            return afterFirst(out);
        },
    },
];

// ------------------------------------------------------------------ statistics and rows

function stats(xs) {
    const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
    if (!s.length) return null;
    const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
    return { n: s.length, median: q(0.5), p95: q(0.95), worst: s.at(-1), best: s[0] };
}

function row(base, inter, samples, reps, extra = {}) {
    const flat = samples.flat().filter(Boolean);
    // A repetition that timed out counts at its cap, so it raises the median and the 95th percentile instead of
    // leaving them; a cell whose every repetition timed out reads as its cap, over every bar.
    const ms = flat.map((r) => (r.timeout ? (r.capMs ?? CAP_MS) : r.ms));
    const st = stats(ms);
    const med = (k) => stats(flat.map((r) => r[k]))?.median ?? null;
    const ends = new Set(flat.filter((r) => !r.timeout).map((r) => (r.noVisible ? "state" : (r.endsOn ?? "state"))));
    return {
        ...base,
        interaction: inter.id,
        name: inter.name,
        reps,
        samples: flat.length,
        timeouts: flat.filter((r) => r.timeout).length,
        noInput: flat.filter((r) => r.sawInput === false).length,
        noVisible: flat.filter((r) => r.noVisible).length,
        // Repetitions whose press and release reached the page more than 300 ms apart: no click to the element.
        ...(flat.some((r) => r.clickWindowMissed)
            ? { clickWindowMissed: flat.filter((r) => r.clickWindowMissed).length }
            : {}),
        // What the drawn time ends on: "pixels", "state" (a DOM or state result, or one never seen drawn), or
        // "mixed".
        endsOn: ends.size > 1 ? "mixed" : ([...ends][0] ?? null),
        ...(flat.some((r) => r.layoutStill) ? { layoutStill: flat.filter((r) => r.layoutStill).length } : {}),
        median_ms: st?.median ?? null,
        p95_ms: st?.p95 ?? null,
        worst_ms: st?.worst ?? null,
        best_ms: st?.best ?? null,
        state_median_ms: med("stateMs"),
        event_median_ms: med("eventMs"),
        settled_median_ms: med("settledMs"),
        drops_median: med("drops"),
        max_gap_median_ms: med("maxGapMs"),
        inputs_median: med("inputs"),
        input_span_median_ms: med("spanMs"),
        achieved_hz_median: med("achievedHz"),
        sent_hz_median: med("sentHz"),
        idle_period_median_ms: med("idlePeriodMs"),
        perceivable: st ? st.p95 > PERCEIVED_MS : null,
        raw: ms,
        rawState: flat.map((r) => r.stateMs ?? null),
        ...extra,
    };
}

/**
 * A "layout running" cell must time a moving graph: restarts the layout once if it settled.
 * @returns whether it moves
 */
async function keepMoving(page, ctx) {
    if (await layoutMoving(page)) return true;
    await ctx.restartLayout?.();
    await frames(page, 3);
    if (!(await layoutMoving(page))) return false;
    Object.assign(ctx, await pageContext(page, ctx));
    return true;
}

/** Marks a running cell's samples whose layout had settled by the end of the repetition. */
async function markStill(page, r) {
    if (await layoutMoving(page)) return;
    for (const x of [r].flat()) if (x) x.layoutStill = true;
}

/** A camera move or a layout changes where everything is drawn: finds the targets again (never on a cold page). */
async function refreshTargets(page, ctx) {
    if (!ctx.moving) await camStill(page);
    if (ctx.cold || !(ctx.moving || ctx.dirty || (await camOf(page)) !== ctx.cam)) return;
    Object.assign(ctx, await pageContext(page, ctx));
    // A glide can leave the camera close on one node: fit the graph again and look once more.
    if (ctx.nodes.length < 2 && ctx.refit) {
        await ctx.refit();
        Object.assign(ctx, await pageContext(page, ctx));
    }
    ctx.dirty = false;
}

/** One repetition of one interaction, into `g`; a rep that throws is recorded and its held keys let go. */
async function oneRep(page, ctx, inter, rep, cdp, g) {
    const had = [g.samples.length, g.errors.length];
    try {
        await refreshTargets(page, ctx);
        if (ctx.prep) await ctx.prep(page, ctx);
        if (ctx.moving && !(await keepMoving(page, ctx))) {
            g.errors.push("the force layout had stopped moving and did not restart");
            return;
        }
        const t0 = Date.now();
        const r = await inter.run(page, ctx, rep, cdp);
        if (ctx.moving) await markStill(page, r);
        if ([r].flat().some((x) => x?.preTrue))
            g.errors.push("the result held before the input: the case's setup did not leave the state it needs");
        else if (r?.skip) g.skip = r.skip;
        else {
            g.samples.push(r);
            g.reps++;
        }
        if (inter.moves) ctx.dirty = true;
        if (Date.now() - t0 > 10000 && ctx.n >= 100000) g.slow = true;
    } catch (e) {
        g.errors.push(
            String(e?.message ?? e)
                .split("\n")[0]
                .slice(0, 200),
        );
        await page.mouse.up().catch(() => {});
        for (const k of ["Shift", "Control"]) await page.keyboard.up(k).catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
        ctx.dirty = true;
    }
    // What this repetition gave: its sample, its error, or the reason it was skipped.
    let said = g.skip;
    if (g.samples.length > had[0]) said = JSON.stringify(g.samples.at(-1)).slice(0, 200);
    else if (g.errors.length > had[1]) said = "error: " + g.errors.at(-1);
    console.log(rep, inter.id, said);
}

/**
 * Runs `list` round-robin for `reps` repetitions; a rep that throws is recorded, and the interaction goes on.
 * @returns {Promise<object[]>} One row per interaction.
 */
async function roundRobin(page, ctx, list, reps, base, out, cdp) {
    const got = new Map(list.map((i) => [i.id, { samples: [], errors: [], skip: null, reps: 0, slow: false }]));
    for (let rep = 0; rep < reps; rep++)
        for (const inter of list) {
            const g = got.get(inter.id);
            // At 100,000 nodes a rep over 10 s gets three reps, not five.
            if (!g.slow || rep < 3) await oneRep(page, ctx, inter, rep, cdp, g);
        }
    for (const inter of list) {
        const g = got.get(inter.id);
        const r = row(base, inter, g.samples, g.reps, {
            ...(g.skip && !g.samples.length ? { notMeasured: g.skip } : {}),
            ...(g.errors.length ? { errors: g.errors } : {}),
        });
        appendFileSync(out, JSON.stringify(r) + "\n");
    }
}

/** A new phase starts from the whole graph in view, with its targets found again. */
async function newPhase(ctx) {
    await ctx.refit?.();
    ctx.dirty = true;
}

/** The same interactions under new ids: `-cold`, `-style-open` and so on. */
const variant = (list, ids, suffix, label) =>
    ids
        .map((id) => list.find((i) => i.id === id))
        .filter(Boolean)
        .map((i) => ({ ...i, id: `${i.id}-${suffix}`, name: `${i.name} (${label})` }));

const wanted = (list, spec) =>
    list.filter((i) => (!i.dims || i.dims.includes(spec.dim)) && (!spec.only || new RegExp(spec.only).test(i.id)));

// ------------------------------------------------------------------ element pages

// graphty-element's default Hovered layer selects the hovered node and sets nothing, so a hover draws no change and
// could only ever be timed to its state. Every look but plain (and the app) gets this hover look, set untimed on the
// Hovered layer through the public styles API: a node color no other layer here uses. Its fill, not its halo, so a
// pinned node's halo still shows under the pointer.
const HOVER_HEX = "#ff00ff";
const HOVER_RGB = [255, 0, 255];
// The app's Pinned look (graphty/src/workspace/Workspace.tsx), given to the element pages too, so a drop pins a
// node into a look the canvas draws.
const PINNED_LOOK = { color: "#868e96", scale: 1.3, opacity: 1 };

async function addHoverLook(page) {
    const ok = await page.evaluate(async (hex) => {
        const el = document.querySelector("graphty-element");
        const hovered = el.session.styles.list().find((l) => l.name === "Hovered");
        if (!hovered) return false;
        await el.session.styles.update(hovered.id, { set: { ...hovered.set, "node.color": hex } });
        await el.waitForPainted();
        return true;
    }, HOVER_HEX);
    if (!ok) throw new Error("no Hovered layer to give a hover look");
}

/** The Selected layer's halo color, as [r, g, b], or null when it sets none. */
const selectedRgb = (page) =>
    page.evaluate(() => {
        const l = document
            .querySelector("graphty-element")
            .session.styles.list()
            // A row targeting nodes and edges is a layer for each: the node one sets the halo.
            .find((x) => x.name === "Selected" && x.set?.["node.haloColor"]);
        const c = l?.set?.["node.haloColor"];
        const m = typeof c === "string" && /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(c);
        return m ? [1, 2, 3].map((i) => Number.parseInt(m[i], 16)) : null;
    });

/** The heavy look's style layers beyond labels, arrowheads and curves (INPUT-CATALOG.md, section 3.1). */
async function heavyLook(page) {
    await addTooltips(page);
    await page.evaluate(async () => {
        const el = document.querySelector("graphty-element");
        await el.session.styles.add({
            name: "latency color by number",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.id", scale: "linear", palette: "viridis" } },
        });
        await el.session.styles.add({
            name: "latency size by degree",
            target: "node",
            selector: { match: "has", path: "graphty.degree" },
            encode: {
                "node.size": {
                    by: "graphty.degree",
                    stops: [
                        { at: 0, value: 1 },
                        { at: 5, value: 2 },
                        { at: 50, value: 4 },
                    ],
                },
            },
        });
        await el.waitForPainted();
    });
}

// Camera, wheel, key and touch-free inputs again while a force layout runs (state only: every pixel moves).
const RUNNING_IDS = [
    "drag-orbit-3d",
    "drag-pan",
    "wheel-zoom",
    "key-camera-turn-or-pan",
    "key-camera-zoom",
    "pinch-ctrl-wheel",
];
const runningVariants = () =>
    variant(ELEMENT, RUNNING_IDS, "running-layout", "force layout running; camera inputs end on state");

/**
 * Loads the bench page in a new browser: the graph, the look and the hover and pinned looks, settled and painted.
 * @returns the browser (b) and its page
 */
async function loadElement(spec, url, base) {
    const dpr = base.dpr;
    const b = await launch({ width: 1280, height: 1000 }, dpr);
    try {
        const { page } = b;
        await page.goto(url);
        await page.waitForFunction(() => globalThis.B);
        const info = await page.evaluate(() => B.info());
        Object.assign(base, {
            sha: info.build?.sha,
            dirty: info.build?.dirty,
            elementBuilt: info.build?.distBuilt,
            renderer: info.webgl,
            browser: await page.evaluate(() => /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? null),
        });
        checkRenderer(info.webgl);
        const gen = await page.evaluate(([n]) => B.gen(n, 2 * n), [spec.n]);
        base.edges = gen.m;
        const look = base.mode;
        // plain: no style layers. default: graphty-element's default layers (Everything, Selected, Hovered,
        // Pinned) with the hover look. styled: default plus labels and arrowheads. heavy: styled plus curved edges,
        // tooltips, color bound to a number column and size bound to degree (INPUT-CATALOG.md, section 3.1).
        const labelled = look === "styled" || look === "heavy";
        await page.evaluate((o) => B.setup("graphty", o), {
            mode: "plain",
            accel: "on",
            dpr,
            renderPath: spec.path,
            dim: spec.dim,
            labels: labelled,
            arrows: labelled,
            curves: look === "heavy" && spec.dim !== "2d",
        });
        if (look !== "plain")
            await page.evaluate(
                (pinnedStyle) =>
                    document.querySelector("graphty-element").session.config.set({ startingRows: true, pinnedStyle }),
                PINNED_LOOK,
            );
        const load = await page.evaluate(() => B.load());
        if (load.error) throw new Error("load failed: " + load.error);
        if (look === "heavy") await heavyLook(page);
        await page.evaluate(() => B.adapter.settle());
        if (look !== "plain") await addHoverLook(page);
        await page.evaluate(() => document.querySelector("graphty-element").waitForPainted());
        base.renderPathDrawn = await page.evaluate(() => document.querySelector("graphty-element").renderPath);
        b.cdp = await b.ctx.newCDPSession(page);
        return b;
    } catch (e) {
        await b.close();
        throw e;
    }
}

/**
 * Runs each cold input (the first of its kind after load) on its own fresh page, with targets found from drawn
 * positions alone: finding them by picking (elementAt) would warm the very path the cold input times.
 */
async function coldPages(list, load, contextOf, base, out) {
    for (const inter of list) {
        let b = null;
        try {
            b = await load();
            const ctx = await contextOf(b.page);
            ctx.cdp = b.cdp;
            if (ctx.nodes.length < 1) throw new Error("no isolated node drawn for a cold input");
            await roundRobin(b.page, ctx, [inter], 1, base, out, b.cdp);
        } catch (e) {
            const err = String(e?.message ?? e)
                .split("\n")[0]
                .slice(0, 200);
            appendFileSync(out, JSON.stringify(row(base, inter, [], 0, { errors: [err] })) + "\n");
        } finally {
            await b?.close();
        }
    }
}

async function elementPage(spec, out) {
    const build = process.env.BENCH_BUILD ?? join(HERE, "builds", process.env.BENCH_LABEL ?? "interaction-latency");
    const server = process.env.BENCH_URL ? null : await serve(build);
    const url = process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`;
    const t0Page = Date.now();
    const base = {
        surface: "graphty-element",
        tierPage: spec.page,
        path: spec.path,
        dim: spec.dim,
        mode: spec.mode ?? "plain",
        dpr: spec.dpr ?? 1,
        n: spec.n,
        smoke: SMOKE || undefined,
        at: new Date().toISOString(),
        loadavg: loadavg()[0],
        cpus: /Cpus_allowed_list:\s*(\S+)/.exec(readFileSync("/proc/self/status", "utf8"))?.[1],
    };
    let b = null;
    try {
        const cold = wanted(variant(ELEMENT, COLD_ELEMENT, "cold", "first after load"), spec);
        await coldPages(
            cold,
            () => loadElement(spec, url, base),
            (page) => coldContext(page, spec),
            base,
            out,
        );
        b = await loadElement(spec, url, base);
        const { page, cdp } = b;
        const look = base.mode;
        const ctx = await pageContext(page, spec);
        ctx.cdp = cdp;
        ctx.hoverRgb = look === "plain" ? null : HOVER_RGB;
        ctx.selRgb = await selectedRgb(page);
        console.log("targets", JSON.stringify({ nodes: ctx.nodes, empty: ctx.empty, edges: ctx.edges }));
        if (ctx.nodes.length < 2 || !ctx.empty) throw new Error("no two pickable nodes or no empty point");
        ctx.refit = async () => {
            await page.evaluate(() => document.querySelector("graphty-element").zoomToFit());
            await camStill(page);
        };
        await roundRobin(page, ctx, wanted(ELEMENT, spec), spec.reps, base, out, cdp);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(bursts([60, 120]), spec), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await page.mouse.move(ctx.empty.x, ctx.empty.y);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(TOUCH, spec), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
        if (wanted(TIPS, spec).length) {
            // The heavy look has its tooltips already.
            if (look !== "heavy") await addTooltips(page);
            await newPhase(ctx);
            await roundRobin(page, ctx, wanted(TIPS, spec), spec.reps, base, out);
        }
        if (wanted(LAYOUTS, spec).length) {
            ctx.dirty = true;
            await roundRobin(page, ctx, wanted(LAYOUTS, spec), spec.reps, base, out);
        }
        const running = spec.running === false ? [] : wanted([...RUNNING, ...runningVariants()], spec);
        if (running.length) await runningPhase(page, ctx, running, spec.reps, base, out, cdp);
    } catch (e) {
        appendFileSync(
            out,
            JSON.stringify({ ...base, failure: String(e?.message ?? e).slice(0, 300), errors: b?.errors }) + "\n",
        );
        console.log("failure", e?.message);
    } finally {
        appendFileSync(out, JSON.stringify({ ...base, wall: true, wallMs: Date.now() - t0Page }) + "\n");
        await b?.close();
        server?.close();
    }
}

/**
 * Starts a force layout and runs `list` while it moves. A (re)start scatters the nodes first (the random layout),
 * so the force layout has somewhere to move them from: starting it on a settled drawing moves nothing.
 */
async function runningPhase(page, ctx, list, reps, base, out, cdp) {
    ctx.layoutSeed = 1;
    ctx.restartLayout = () =>
        page.evaluate(async (seed) => {
            const el = document.querySelector("graphty-element");
            await el.setLayout("random", { seed });
            await el.setLayout("ngraph", { seed });
        }, ctx.layoutSeed++);
    await ctx.restartLayout();
    await frames(page, 3);
    ctx.moving = true;
    STATE_ONLY.add(page);
    await roundRobin(page, ctx, list, reps, base, out, cdp);
    ctx.moving = false;
    STATE_ONLY.delete(page);
}

/**
 * Whether a layout is still moving nodes: any of 40 drawn nodes moved over three frames while the camera held
 * still. The camera is given ten frames to come to rest (inertia from the last input); one still moving after that
 * is the element framing a moving layout, which counts as moving.
 */
async function layoutMoving(page) {
    return page.evaluate(async () => {
        const el = document.querySelector("graphty-element");
        const raf = () => new Promise((r) => requestAnimationFrame(r));
        const all = el.session.data.nodes();
        const step = Math.max(1, Math.floor(all.length / 40));
        const ids = all.filter((_, i) => i % step === 0).map((n) => n.id);
        const where = () => ids.map((id) => el.nodeScreenPosition(id)).map((p) => (p ? [p.x, p.y] : null));
        const cam = () => JSON.stringify(el.getCameraState());
        let c = cam();
        let same = 0;
        for (let i = 0; i < 10 && same < 2; i++) {
            await raf();
            same = cam() === c ? same + 1 : 0;
            c = cam();
        }
        if (same < 2) return true;
        const a = where();
        for (let i = 0; i < 3; i++) await raf();
        if (cam() !== c) return true;
        const b = where();
        return a.some((p, i) => p && b[i] && Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) > 0.5);
    });
}

// What decides where things are drawn: the camera, and the element's box (a panel opening beside the canvas moves
// every node on screen without moving the camera).
const camOf = (page) =>
    page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        return JSON.stringify([el.getCameraState(), r.left, r.top, r.width, r.height]);
    });

async function pageContext(page, spec) {
    const cam = await camOf(page);
    const nodes = await nodeTargets(page, 2);
    const empty = await emptyPoint(page);
    const edges = [await edgeTarget(page, 0), await edgeTarget(page, 1)].filter(Boolean);
    const center = await page.evaluate(() => {
        const r = document.querySelector("graphty-element").getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    // A point in the viewport outside the element, when there is one (the bench page leaves a margin).
    const outside = await page.evaluate(() => {
        const r = document.querySelector("graphty-element").getBoundingClientRect();
        const pts = [
            { x: r.right + 20, y: r.top + 20 },
            { x: r.left + 20, y: r.bottom + 20 },
            { x: r.left - 20, y: r.top + 20 },
            { x: r.left + 20, y: r.top - 20 },
        ];
        return pts.find((p) => p.x > 0 && p.y > 0 && p.x < innerWidth && p.y < innerHeight) ?? null;
    });
    return { nodes, empty, edges, center, cam, outside, dim: spec.dim, n: spec.n };
}

/**
 * Targets for a cold input, from drawn positions alone (no picking): the three nodes in the canvas's middle with the
 * most room around them (the nearest other node's center farthest beyond their edge), and, as the empty point, a point outside the element (the
 * pointer starts there, so its first move onto the node is the first pick). Clicking empty canvas is skipped.
 */
async function coldContext(page, spec) {
    const found = await page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        const pts = [];
        for (const n of el.session.data.nodes()) {
            const p = el.nodeScreenPosition(n.id);
            if (p?.visible) pts.push({ id: String(n.id), x: p.x, y: p.y, rad: p.radius ?? 5 });
        }
        const cell = 40;
        const grid = new Map();
        const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
        for (const p of pts) {
            const k = key(p.x, p.y);
            if (!grid.has(k)) grid.set(k, []);
            grid.get(k).push(p);
        }
        // How far the nearest other node's center is beyond this node's edge (80 px or more counts as 80).
        const clearance = (p) => {
            const gx = Math.floor(p.x / cell),
                gy = Math.floor(p.y / cell);
            let d = 80;
            for (let dx = -2; dx <= 2; dx++)
                for (let dy = -2; dy <= 2; dy++)
                    for (const q of grid.get(`${gx + dx},${gy + dy}`) ?? [])
                        if (q !== p) d = Math.min(d, Math.hypot(q.x - p.x, q.y - p.y) - p.rad);
            return d;
        };
        const mid = (p) => p.x > 0.2 * r.width && p.x < 0.8 * r.width && p.y > 0.2 * r.height && p.y < 0.8 * r.height;
        // The three clearest (a diagram of large nodes side by side has none 30 px clear), at least 4 px clear.
        const ranked = pts
            .filter((p) => mid(p))
            .map((p) => ({ p, c: clearance(p) }))
            .filter(({ c }) => c >= 4)
            .sort((a, b) => b.c - a.c);
        const nodes = [];
        for (const { p } of ranked) {
            if (nodes.length >= 3) break;
            const top = document.elementFromPoint(r.left + p.x, r.top + p.y);
            if (top === el || el.contains(top)) nodes.push({ id: p.id, x: r.left + p.x, y: r.top + p.y });
        }
        const outs = [
            { x: r.left + 20, y: r.top - 10 },
            { x: r.right + 20, y: r.top + 20 },
            { x: r.left - 10, y: r.top + 20 },
            { x: r.left + 20, y: r.bottom + 10 },
        ];
        const outside = outs.find((p) => p.x > 0 && p.y > 0 && p.x < innerWidth && p.y < innerHeight) ?? { x: 1, y: 1 };
        return { nodes, outside, center: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
    });
    return {
        ...found,
        empty: found.outside,
        edges: [],
        cam: await camOf(page),
        dim: spec.dim,
        n: spec.n,
        cold: true,
    };
}

// ------------------------------------------------------------------ the graphty app

/**
 * A G(n, 2n) GraphML file shaped like staff-50k.graphml (name, dept), plus a number (score) to bind a style to and
 * a year to step a timeline through. Seeded: every run writes the same file. With `yed`, every node also carries
 * yEd graphics (a fill color and shape by dept), which the app turns into file styles with ?features=file-styles.
 */
function writeGraph(n, file, yed = false) {
    let a = 79 >>> 0;
    const rnd = () => {
        a = (a * 1664525 + 1013904223) >>> 0;
        return a / 4294967296;
    };
    const depts = ["Facilities", "Research", "Finance", "Library", "Legal", "Grants", "Payroll", "Security"];
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
        ...(yed ? ['<key id="g" for="node" yfiles.type="nodegraphics"/>'] : []),
        '<key id="name" for="node" attr.name="name" attr.type="string"/>',
        '<key id="dept" for="node" attr.name="dept" attr.type="string"/>',
        '<key id="score" for="node" attr.name="score" attr.type="double"/>',
        '<key id="year" for="node" attr.name="year" attr.type="int"/>',
        '<graph id="G" edgedefault="undirected">',
    ];
    for (let i = 0; i < n; i++) {
        const d = depts[Math.floor(rnd() * depts.length)];
        const s = (rnd() * 100).toFixed(2);
        const y = 2000 + Math.floor(rnd() * 20);
        const k = depts.indexOf(d);
        const gfx = yed
            ? `<data key="g"><y:ShapeNode><y:Fill color="${YED_FILLS[k]}"/><y:Shape type="${k % 2 ? "ellipse" : "roundrectangle"}"/></y:ShapeNode></data>`
            : "";
        lines.push(
            `<node id="n${i}">${gfx}<data key="name">Person ${i}</data><data key="dept">${d}</data><data key="score">${s}</data><data key="year">${y}</data></node>`,
        );
    }
    const seen = new Set();
    while (seen.size < 2 * n) {
        const s = Math.floor(rnd() * n);
        const t = (s + 1 + Math.floor(rnd() * 200)) % n;
        const k = s < t ? `${s},${t}` : `${t},${s}`;
        if (seen.has(k)) continue;
        seen.add(k);
        lines.push(`<edge source="n${s}" target="n${t}"/>`);
    }
    lines.push("</graph>", "</graphml>");
    writeFileSync(file, lines.join("\n") + "\n");
}

const YED_FILLS = ["#E8A33D", "#3D8FE8", "#5BBE6A", "#C7563F", "#8E6BD1", "#3FB7B0", "#D16BA5", "#7F8C8D"];
const genFile = (n, dir, yed = false) => {
    const f = join(dir, `latency-${K(n)}${yed ? "-yed" : ""}.graphml`);
    if (!existsSync(f)) writeGraph(n, f, yed);
    return f;
};

const GRAPHS = {
    lesmis: { label: "Les Miserables (sample)", open: (page) => openSample(page, "Les Miserables") },
    "yed-live": {
        label: "yEd Live WaveNet (file)",
        open: (page) =>
            openFile(page, process.env.LAT_YED_LIVE ?? join(REPO, "graphty/public/samples/programs/yed-live.graphml")),
    },
    "staff-50k": {
        label: "staff-50k.graphml (file)",
        open: (page) => openFile(page, join(FILES, "staff-50k.graphml")),
    },
    ...Object.fromEntries(
        [1000, 10000, 50000, 100000].map((n) => [
            `gen-${K(n)}`,
            { label: `generated ${K(n)} (file)`, open: (page, dir) => openFile(page, genFile(n, dir)), time: true },
        ]),
    ),
    ...Object.fromEntries(
        [1000, 10000, 50000].map((n) => [
            `gen-${K(n)}-yed`,
            {
                label: `generated ${K(n)} with yEd styles (file)`,
                open: (page, dir) => openFile(page, genFile(n, dir, true)),
            },
        ]),
    ),
};

// Opening is timed from the real click that opens the graph (the sample's card, or the file chooser's button: the
// last press before the graph draws) to the first frame that draws its nodes (graph-first-frame from a
// graphty-element that was not on the page when the watch began: never the start page's own hero graph), and to the
// settled picture: one cold row per page.
async function watchOpen(page) {
    await page.evaluate(() => {
        const o = (globalThis.__open = { first: null, input: null });
        addEventListener(
            "pointerdown",
            (e) => {
                if (o.first === null) o.input = e.timeStamp;
            },
            { capture: true },
        );
        const there = new Set(document.querySelectorAll("graphty-element"));
        const hook = () => {
            if (o.first !== null) return;
            for (const el of document.querySelectorAll("graphty-element"))
                if (!there.has(el)) {
                    there.add(el);
                    el.addEventListener("graph-first-frame", () => (o.first ??= performance.now()), { once: true });
                }
            requestAnimationFrame(hook);
        };
        hook();
    });
}

async function openSample(page, sample) {
    await page.getByRole("button", { name: "Samples", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^Open the ${sample} sample: `) }).click();
    await page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
}

async function openFile(page, file) {
    if (!existsSync(file)) throw new Error(`no file ${file}`);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^Open a file/ }).click();
    await (await chooser).setFiles(file);
    await page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
}

// Untimed: waits for the settled picture; a picture still changing after the element's own wait (a layout still
// running, labels redrawing) is let go rather than failing the case.
const stable = (page) =>
    page.evaluate(() =>
        document
            .querySelector("graphty-element")
            .waitForStableFrame()
            .catch(() => {}),
    );
const INSPECTOR = `document.querySelector('[aria-label="Inspector"] [role=heading][aria-level="2"]')?.textContent ?? ''`;
const TREE_COUNT = `document.querySelectorAll('[role=tree][aria-label="Style layers"] [role=treeitem]').length`;
const TABLE = `document.querySelector('section[aria-label="Table"]')`;
const TABLE_FIRST_ROW = `[...(${TABLE}?.querySelectorAll('[role=grid] [role=row]') ?? [])].slice(1, 6).map((r) => r.textContent).join('|')`;

async function setFocusSelected(page, on) {
    await page.getByRole("button", { name: /^Camera\b/ }).click();
    const item = page.getByRole("menuitemcheckbox", { name: "Focus selected" });
    const checked = (await item.getAttribute("aria-checked")) === "true";
    if (checked !== on) await item.click();
    else await page.keyboard.press("Escape");
    await frames(page, 5);
}

/** Selects a node and opens the Inspector's Style tab, which then stays open for every node selected after. */
async function openStyleTab(page, ctx) {
    await clickEmptyUntimed(page, ctx);
    await selectUntimed(page, ctx.nodes[0]);
    await page
        .getByRole("complementary", { name: "Inspector" })
        .getByRole("tab", { name: "Style", exact: true })
        .click();
    await stable(page);
    await page.keyboard.press("Escape");
    await clickEmptyUntimed(page, ctx);
}

const undoUntimed = async (page, ctx) => {
    await page.keyboard.press("Escape");
    await clickEmptyUntimed(page, ctx);
    await page.keyboard.press("Control+z");
    await page.evaluate(() => document.querySelector("graphty-element").waitForPainted());
    await frames(page, 3);
};

/** The Everything row's Style panel. */
async function everythingStyle(page) {
    await page.getByRole("treeitem", { name: /^Everything,/ }).click();
    const tab = page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style", exact: true });
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
}

/** Clicks a control (located by Playwright) as the timed input. */
async function clickTimed(page, locator, spec) {
    const box = await locator.boundingBox();
    if (!box) throw new Error("the control is not on screen");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await frames(page, 2);
    return timed(page, { type: "pointerdown", ...spec }, () => page.mouse.click(x, y));
}

const APP = [
    ...[
        "hover-node",
        "pointer-leaves-node",
        "hover-edge",
        "click-empty-deselect",
        "click-select-edge",
        "ctrl-click-toggle-node",
        "key-camera-turn-or-pan",
        "key-camera-zoom",
    ].map((id) => ({ ...ELEMENT.find((i) => i.id === id) })),
    {
        id: "app-click-select-node",
        name: "Click a node (selection drawn; Focus selected glide starts)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await stable(page);
            await hoverUntimed(page, t);
            await frames(page, 3);
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id }, pix: at(t, 40, 40) }, () =>
                clickHere(page),
            );
        },
    },
    {
        id: "app-click-inspector",
        name: "Click a node, with another selected, until the Inspector heading names it",
        async run(page, ctx, rep) {
            // The Inspector keeps the last node after the selection clears, so the other node is selected first and
            // the heading must change from its name to this one's.
            const [t, other] = rep % 2 ? [ctx.nodes[1], ctx.nodes[0]] : ctx.nodes;
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, other);
            await stable(page);
            const u = await whereIs(page, t.id);
            await hoverUntimed(page, u);
            await frames(page, 3);
            const before = await page.evaluate(`(() => ${INSPECTOR})()`);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: `${SEL_IS} && (${INSPECTOR}) !== p.before`,
                    params: { id: u.id, before },
                    pix: at(u, 40, 40),
                },
                () => clickHere(page),
            );
        },
    },
    {
        id: "app-click-glide-settled",
        name: "Click a node until the Focus selected glide has settled (an animation's length, not input latency)",
        animation: true,
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await stable(page);
            const u = (await nodeTargets(page, 2))[rep % 2] ?? ctx.nodes[rep % 2];
            await hoverUntimed(page, u);
            await frames(page, 3);
            const r = await timed(
                page,
                { type: "pointerdown", cond: SEL_IS, params: { id: u.id }, pix: at(u, 40, 40), settle: "camera" },
                () => clickHere(page),
            );
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-shift-click-add",
        name: "Shift-click a second node (Inspector shows the summary)",
        async run(page, ctx) {
            const [a, b] = ctx.nodes;
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, a);
            await stable(page);
            const u = await whereIs(page, b.id);
            await page.keyboard.down("Shift");
            await hoverUntimed(page, u);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                    pix: at(u, 40, 40),
                },
                () => clickHere(page),
            );
            await page.keyboard.up("Shift");
            return r;
        },
    },
    {
        id: "app-escape-deselect",
        name: "Escape clears the selection",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await selectUntimed(page, t);
            await stable(page);
            const u = await whereIs(page, t.id);
            return timed(
                page,
                { type: "keydown", cond: "el.session.selection.nodes.length === 0", pix: at(u, 40, 40) },
                () => page.keyboard.press("Escape"),
            );
        },
    },
    {
        id: "app-right-click-menu",
        name: "Right-click a node until the canvas menu shows (DOM)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await hoverUntimed(page, t);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "[...document.querySelectorAll('[role=menu]')].some((m) => m.offsetParent !== null && m.querySelector('[role^=menuitem]'))",
                },
                () => page.mouse.click(t.x, t.y, { button: "right" }),
            );
            await page.keyboard.press("Escape");
            await frames(page, 5);
            return r;
        },
    },
    {
        id: "app-select-all",
        name: "Ctrl+A selects every node",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: "el.session.selection.nodes.length >= p.n",
                    params: { n: ctx.nodeCount },
                    pix: at(ctx.nodes[0], 40, 40),
                },
                () => page.keyboard.press("Control+a"),
            );
            await page.keyboard.press("Escape");
            await until(page, "el.session.selection.nodes.length === 0");
            return r;
        },
    },
    {
        id: "app-grow-neighborhood",
        name: "G grows the selection to the neighborhood",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, ctx.nodes[rep % 2]);
            await stable(page);
            return timed(page, { type: "keydown", cond: "el.session.selection.nodes.length > 1", pix: "all" }, () =>
                page.keyboard.press("g"),
            );
        },
    },
    {
        id: "app-fit-graph",
        name: "0 fits the graph (first moved frame; settled)",
        async run(page, ctx) {
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await page.mouse.wheel(0, -360);
            await stable(page);
            await camStill(page);
            await clickEmptyUntimed(page, ctx);
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all", settle: true }, () =>
                page.keyboard.press("0"),
            );
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-switch-dimension",
        name: "5 switches 2D and 3D (dimension changed and drawn; settled)",
        async run(page, ctx) {
            await stable(page);
            await clickEmptyUntimed(page, ctx);
            const before = await page.evaluate(
                () => document.querySelector("graphty-element").session.layout.dimension,
            );
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: "el.session.layout.dimension !== p.before",
                    params: { before },
                    pix: "all",
                    settle: true,
                },
                () => page.keyboard.press("5"),
            );
            await stable(page);
            // Back to the page's own dimension, untimed: the inputs after this one assume it.
            await page.keyboard.press("5");
            await until(page, "el.session.layout.dimension === p.before", { before });
            await stable(page);
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-table-open",
        name: "Shift+T opens the table (first data row shown, and the canvas redrawn at its new size)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const size = await page.evaluate(() => globalThis.__lat.canvasSize());
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: `!!${TABLE}?.querySelector('[role=gridcell], [role=cell]') && globalThis.__lat.canvasSize() !== p.size`,
                    params: { size },
                    pix: "all",
                },
                () => page.keyboard.press("Shift+T"),
            );
            await page.keyboard.press("Shift+T");
            await until(page, `!${TABLE}`);
            await stable(page);
            return r;
        },
    },
    {
        id: "app-table-sort",
        name: "Click a number column header to sort (first rows change; DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            if (!(await page.evaluate(`!!${TABLE}`))) await page.keyboard.press("Shift+T");
            await until(page, `!!${TABLE}?.querySelector('[role=gridcell]')`);
            // A number column: clicking its header sorts highest first (a text column's click keeps the order).
            const header = page
                .getByRole("region", { name: "Table" })
                .getByRole("button", { name: /^number\b/ })
                .first();
            if (!(await header.count())) return { skip: "the table has no number column" };
            const before = await page.evaluate(TABLE_FIRST_ROW);
            const r = await clickTimed(page, header, { cond: `${TABLE_FIRST_ROW} !== p.before`, params: { before } });
            return r;
        },
    },
    {
        id: "app-table-row-select",
        name: "Click a table row to select its node (selection state; the node may be off screen)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            if (!(await page.evaluate(`!!${TABLE}`))) await page.keyboard.press("Shift+T");
            await until(page, `!!${TABLE}?.querySelector('[role=gridcell]')`);
            const cell = page
                .getByRole("region", { name: "Table" })
                .getByRole("row")
                .nth(2 + (rep % 3))
                .getByRole("gridcell")
                .first();
            const r = await clickTimed(page, cell, { cond: "el.session.selection.nodes.length === 1" });
            await page.keyboard.press("Escape");
            await page.keyboard.press("Shift+T");
            await until(page, `!${TABLE}`);
            await stable(page);
            return r;
        },
    },
    {
        id: "app-quick-actions",
        name: "Ctrl+K opens the quick actions palette (DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: "[...document.querySelectorAll('[role=dialog]')].some((d) => d.offsetParent !== null || d.getClientRects().length)",
                },
                () => page.keyboard.press("Control+k"),
            );
            await page.keyboard.press("Escape");
            await until(
                page,
                "![...document.querySelectorAll('[role=dialog]')].some((d) => d.getClientRects().length)",
            );
            return r;
        },
    },
    {
        id: "app-find-keystroke",
        name: "Typing one character in Find updates the results (DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.keyboard.press("/");
            const box = page.getByRole("combobox", { name: "Find" });
            await box.waitFor();
            await box.fill("");
            await frames(page, 5);
            const r = await timed(
                page,
                { type: "keydown", cond: "!!document.querySelector('[aria-label=\"Find results\"] [role=option]')" },
                () => page.keyboard.press(ctx.findChar),
            );
            await box.fill("");
            await page.keyboard.press("Escape");
            await frames(page, 5);
            return r;
        },
    },
    {
        id: "app-rail-data",
        name: "Click the Data place in the rail (DOM)",
        async run(page) {
            const data = page
                .getByRole("toolbar", { name: "Places" })
                .getByRole("button", { name: "Data", exact: true });
            const r = await clickTimed(page, data, {
                cond: "!!document.querySelector('[aria-label=\"Data place\"]')?.getClientRects().length",
            });
            await page
                .getByRole("toolbar", { name: "Places" })
                .getByRole("button", { name: "Graph", exact: true })
                .click();
            await stable(page);
            return r;
        },
    },
    {
        id: "app-restyle-color",
        name: "Set the Everything layer's node color (Enter until the node is drawn in it)",
        async run(page, ctx) {
            // Always a color the node is not drawn in now.
            const now = await page.evaluate(
                `(() => { const el = document.querySelector("graphty-element"); return ${COLOR_OF(ctx.nodes[0].id)}; })()`,
            );
            const [color, hex] = now === "#FF0000" ? ["blue", "#0000FF"] : ["red", "#FF0000"];
            // A layer above Everything (a file's styles) decides this node's color: the restyle draws no change.
            const decidedBy = await page.evaluate((id) => {
                const st = document.querySelector("graphty-element").session.styles;
                const c = st.explain({ node: id }).channels.find((x) => x.channel === "node.color");
                return c ? (st.get(c.layerId)?.name ?? null) : null;
            }, ctx.nodes[0].id);
            if (decidedBy && decidedBy !== "Everything")
                return { skip: `the ${decidedBy} layer, above Everything, decides the node's color` };
            await everythingStyle(page);
            const field = page.getByRole("textbox", { name: /^Node color/ });
            await field.click();
            await field.fill(color);
            const t = await whereIs(page, ctx.nodes[0].id);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: `${COLOR_OF(ctx.nodes[0].id)} === p.hex`,
                    params: { hex },
                    pix: at(t, 8, 8),
                },
                () => page.keyboard.press("Enter"),
            );
            await stable(page);
            return r;
        },
    },
    {
        id: "app-undo",
        name: "Ctrl+Z undoes the last color change",
        async run(page, ctx) {
            await everythingStyle(page);
            const field = page.getByRole("textbox", { name: /^Node color/ });
            await field.click();
            await field.fill("green");
            await page.keyboard.press("Enter");
            await stable(page);
            const changed = await page.evaluate(
                `(() => { const el = document.querySelector("graphty-element"); return ${COLOR_OF(ctx.nodes[0].id)}; })()`,
            );
            await clickEmptyUntimed(page, ctx);
            const t = await whereIs(page, ctx.nodes[0].id);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: `${COLOR_OF(ctx.nodes[0].id)} !== p.changed`,
                    params: { changed },
                    pix: at(t, 8, 8),
                },
                () => page.keyboard.press("Control+z"),
            );
            await stable(page);
            return r;
        },
    },
    ...["drag-node", "drop-node", "drag-orbit-3d", "drag-pan", "wheel-zoom", "pinch-ctrl-wheel"].map((id) => ({
        ...ELEMENT.find((i) => i.id === id),
    })),
];

// ------------------------------------------------------------------ the rest of the app's inputs (catalog 2.9 to 2.15)

const SHOWN = (sel) =>
    `[...document.querySelectorAll(${JSON.stringify(sel)})].some((d) => d.getClientRects().length > 0)`;
const MENU_SHOWN =
    "[...document.querySelectorAll('[role=menu]')].some((m) => m.offsetParent !== null && m.querySelector('[role^=menuitem]'))";
const DIALOG_SHOWN = SHOWN("[role=dialog]");
// The Analyze popover (its dropdown, not the toolbar button of the same name) with its content drawn.
const ANALYZE_SHOWN =
    "[...document.querySelectorAll('[aria-label=\"Analyze\"]')].some((d) => d.getClientRects().length > 0 && !!d.querySelector('input, [role=option]'))";
const FOCUSED = "(document.activeElement?.getAttribute('aria-label') ?? '') + '|' + (document.activeElement?.id ?? '')";
const nodeColor = (page, id) =>
    page.evaluate(`(() => { const el = document.querySelector("graphty-element"); return ${COLOR_OF(id)}; })()`);

/** Escape until no dialog or menu is left open (untimed). */
async function dismiss(page) {
    for (let i = 0; i < 3; i++) {
        if (!(await page.evaluate(`${DIALOG_SHOWN} || ${MENU_SHOWN} || ${ANALYZE_SHOWN}`))) return;
        await page.keyboard.press("Escape");
        await frames(page, 3);
    }
}

/** A key on the focused canvas until a DOM condition holds, then closed again. */
const appKey = (id, name, key, cond, opts = {}) => ({
    id,
    name,
    async run(page, ctx, rep) {
        await clickEmptyUntimed(page, ctx);
        if (opts.select) await selectUntimed(page, ctx.nodes[rep % 2]);
        const before = await page.evaluate(`(() => ${opts.before ?? "null"})()`);
        const r = await timed(page, { type: "keydown", cond, params: { before } }, () => page.keyboard.press(key));
        if (r.timeout && opts.skipOnTimeout) return { skip: opts.skipOnTimeout };
        await dismiss(page);
        if (opts.after) await opts.after(page);
        await clickEmptyUntimed(page, ctx);
        return r;
    },
});

/** Opens quick actions and types `words` (untimed); the palette is left open. */
async function quickActions(page, ctx, words) {
    await clickEmptyUntimed(page, ctx);
    await page.keyboard.press("Control+k");
    await until(page, DIALOG_SHOWN + " || " + SHOWN("[role=listbox]"));
    await page.keyboard.type(words);
    await frames(page, 5);
}

const PALETTE_OPTIONS = `[...document.querySelectorAll('[role=listbox] [role=option]')].filter((o) => o.getClientRects().length).map((o) => o.textContent).join('|')`;

const APP_MORE = [
    ...[
        ["app-right-click-edge-menu", "edge"],
        ["app-right-click-empty-menu", "empty"],
    ].map(([id, what]) => ({
        id,
        name: `Right-click ${what === "edge" ? "an edge" : "empty canvas"} until its canvas menu shows (DOM)`,
        async run(page, ctx) {
            const p = what === "edge" ? ctx.edges[0] : ctx.empty;
            if (!p) return { skip: "no edge whose middle is clear of nodes" };
            await clickEmptyUntimed(page, ctx);
            await page.mouse.move(p.x, p.y);
            await frames(page, 3);
            const r = await timed(page, { type: "pointerdown", cond: MENU_SHOWN }, () =>
                page.mouse.click(p.x, p.y, { button: "right" }),
            );
            await dismiss(page);
            return r;
        },
    })),
    appKey(
        "app-shift-f10-menu",
        "Shift+F10 on the focused canvas opens the canvas menu (DOM)",
        "Shift+F10",
        MENU_SHOWN,
        {
            select: true,
        },
    ),
    {
        id: "app-menu-clear-selection",
        name: "Canvas menu > Clear selection (the Selected look drawn gone)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, t);
            await stable(page);
            const u = await whereIs(page, t.id);
            await page.mouse.click(ctx.empty.x, ctx.empty.y, { button: "right" });
            const item = page.getByRole("menuitem", { name: /^Clear selection/ });
            await item.waitFor();
            const r = await clickTimed(page, item, {
                cond: "el.session.selection.nodes.length === 0",
                pix: at(u, 40, 40),
            });
            await dismiss(page);
            return r;
        },
    },
    {
        id: "app-menu-fit",
        name: "Canvas menu > Fit (first moved frame; settled)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await page.mouse.wheel(0, -360);
            await stable(page);
            await camStill(page);
            const empty = await emptyPoint(page);
            if (!empty) return { skip: "no empty point after zooming in" };
            await page.mouse.click(empty.x, empty.y, { button: "right" });
            const item = page.getByRole("menuitem", { name: /^Fit$|^Fit\b(?! selection)/ }).first();
            await item.waitFor();
            const r = await clickTimed(page, item, { cond: CAM_MOVED, pix: "all", settle: true });
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-fit-selection",
        name: "F fits the selection (first moved frame; settled)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, ctx.nodes[rep % 2]);
            await stable(page);
            await camStill(page);
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await page.mouse.wheel(0, 480);
            await camStill(page);
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all", settle: true }, () =>
                page.keyboard.press("f"),
            );
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-auto-rotate",
        name: "9 starts auto-rotate (first turned frame)",
        dims: ["3d"],
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.press("9"),
            );
            await page.keyboard.press("9");
            await camStill(page);
            ctx.dirty = true;
            return r;
        },
    },
    appKey(
        "app-legend-key",
        "L shows or hides the legend (DOM)",
        "l",
        `${SHOWN('section[aria-label="Legend"]')} !== p.before`,
        { before: SHOWN('section[aria-label="Legend"]') },
    ),
    {
        id: "app-quick-actions-type",
        name: "Type one character in quick actions (the list filtered; DOM)",
        async run(page, ctx) {
            await quickActions(page, ctx, "");
            const before = await page.evaluate(PALETTE_OPTIONS);
            const r = await timed(
                page,
                { type: "keydown", cond: `${PALETTE_OPTIONS} !== p.before`, params: { before } },
                () => page.keyboard.press("z"),
            );
            await dismiss(page);
            return r;
        },
    },
    {
        id: "app-quick-actions-zoom",
        name: "Quick actions: type Zoom in (or out), press Enter (first moved frame)",
        async run(page, ctx, rep) {
            await quickActions(page, ctx, rep % 2 ? "Zoom out" : "Zoom in");
            if (!(await page.evaluate(PALETTE_OPTIONS)).includes("Zoom")) {
                await dismiss(page);
                return { skip: "quick actions has no Zoom command" };
            }
            await camStill(page);
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED, pix: "all" }, () =>
                page.keyboard.press("Enter"),
            );
            await dismiss(page);
            await camStill(page);
            ctx.dirty = true;
            return r;
        },
    },
    appKey("app-find-focus", "/ focuses Find (DOM focus)", "/", `${FOCUSED} !== p.before`, { before: FOCUSED }),
    {
        id: "app-find-enter",
        name: "Enter on a Find result selects its node",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.keyboard.press("/");
            const box = page.getByRole("combobox", { name: "Find" });
            await box.waitFor();
            await box.fill(ctx.findChar);
            await until(page, "!!document.querySelector('[aria-label=\"Find results\"] [role=option]')");
            const r = await timed(
                page,
                { type: "keydown", cond: "el.session.selection.nodes.length > 0", pix: "all" },
                () => page.keyboard.press("Enter"),
            );
            await box.fill("").catch(() => {});
            await dismiss(page);
            await page.keyboard.press("Escape");
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-redo",
        name: "Shift+Ctrl+Z redoes an undone color change",
        async run(page, ctx) {
            await everythingStyle(page);
            const field = page.getByRole("textbox", { name: /^Node color/ });
            await field.click();
            await field.fill("purple");
            await page.keyboard.press("Enter");
            await stable(page);
            const changed = await nodeColor(page, ctx.nodes[0].id);
            await undoUntimed(page, ctx);
            const t = await whereIs(page, ctx.nodes[0].id);
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: `${COLOR_OF(ctx.nodes[0].id)} === p.changed`,
                    params: { changed },
                    pix: at(t, 8, 8),
                },
                () => page.keyboard.press("Control+Shift+z"),
            );
            await stable(page);
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-undo-node-move",
        name: "Ctrl+Z after moving a node (drawn back where it was)",
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 2500 + rep))[0];
            if (!t) return { skip: "no node to drag" };
            const rect = await elementRect(page);
            await clickEmptyUntimed(page, ctx);
            await page.mouse.move(t.x, t.y);
            await frames(page, 2);
            await page.mouse.down();
            for (let i = 1; i <= 5; i++) {
                await page.mouse.move(t.x + 8 * i, t.y);
                await frames(page, 1);
            }
            await page.mouse.up();
            await stable(page);
            await camStill(page);
            await clickEmptyUntimed(page, ctx);
            const u = await whereIs(page, t.id);
            const home = { id: t.id, x: u.x - 40 - rect.left, y: u.y - rect.top };
            const r = await timed(
                page,
                { type: "keydown", cond: NEAR(3), params: home, pix: { x: u.x - 40, y: u.y, w: 30, h: 30 } },
                () => page.keyboard.press("Control+z"),
            );
            ctx.dirty = true;
            return r;
        },
    },
    appKey("app-f6-next-panel", "F6 moves focus to the next panel (DOM focus)", "F6", `${FOCUSED} !== p.before`, {
        before: FOCUSED,
    }),
    appKey("app-shortcuts-dialog", "? opens the keyboard shortcuts dialog (DOM)", "Shift+Slash", DIALOG_SHOWN),
    appKey("app-settings-dialog", "Ctrl+, opens the settings dialog (DOM)", "Control+Comma", DIALOG_SHOWN),
    appKey("app-export-dialog", "Ctrl+E opens the export dialog (DOM)", "Control+e", DIALOG_SHOWN),
    appKey("app-save-as-dialog", "Shift+Ctrl+S opens Save as (DOM)", "Control+Shift+s", DIALOG_SHOWN),
    appKey("app-analyze-key", "Shift+A opens Analyze (DOM)", "Shift+A", ANALYZE_SHOWN),
    appKey("app-path-key", "P opens Path between for the selected node (DOM)", "p", ANALYZE_SHOWN, { select: true }),
    appKey(
        "app-assistant-key",
        "Ctrl+I opens the assistant (DOM)",
        "Control+i",
        // The rail's Assistant button is always there; its place being the current one is the assistant shown.
        `!!document.querySelector('[data-assistant-door][aria-current="page"]')`,
        { skipOnTimeout: "the assistant place is hidden in this build" },
    ),
    {
        id: "app-camera-preset",
        name: "Camera menu > Top (first moved frame; glide settled)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await camStill(page);
            await page.getByRole("button", { name: /^Camera\b/ }).click();
            const item = page.getByRole("menuitem", { name: /^Top\b/ });
            await item.waitFor();
            const r = await clickTimed(page, item, { cond: CAM_MOVED, pix: "all", settle: "camera" });
            await ctx.refit();
            ctx.dirty = true;
            return r;
        },
    },
    ...[
        ["app-main-menu", /^Main menu$/],
        ["app-camera-menu", /^Camera\b/],
        ["app-mode-menu", /^Mode, /],
    ].map(([id, name]) => ({
        id,
        name: `Open the ${id.slice(4, -5)} menu (DOM)`,
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const r = await clickTimed(page, page.getByRole("button", { name }).first(), { cond: MENU_SHOWN });
            await dismiss(page);
            return r;
        },
    })),
    ...["Views", "Notes"].map((place) => ({
        id: `app-rail-${place.toLowerCase()}`,
        name: `Click the ${place} place in the rail (DOM)`,
        async run(page) {
            const btn = page.getByRole("toolbar", { name: "Places" }).getByRole("button", { name: place, exact: true });
            if (!(await btn.count())) return { skip: `no ${place} place in the rail` };
            const r = await clickTimed(page, btn, {
                cond: `!!document.querySelector('[aria-label="${place} place"]')?.getClientRects().length`,
            });
            await page
                .getByRole("toolbar", { name: "Places" })
                .getByRole("button", { name: "Graph", exact: true })
                .click();
            await stable(page);
            return r;
        },
    })),
    {
        id: "app-layer-row-click",
        name: "Click the Everything layer row (the row selected; DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.keyboard.press("Escape");
            const row = page.getByRole("treeitem", { name: /^Everything,/ });
            const SELECTED = `document.querySelector('[role=treeitem][aria-selected=true]')?.textContent?.startsWith('Everything') === true`;
            if (await page.evaluate(SELECTED)) {
                await page.getByRole("treeitem").nth(1).click();
                await frames(page, 3);
            }
            const r = await clickTimed(page, row, { cond: SELECTED });
            await page.keyboard.press("Escape");
            return r;
        },
    },
    {
        id: "app-inspector-values-tab",
        name: "Click the Inspector's Values tab (tab content shown; DOM)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, ctx.nodes[rep % 2]);
            const tabs = page.getByRole("complementary", { name: "Inspector" });
            const style = tabs.getByRole("tab", { name: "Style", exact: true });
            if (await style.count()) await style.click();
            const values = tabs.getByRole("tab", { name: "Values", exact: true });
            if (!(await values.count())) return { skip: "the Inspector has no Values tab here" };
            const r = await clickTimed(page, values, {
                cond: `[...document.querySelectorAll('[aria-label="Inspector"] [role=tab][aria-selected=true]')].some((t) => t.textContent.trim().startsWith('Values')) && [...document.querySelectorAll('[aria-label="Inspector"] [role=tabpanel]')].some((t) => t.getClientRects().length > 0 && t.textContent.trim() !== '')`,
            });
            await page.keyboard.press("Escape");
            return r;
        },
    },
    {
        id: "app-style-node-size",
        name: "Type a node size in the Style tab and press Enter (the node drawn at the new size)",
        async run(page, ctx, rep) {
            await everythingStyle(page);
            const field = page.getByRole("spinbutton", { name: /^Node size/ }).first();
            if (!(await field.count())) return { skip: "no Node size field" };
            await field.click();
            await field.fill(rep % 2 ? "3" : "2");
            const t = await whereIs(page, ctx.nodes[0].id);
            const SIZE = `JSON.stringify(el.session.styles.explain({ node: p.id }).merged['node.size'] ?? null)`;
            const before = await page.evaluate(
                `(() => { const el = document.querySelector("graphty-element"); const p = ${JSON.stringify({ id: ctx.nodes[0].id })}; return ${SIZE}; })()`,
            );
            await frames(page, 3);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: `${SIZE} !== p.before`,
                    params: { id: ctx.nodes[0].id, before },
                    pix: at(t, 40, 40),
                },
                () => page.keyboard.press("Enter"),
            );
            await stable(page);
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-resize-window",
        name: "Resize the window (the canvas drawn at its new size)",
        async run(page, ctx, rep) {
            const vp = page.viewportSize();
            const to = { width: vp.width + (rep % 2 ? 120 : -120), height: vp.height };
            const wide = await page.evaluate(
                () => document.querySelector("graphty-element").getBoundingClientRect().width,
            );
            const r = await timed(
                page,
                {
                    type: "resize",
                    cond: "(() => { const c = [...(el.shadowRoot?.querySelectorAll('canvas') ?? []), ...el.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const w = c.getBoundingClientRect().width; return Math.abs(w - p.wide) > 1 && Math.abs(c.width - Math.round(w * devicePixelRatio)) <= 2; })()",
                    params: { wide },
                    pix: "all",
                },
                () => page.setViewportSize(to),
            );
            await page.setViewportSize(vp);
            await stable(page);
            ctx.dirty = true;
            return r;
        },
    },
];

// Canvas inputs again with a panel open (INPUT-CATALOG.md, condition A).
const PANEL_IDS = [
    "hover-node",
    "app-click-select-node",
    "app-escape-deselect",
    "wheel-zoom",
    "drag-orbit-3d",
    "drag-pan",
];

const APP_LATE_MORE = [
    {
        id: "app-run-pagerank",
        name: "Analyze > PageRank > Run (its layer listed and drawn)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.getByRole("button", { name: "Analyze", exact: true }).click();
            const opt = page.getByRole("option", { name: /^PageRank\b/ }).first();
            if (!(await opt.count())) {
                await dismiss(page);
                return { skip: "no PageRank in Analyze" };
            }
            await opt.click();
            const before = await page.evaluate(TREE_COUNT);
            const r = await clickTimed(page, page.getByRole("button", { name: /^Run PageRank/ }), {
                cond: `${TREE_COUNT} > p.before`,
                params: { before },
                pix: "all",
            });
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-timeline-play",
        name: "Timeline Play (first changed readout and frame)",
        async run(page, ctx) {
            if (!ctx.hasYear) return { skip: "the graph has no year column" };
            const dock = page.getByRole("region", { name: "Timeline" });
            if (!(await dock.count())) return { skip: "no timeline open" };
            const READ = "document.querySelector('[data-testid=\"time-readout\"]')?.textContent ?? ''";
            const before = await page.evaluate(READ);
            const r = await clickTimed(page, dock.getByRole("button", { name: "Play", exact: true }), {
                cond: `(${READ}) !== p.before`,
                params: { before },
                pix: "all",
            });
            const pause = dock.getByRole("button", { name: "Pause", exact: true });
            if (await pause.count()) await pause.click();
            return r;
        },
    },
    {
        id: "app-timeline-key",
        name: "T hides or shows the timeline (dock shown or gone; DOM)",
        async run(page, ctx) {
            if (!ctx.hasYear) return { skip: "the graph has no year column" };
            const DOCK = SHOWN('section[aria-label="Timeline"]');
            await clickEmptyUntimed(page, ctx);
            const before = await page.evaluate(DOCK);
            const r = await timed(page, { type: "keydown", cond: `${DOCK} !== p.before`, params: { before } }, () =>
                page.keyboard.press("t"),
            );
            if (before) await page.keyboard.press("t");
            await until(page, `${DOCK} === p.before`, { before });
            await stable(page);
            ctx.dirty = true;
            return r;
        },
    },
];

APP.push(...APP_MORE);

const APP_TOUCH = [
    {
        id: "app-long-press-menu",
        name: "Touch-and-hold a node until the canvas menu shows (DOM; the 500 ms hold excluded)",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            const tp = [{ x: t.x, y: t.y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            await clickEmptyUntimed(page, ctx);
            const r = await timed(page, { type: "pointerdown", cond: MENU_SHOWN, capMs: 5000 }, () =>
                cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp }),
            );
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await dismiss(page);
            // compact-mantine's press gesture calls a press held still for 500 ms a hold (HOLD_MS).
            const less = (v) => (typeof v === "number" ? +(v - 500).toFixed(1) : v);
            return { ...r, ms: less(r.ms), stateMs: less(r.stateMs) };
        },
    },
];

const TABLE_SCROLL = {
    id: "app-table-scroll-60hz",
    name: "Scroll the table, 60 wheel ticks a second (lag after the last tick; dropped frames)",
    async run(page, ctx, rep) {
        const grid = await page.evaluate(() => {
            // The grid can be taller than the page (its rows scroll inside the dock): aim at the dock's middle,
            // clipped to the viewport, or the wheel lands outside the page and reaches nothing.
            const sec = document.querySelector('section[aria-label="Table"]');
            if (!sec?.querySelector("[role=grid]")) return null;
            const r = sec.getBoundingClientRect();
            const top = Math.max(r.top, 0),
                bottom = Math.min(r.bottom, innerHeight);
            return { x: r.left + r.width / 2, y: top + (bottom - top) * 0.6 };
        });
        if (!grid) return { skip: "no table grid" };
        const dir = rep % 2 ? -1 : 1;
        return burst(page, {
            type: "wheel",
            track: `[...(document.querySelector('section[aria-label="Table"] [role=grid]')?.querySelectorAll('[role=row]') ?? [])].slice(1, 3).map((r) => r.textContent).join('|')`,
            hz: 60,
            count: 20,
            pix: false,
            before: () => page.mouse.move(grid.x, grid.y),
            send: () => rawWheel(ctx.cdp, grid.x, grid.y, dir * 60),
        });
    },
};

// The first of each after the graph opens, before any warm-up.
const COLD_APP = [
    {
        id: "app-first-select-inspector",
        name: "First click on a node after opening: selection drawn and the Inspector names it (cold)",
        async run(page, ctx) {
            const t = ctx.nodes[0];
            await hoverUntimed(page, t);
            await frames(page, 3);
            const before = await page.evaluate(`(() => ${INSPECTOR})()`);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: `${SEL_IS} && (${INSPECTOR}) !== p.before`,
                    params: { id: t.id, before },
                    pix: at(t, 40, 40),
                },
                () => clickHere(page),
            );
        },
    },
];
const COLD_APP_IDS = ["hover-node", "app-right-click-menu", "app-restyle-color", "app-table-open"];

// The cases another session found sensitive to the Inspector's Style tab being open (its rows read the style counts).
const STYLE_OPEN_IDS = [
    "hover-node",
    "app-click-select-node",
    "app-click-inspector",
    "app-escape-deselect",
    "app-restyle-color",
];

// Panels and actions that change the graph or the app for good, after the rest, in this order.
const APP_LATE = [
    {
        id: "app-tooltip-node",
        name: "Hover a node until its tooltip is drawn (tooltip layer added untimed)",
        setup: addTooltips,
        run: TIPS[0].run,
    },
    { id: "app-tooltip-edge", name: "Hover an edge until its tooltip is drawn", run: TIPS[1].run },
    {
        id: "app-run-analysis",
        name: "Analyze > Degree > Run (its layer listed and drawn)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.getByRole("button", { name: "Analyze", exact: true }).click();
            await page.getByRole("option", { name: "Degree", exact: true }).click();
            const before = await page.evaluate(TREE_COUNT);
            const r = await clickTimed(page, page.getByRole("button", { name: "Run Degree" }), {
                cond: `${TREE_COUNT} > p.before`,
                params: { before },
                pix: "all",
            });
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-shortest-path",
        name: "Analyze > Shortest path > Find path between two nodes (its layer listed and drawn)",
        async run(page, ctx) {
            const [a, b] = ctx.nodes;
            await clickEmptyUntimed(page, ctx);
            await selectUntimed(page, a);
            await page.getByRole("button", { name: "Analyze", exact: true }).click();
            await page.getByRole("option", { name: "Shortest path", exact: true }).click();
            const to = page.getByRole("combobox", { name: "To node" });
            await to.click();
            await to.fill(b.id);
            await page
                .getByRole("option", {
                    name: new RegExp("^" + b.id.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + String.raw`\b`),
                })
                .first()
                .click();
            const before = await page.evaluate(TREE_COUNT);
            await camStill(page);
            const from = await whereIs(page, a.id);
            const r = await clickTimed(page, page.getByRole("button", { name: "Find path" }), {
                cond: `${TREE_COUNT} > p.before`,
                params: { before },
                pix: at(from, 40, 40),
            });
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-bind-style",
        name: "Node color by attribute: pick the first attribute (the node drawn in its new color)",
        async run(page, ctx) {
            await everythingStyle(page);
            await page.getByRole("button", { name: "Node color by attribute" }).click();
            const opt = page.getByRole("listbox", { name: "Node color by attribute" }).getByRole("option").first();
            const before = await page.evaluate(
                `(() => { const el = document.querySelector("graphty-element"); return ${COLOR_OF(ctx.nodes[0].id)}; })()`,
            );
            const t = await whereIs(page, ctx.nodes[0].id);
            const r = await clickTimed(page, opt, {
                cond: `${COLOR_OF(ctx.nodes[0].id)} !== p.before`,
                params: { before },
                pix: at(t, 8, 8),
            });
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-layer-visibility",
        name: "Hide, then show, the Everything layer (its nodes drawn gone, then back)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const t = await whereIs(page, ctx.nodes[0].id);
            await frames(page, 3);
            const hide = await clickTimed(page, page.getByRole("button", { name: "Hide Everything" }), {
                cond: "true",
                pix: at(t, 10, 10),
            });
            await frames(page, 3);
            const show = await clickTimed(page, page.getByRole("button", { name: /^(Show|Hide) Everything$/ }), {
                cond: "true",
                pix: at(t, 10, 10),
            });
            await stable(page);
            return [hide, show];
        },
    },
    {
        id: "app-legend-toggle",
        name: "Legend button after an analysis (the card shown or hidden; DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            if (!(await page.getByRole("treeitem", { name: /^Degree,/ }).count())) {
                await page.getByRole("button", { name: "Analyze", exact: true }).click();
                await page.getByRole("option", { name: "Degree", exact: true }).click();
                await page.getByRole("button", { name: "Run Degree" }).click();
                await page.getByRole("treeitem", { name: /^Degree,/ }).waitFor();
                await page.keyboard.press("Escape");
                await stable(page);
            }
            const LEGEND = "!!document.querySelector('section[aria-label=\"Legend\"]')?.getClientRects().length";
            const before = await page.evaluate(LEGEND);
            return clickTimed(
                page,
                page.getByRole("toolbar", { name: "Canvas tools" }).getByRole("button", { name: "Legend" }),
                {
                    cond: `${LEGEND} !== p.before`,
                    params: { before },
                },
            );
        },
    },
    {
        id: "app-inspector-item",
        name: "Click the Inspector's Largest component item (its nodes selected and drawn)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.keyboard.press("Escape");
            const item = page
                .getByRole("complementary", { name: "Inspector" })
                .getByRole("button", { name: /^Largest component/ });
            if (!(await item.count())) return { skip: "the Inspector shows no Largest component item" };
            const r = await clickTimed(page, item, { cond: "el.session.selection.nodes.length > 1", pix: "all" });
            await page.keyboard.press("Escape");
            await clickEmptyUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-timeline-step",
        name: "Timeline Step forward (year as node time; readout and drawing change)",
        async run(page, ctx) {
            if (!ctx.hasYear) return { skip: "the graph has no year column" };
            await clickEmptyUntimed(page, ctx);
            const toggle = page.getByRole("button", { name: "Timeline", exact: true });
            if (!(await toggle.count())) {
                await page
                    .getByRole("toolbar", { name: "Places" })
                    .getByRole("button", { name: "Data", exact: true })
                    .click();
                await page.getByRole("button", { name: "Add to node attributes" }).click();
                await page.getByRole("menuitem", { name: "Time" }).hover();
                await page.getByRole("menuitem", { name: /^year\b/ }).click();
                await page
                    .getByRole("toolbar", { name: "Places" })
                    .getByRole("button", { name: "Graph", exact: true })
                    .click();
                await toggle.waitFor();
            }
            if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
            const dock = page.getByRole("region", { name: "Timeline" });
            await dock.waitFor();
            const READ = "document.querySelector('[data-testid=\"time-readout\"]')?.textContent ?? ''";
            const before = await page.evaluate(READ);
            return clickTimed(page, dock.getByRole("button", { name: "Step forward" }), {
                cond: `(${READ}) !== p.before`,
                params: { before },
                pix: "all",
            });
        },
    },
    {
        id: "app-export-csv",
        name: "Main menu > Export... > Export (data as CSV): click to the download starting",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.getByRole("button", { name: "Main menu" }).click();
            await page.getByRole("menuitem", { name: /^Export/ }).click();
            const dialog = page.getByRole("dialog", { name: "Export" });
            const go = dialog.getByRole("button", { name: "Export", exact: true });
            await go.waitFor();
            const box = await go.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.evaluate(() => {
                globalThis.__exportAt = null;
                addEventListener("pointerdown", (e) => (globalThis.__exportAt = performance.timeOrigin + e.timeStamp), {
                    capture: true,
                    once: true,
                });
            });
            const download = page.waitForEvent("download");
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            const d = await download;
            const end = Date.now();
            const t0 = await page.evaluate(() => globalThis.__exportAt);
            await d.cancel().catch(() => {});
            await page.keyboard.press("Escape");
            return { ms: +(end - t0).toFixed(1), stateMs: null, sawInput: t0 !== null, timeout: false };
        },
    },
    {
        id: "app-labels-on",
        name: "Add a node label in the Style panel (Label > first attribute; the label drawn)",
        async run(page, ctx) {
            await everythingStyle(page);
            await page.getByRole("button", { name: "Add to node text" }).click();
            await page.getByRole("menuitem", { name: "Label", exact: true }).click();
            const list = page.getByRole("listbox", { name: "Label" });
            const opt = (await list.getByRole("option", { name: /^name\b/ }).count())
                ? list.getByRole("option", { name: /^name\b/ }).first()
                : list.getByRole("option", { name: "Node id" });
            const t = await whereIs(page, ctx.nodes[0].id);
            const r = await clickTimed(page, opt, {
                cond: `el.session.styles.explain({ node: p.id }).merged['node.label'] !== undefined`,
                params: { id: ctx.nodes[0].id },
                pix: { x: t.x, y: t.y, w: 200, h: 120 },
            });
            await undoUntimed(page, ctx);
            return r;
        },
    },
    {
        id: "app-layout-apply",
        name: "Layout > Circle or Grid > Apply (first moved frame; settled)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await page.getByRole("button", { name: "Layout", exact: true }).click();
            await page.getByRole("option", { name: rep % 2 ? /^Grid\b/ : /^Circle\b/ }).click();
            const r = await clickTimed(
                page,
                page.getByRole("dialog", { name: "Layout" }).getByRole("button", { name: "Apply" }),
                {
                    cond: "true",
                    pix: "all",
                    settle: true,
                },
            );
            await page.keyboard.press("Escape");
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-layout-rerun-force",
        name: "Layout > Force > Apply (re-run; first moved frame; settled)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            await page.getByRole("button", { name: "Layout", exact: true }).click();
            await page.getByRole("option", { name: /^Force\b/ }).click();
            const r = await clickTimed(
                page,
                page.getByRole("dialog", { name: "Layout" }).getByRole("button", { name: "Apply" }),
                {
                    cond: "true",
                    pix: "all",
                    settle: true,
                },
            );
            await page.keyboard.press("Escape");
            ctx.dirty = true;
            return r;
        },
    },
];

/** Canvas inputs with the table open (the canvas shorter, the table re-marking rows), then its scroll. */
async function tablePhase(page, ctx, sp, reps, base, out) {
    const tableOpen = wanted([...variant(APP, PANEL_IDS, "table-open", "table open"), TABLE_SCROLL], sp);
    if (tableOpen.length) {
        await clickEmptyUntimed(page, ctx);
        if (!(await page.evaluate(`!!${TABLE}`))) await page.keyboard.press("Shift+T");
        await until(page, `!!${TABLE}?.querySelector('[role=gridcell]')`);
        await stable(page);
        ctx.dirty = true;
        await roundRobin(page, ctx, tableOpen, reps, base, out);
        await page.keyboard.press("Shift+T");
        await until(page, `!${TABLE}`);
        await stable(page);
        ctx.dirty = true;
    }
}

/** The cases that change the graph or the app for good, in order, with the timeline-open phase among them. */
async function latePhase(page, ctx, sp, reps, base, out) {
    for (const inter of [...wanted(APP_LATE, sp), { timelinePhase: true }, ...wanted(APP_LATE_MORE, sp)]) {
        if (inter.timelinePhase) {
            // Canvas inputs with the timeline open, when a timeline step above opened it.
            const open = await page.evaluate(SHOWN('section[aria-label="Timeline"]'));
            const list = wanted(variant(APP, PANEL_IDS, "timeline-open", "timeline open"), sp);
            if (open && list.length) {
                await newPhase(ctx);
                await roundRobin(page, ctx, list, reps, base, out);
            }
            continue;
        }
        try {
            if (inter.setup) await inter.setup(page);
        } catch (e) {
            appendFileSync(
                out,
                JSON.stringify(
                    row(base, inter, [], 0, {
                        errors: [
                            String(e?.message ?? e)
                                .split("\n")[0]
                                .slice(0, 200),
                        ],
                    }),
                ) + "\n",
            );
            continue;
        }
        await newPhase(ctx);
        await roundRobin(page, ctx, [inter], reps, base, out);
    }
}

/**
 * Opens the built app in a new browser on the spec's graph, features, dimension and pixel ratio, with the hover look.
 * @returns the browser (b), with opened (the open's input and first-frame times) and facts (the graph drawn)
 */
async function openApp(spec, origin, base, out) {
    const b = await launch({ width: 1440, height: 900 }, spec.dpr ?? 1);
    try {
        const { page } = b;
        base.renderer = await rendererOf(page);
        checkRenderer(base.renderer);
        base.browser = await page.evaluate(() => /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? null);
        await page.goto(origin);
        // The usage-data question sits over the drawing until answered.
        await page
            .getByRole("button", { name: "No thanks" })
            .click({ timeout: 10000 })
            .catch(() => {});
        await watchOpen(page);
        const t0 = Date.now();
        await GRAPHS[spec.graph].open(page, dirname(out));
        await stable(page);
        b.openMs = Date.now() - t0;
        b.opened = await page.evaluate(() => ({ ...globalThis.__open, now: performance.now() }));
        // A control the walk cannot find fails that rep after a minute, not the whole page after ten.
        page.setDefaultTimeout(60000);
        if (spec.dim === "2d") {
            // The app's 5 key, not the Mode menu: no menu opens before the cold inputs.
            await page.keyboard.press("5");
            if (!(await until(page, "el.session.layout.dimension === '2d'", {}, 300))) {
                await page.getByRole("button", { name: /^Mode, / }).click();
                await page.getByRole("menuitemradio", { name: "2D" }).click();
            }
            await stable(page);
        }
        await addHoverLook(page);
        b.facts = await page.evaluate(() => {
            const el = document.querySelector("graphty-element");
            const n0 = el.session.data.nodes()[0] ?? {};
            return {
                renderPath: el.renderPath,
                nodes: el.session.data.nodes().length,
                edges: el.session.data.edges().length,
                dim: el.session.layout.dimension,
                hasYear: "year" in (n0.data ?? n0),
            };
        });
        b.cdp = await b.ctx.newCDPSession(page);
        return b;
    } catch (e) {
        await b.close();
        throw e;
    }
}

async function appPage(spec, out) {
    const dist = resolve(spec.dist);
    const server = await serve(dist);
    const query = spec.features ? "?features=" + spec.features : "";
    const origin = `http://127.0.0.1:${server.address().port}/${query}`;
    const t0Page = Date.now();
    const g = GRAPHS[spec.graph];
    const base = {
        surface: "graphty app",
        tierPage: spec.page,
        graph: g.label,
        features: spec.features || "default",
        dpr: spec.dpr ?? 1,
        // The build timed: when graphty/dist was written (tools/interaction-latency.mjs checks it against HEAD).
        appBuilt: statSync(join(dist, "index.html")).mtime.toISOString(),
        smoke: SMOKE || undefined,
        at: new Date().toISOString(),
        loadavg: loadavg()[0],
        cpus: /Cpus_allowed_list:\s*(\S+)/.exec(readFileSync("/proc/self/status", "utf8"))?.[1],
    };
    let b = null;
    try {
        const sp0 = { ...spec, dim: spec.dim === "2d" ? "2d" : "3d" };
        const cold = wanted(
            [...COLD_APP, ...variant(APP, COLD_APP_IDS, "cold", "first after opening")].map((i) =>
                i.id.endsWith("-cold") ? i : { ...i, id: `${i.id}-cold` },
            ),
            sp0,
        );
        await coldPages(
            cold,
            async () => {
                const c = await openApp(spec, origin, base, out);
                Object.assign(base, { path: c.facts.renderPath, n: c.facts.nodes, edges: c.facts.edges });
                return c;
            },
            (page) => coldContext(page, sp0),
            base,
            out,
        );
        b = await openApp(spec, origin, base, out);
        const { page, cdp, opened, facts } = b;
        base.openMs = b.openMs;
        Object.assign(base, { path: facts.renderPath, n: facts.nodes, edges: facts.edges, dim: facts.dim });
        appendFileSync(
            out,
            JSON.stringify(
                row(
                    base,
                    {
                        id: "app-open-cold",
                        name: "Open the graph: click to first frame with nodes (ms) and to settled",
                    },
                    [
                        {
                            ms:
                                opened.input !== null && opened.first !== null
                                    ? +(opened.first - opened.input).toFixed(1)
                                    : null,
                            settledMs: opened.input !== null ? +(opened.now - opened.input).toFixed(1) : null,
                            sawInput: opened.input !== null,
                            timeout: opened.first === null,
                            capMs: CAP_MS,
                            endsOn: "pixels",
                        },
                    ],
                    1,
                ),
            ) + "\n",
        );
        const ctx = await pageContext(page, { dim: facts.dim, n: facts.nodes });
        ctx.cdp = cdp;
        ctx.hoverRgb = HOVER_RGB;
        ctx.selRgb = await selectedRgb(page);
        ctx.nodeCount = facts.nodes;
        ctx.hasYear = facts.hasYear;
        ctx.refit = async () => {
            await page.keyboard.press("Escape");
            await page.mouse.click(ctx.empty.x, ctx.empty.y);
            await page.keyboard.press("0");
            await stable(page);
            await camStill(page);
        };
        ctx.findChar = await page.evaluate(() => {
            const n = document.querySelector("graphty-element").session.data.nodes()[0];
            const name = String(n.name ?? n.label ?? n.id);
            return name[0] ?? "a";
        });
        console.log("targets", JSON.stringify({ nodes: ctx.nodes, empty: ctx.empty, edges: ctx.edges }));
        if (ctx.nodes.length < 2 || !ctx.empty) throw new Error("no two pickable nodes or no empty point");
        const sp = { ...spec, dim: facts.dim };
        await roundRobin(page, ctx, wanted(APP, sp), spec.reps, base, out, cdp);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(bursts([60, 120]), sp), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await page.mouse.move(ctx.empty.x, ctx.empty.y);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted([...TOUCH, ...APP_TOUCH], sp), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
        ctx.dirty = true;
        // The Inspector's Style tab open while selecting and hovering.
        const styleOpen = wanted(variant(APP, STYLE_OPEN_IDS, "style-open", "Inspector Style tab open"), sp);
        if (styleOpen.length) {
            await ctx.refit();
            Object.assign(ctx, await pageContext(page, ctx));
            await openStyleTab(page, ctx);
            await ctx.refit();
            ctx.dirty = true;
            await roundRobin(page, ctx, styleOpen, spec.reps, base, out);
        }
        // The same click with the app's Focus selected glide switched off, to separate the glide's cost.
        const focusOff = wanted(
            variant(APP, ["app-click-select-node", "app-click-inspector"], "focus-off", "Focus selected off"),
            sp,
        );
        if (focusOff.length) {
            await setFocusSelected(page, false);
            await ctx.refit();
            ctx.dirty = true;
            await roundRobin(page, ctx, focusOff, spec.reps, base, out);
            await setFocusSelected(page, true);
        }
        await tablePhase(page, ctx, sp, spec.reps, base, out);
        await latePhase(page, ctx, sp, spec.reps, base, out);
        // Last, a force layout running under the canvas inputs (it changes the drawing for good).
        const running = spec.running ? wanted([...RUNNING, ...runningVariants()], sp) : [];
        if (running.length) {
            await newPhase(ctx);
            await runningPhase(page, ctx, running, spec.reps, base, out, cdp);
        }
    } catch (e) {
        appendFileSync(
            out,
            JSON.stringify({ ...base, failure: String(e?.message ?? e).slice(0, 300), errors: b?.errors }) + "\n",
        );
        console.log("failure", e?.message);
    } finally {
        appendFileSync(out, JSON.stringify({ ...base, wall: true, wallMs: Date.now() - t0Page }) + "\n");
        await b?.close();
        server.close();
    }
}

// ------------------------------------------------------------------ report

const BURST = /^burst-|-burst$/;

function report(file) {
    const rows = readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const fails = rows.filter((r) => r.failure);
    const walls = rows.filter((r) => r.wall);
    const cells = rows.filter((r) => !r.failure && !r.wall);
    const fmt = (x) => (x === null || x === undefined ? "-" : String(Math.round(x)));
    const where = (r) =>
        r.surface === "graphty app"
            ? `app ${r.graph} ${r.features} ${r.dim} dpr${r.dpr ?? 1} (${r.path}, ${K(r.n)})`
            : `element ${r.path} ${r.dim} ${r.mode ?? "plain"} dpr${r.dpr ?? 1} ${K(r.n)}`;
    const note = (r) =>
        [
            r.notMeasured,
            r.noVisible ? `${r.noVisible} of ${r.samples} never drawn a change (state time shown)` : "",
            r.timeouts ? r.timeouts + " timeouts (counted at the cap)" : "",
            r.clickWindowMissed ? `${r.clickWindowMissed} presses released over 300 ms later (no click)` : "",
            r.layoutStill ? `${r.layoutStill} with the layout settled by the end` : "",
            r.errors ? r.errors.length + " errors: " + r.errors[0] : "",
        ]
            .filter(Boolean)
            .join("; ");
    const animation = (r) => /glide-settled/.test(r.interaction);
    const input = cells.filter((r) => !BURST.test(r.interaction) && !animation(r));
    const out = [
        "## Input to result drawn",
        "",
        "| interaction | where | reps | drawn median ms | drawn p95 ms | worst ms | ends on | state median ms | settled median ms | note |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ];
    for (const r of input.sort((a, b) => (b.p95_ms ?? -1) - (a.p95_ms ?? -1)))
        out.push(
            `| ${r.interaction} | ${where(r)} | ${r.reps} | ${fmt(r.median_ms)} | ${fmt(r.p95_ms)} | ${fmt(r.worst_ms)} | ${r.endsOn ?? "-"} | ${fmt(r.state_median_ms)} | ${fmt(r.settled_median_ms)} | ${note(r)} |`,
        );
    for (const f of fails) out.push(`| (page failed) | ${where(f)} | | | | | | | | ${f.failure} |`);
    const b = cells.filter((r) => BURST.test(r.interaction));
    if (b.length) {
        out.push(
            "",
            "## Bursts: lag after the last input, and frames dropped",
            "",
            "| interaction | where | reps | lag median ms | lag p95 ms | ends on | sent / received Hz (median) | dropped frames (median) | longest frame gap (median) ms |",
            "|---|---|---|---|---|---|---|---|---|",
        );
        for (const r of b.sort((x, y) => (y.p95_ms ?? -1) - (x.p95_ms ?? -1)))
            out.push(
                `| ${r.interaction} | ${where(r)} | ${r.reps} | ${fmt(r.median_ms)} | ${fmt(r.p95_ms)} | ${r.endsOn ?? "-"} | ${fmt(r.sent_hz_median)} / ${fmt(r.achieved_hz_median)} | ${fmt(r.drops_median)} | ${fmt(r.max_gap_median_ms)} |`,
            );
    }
    const glide = cells.filter((r) => animation(r));
    if (glide.length) {
        out.push(
            "",
            "## Camera glide (an animation's length, not input latency)",
            "",
            "| where | selection drawn median ms | glide settled median ms |",
            "|---|---|---|",
        );
        for (const r of glide) out.push(`| ${where(r)} | ${fmt(r.median_ms)} | ${fmt(r.settled_median_ms)} |`);
    }
    if (walls.length) {
        out.push(
            "",
            "## Page wall time (the GPU lock is held this long per page)",
            "",
            "| page | where | minutes |",
            "|---|---|---|",
        );
        for (const w of walls) out.push(`| ${w.tierPage ?? ""} | ${where(w)} | ${(w.wallMs / 60000).toFixed(1)} |`);
        out.push(`| total | | ${(walls.reduce((a, w) => a + w.wallMs, 0) / 60000).toFixed(1)} |`);
    }
    console.log(out.join("\n"));
    const over150 = input.filter((r) => r.p95_ms > 150);
    console.log(`\n${over150.length} of ${input.length} input cells have a drawn p95 above 150 ms.`);
    const slow = input.filter((r) => r.p95_ms > PERCEIVED_MS);
    console.log(
        `\n${slow.length} of ${input.length} input cells have a drawn p95 above ${PERCEIVED_MS} ms (glide and bursts not counted).`,
    );
}

// ------------------------------------------------------------------ tiers (INPUT-CATALOG.md, sections 3.3 and 3.4)

const ids = (list) => `^(${list.join("|")})(-cold)?$`;
const QUICK_ELEMENT = [
    "hover-node",
    "pointer-leaves-node",
    "hover-edge",
    "click-select-node",
    "click-empty-deselect",
    "drag-node",
    "drop-node",
    "drag-orbit-3d",
    "drag-pan",
    "wheel-zoom",
    "key-camera-turn-or-pan",
    "touch-tap-select",
    "burst-drag-node-60hz",
    "burst-orbit-60hz",
];
// The app's own click (selection drawn, the Inspector named) stands for the element's click-select-node there.
const QUICK_APP = [
    ...QUICK_ELEMENT.filter((id) => id !== "click-select-node"),
    "app-click-select-node",
    "app-first-select-inspector",
    "app-click-inspector",
    "app-escape-deselect",
    "app-select-all",
    "app-restyle-color",
    "app-table-open",
    "app-layer-visibility",
];
const elSpec = (page, n, path, mode, dim, { dpr = 1, running = false, only } = {}) => ({
    kind: "element",
    page,
    n,
    path,
    mode,
    dim,
    dpr,
    running,
    ...(only ? { only } : {}),
});
const appSpec = (page, graph, features, dim, { only, dpr = 1, running = false } = {}) => ({
    kind: "app",
    page,
    graph,
    features,
    dim,
    dpr,
    running,
    ...(only ? { only } : {}),
});
const QE = { only: ids(QUICK_ELEMENT) };
const QA = { only: ids(QUICK_APP) };
/** Every page of a tier: its name (as INPUT-CATALOG.md's tables), its conditions and the inputs it runs. */
const TIERS = {
    quick: [
        elSpec("Q1", 10000, "objects", "default", "3d", QE),
        elSpec("Q2", 10000, "batched", "default", "3d", QE),
        elSpec("Q3", 100000, "batched", "default", "3d", QE),
        appSpec("Q4", "gen-10k", "", "3d", QA),
    ],
    full: [
        elSpec("E1", 100, "objects", "default", "3d"),
        elSpec("E2", 1000, "objects", "default", "3d", QE),
        elSpec("E3", 10000, "objects", "default", "3d", { running: true }),
        elSpec("E4", 100000, "objects", "default", "3d", QE),
        elSpec("E5", 10000, "batched", "default", "3d", { running: true }),
        elSpec("E6", 100000, "batched", "default", "3d", { running: true }),
        elSpec("E7", 50000, "batched", "default", "3d"),
        elSpec("E8", 10000, "objects", "default", "2d"),
        elSpec("E9", 100000, "batched", "default", "2d"),
        elSpec("E10", 10000, "objects", "plain", "3d"),
        elSpec("E11", 10000, "objects", "heavy", "3d"),
        elSpec("E12", 100000, "batched", "heavy", "3d"),
        elSpec("E13", 10000, "objects", "styled", "3d"),
        elSpec("E14", 100000, "batched", "heavy", "3d", { dpr: 2 }),
        elSpec("E15", 10000, "objects", "default", "3d", { dpr: 2, ...QE }),
        elSpec("E16", 10000, "objects", "heavy", "2d", QE),
        elSpec("E17", 50000, "objects", "default", "3d", QE),
        elSpec("E18", 100000, "objects", "default", "2d", QE),
        appSpec("A1", "gen-10k", "", "3d", { running: true }),
        appSpec("A2", "gen-100k", "cosmograph", "3d"),
        appSpec("A3", "lesmis", "file-styles", "3d"),
        appSpec("A4", "gen-10k", "", "2d"),
        appSpec("A5", "gen-10k", "cosmograph", "3d", QA),
        appSpec("A6", "gen-10k", "", "3d", { dpr: 2, ...QA }),
        appSpec("A7", "gen-50k-yed", "file-styles", "3d", QA),
        appSpec("A8", "staff-50k", "", "3d", QA),
        appSpec("A9", "yed-live", "file-styles", "3d", QA),
        appSpec("A10", "gen-1k", "", "3d", QA),
    ],
};

// Every input id a page of each kind can run, for checking a tier's lists: a name no page runs is an error, never a
// cell silently left out.
const ELEMENT_IDS = () =>
    [
        ...ELEMENT,
        ...variant(ELEMENT, COLD_ELEMENT, "cold", ""),
        ...bursts([60, 120]),
        ...TOUCH,
        ...TIPS,
        ...LAYOUTS,
        ...RUNNING,
        ...runningVariants(),
    ].map((i) => i.id);
const APP_IDS = () =>
    [
        ...APP,
        ...COLD_APP,
        ...variant(APP, COLD_APP_IDS, "cold", ""),
        ...bursts([60, 120]),
        ...TOUCH,
        ...APP_TOUCH,
        ...variant(APP, STYLE_OPEN_IDS, "style-open", ""),
        ...variant(APP, PANEL_IDS, "table-open", ""),
        ...variant(APP, PANEL_IDS, "timeline-open", ""),
        TABLE_SCROLL,
        ...APP_LATE,
        ...APP_LATE_MORE,
        ...RUNNING,
        ...runningVariants(),
    ].map((i) => i.id);
/** The tier lists' ids that no page of their kind runs. */
function unknownIds() {
    const have = { element: new Set(ELEMENT_IDS()), app: new Set(APP_IDS()) };
    const named = { element: QUICK_ELEMENT, app: QUICK_APP };
    return Object.entries(named).flatMap(([kind, list]) =>
        list.filter((id) => !have[kind].has(id)).map((id) => `${kind}: ${id}`),
    );
}

// ------------------------------------------------------------------ main

/**
 * A smoke run's page: the same conditions on a small graph. On SwiftShader a frame of a 10k graph takes about
 * 500 ms, longer than the element's 300 ms click window (CLICK_MAX_DURATION_MS), so every click there would be
 * dropped and a broken click case would look the same as a slow renderer. A smoke run checks that each case
 * drives, never its numbers.
 */
function smokeSize(p) {
    if (p.kind === "element") return { n: Math.min(p.n, 200) };
    if (/-yed$/.test(p.graph)) return { graph: "gen-1k-yed" };
    if (/^gen-|^staff-/.test(p.graph)) return { graph: "gen-1k" };
    return {};
}

const [cmd, file, ...rest] = process.argv.slice(2);
const { values: o } = parseArgs({
    args: cmd === "tier" ? rest.slice(1) : rest,
    options: {
        sizes: { type: "string", default: "1k,10k,50k,100k" },
        paths: { type: "string", default: "objects,batched" },
        dims: { type: "string", default: "3d,2d" },
        modes: { type: "string", default: "plain,styled" },
        "dpr2-sizes": { type: "string", default: "50k,100k" },
        reps: { type: "string" },
        only: { type: "string" },
        dist: { type: "string", default: join(REPO, "graphty/dist") },
        features: { type: "string", default: ",cosmograph,file-styles" },
        graphs: { type: "string", default: "lesmis,yed-live,gen-1k,gen-10k,staff-50k,gen-100k" },
        "app-dims": { type: "string", default: "3d,2d" },
        spec: { type: "string" },
        page: { type: "string" },
    },
});
// `check`: that every input a tier names is one a page of its kind runs (no browser).
if (cmd === "check") {
    const bad = unknownIds();
    for (const [t, pages] of Object.entries(TIERS)) console.log(t, pages.map((p) => p.page).join(" "));
    if (bad.length) {
        console.error("not run by any page: " + bad.join(", "));
        process.exit(1);
    }
    process.exit(0);
}
if (!file) throw new Error("usage: see the top of interaction-latency.mjs");
let out = resolve(file);
if (cmd !== "tier") mkdirSync(dirname(out), { recursive: true });

if (cmd === "report") report(out);
else if (cmd === "page") {
    const spec = JSON.parse(o.spec);
    // A page that hangs is ended after 60 minutes from its start (after the lock), recorded as failed.
    setTimeout(
        () => {
            appendFileSync(
                out,
                JSON.stringify({ ...spec, tierPage: spec.page, failure: "the page did not finish in 60 minutes" }) +
                    "\n",
            );
            process.exit(1);
        },
        60 * 60 * 1000,
    ).unref();
    if (spec.kind === "app") await appPage(spec, out);
    else await elementPage(spec, out);
} else if (cmd === "element" || cmd === "app" || cmd === "tier") {
    const specs = [];
    const reps = Number(o.reps ?? 5);
    if (cmd === "tier") {
        // `tier <quick|full> <results.jsonl>`: the file is the second word here.
        const [name, file2] = [file, rest[0]];
        if (!TIERS[name]) throw new Error(`unknown tier ${name}: quick or full`);
        const bad = unknownIds();
        if (bad.length) throw new Error(`tier lists name inputs no page runs: ${bad.join(", ")}`);
        for (const p of TIERS[name])
            if (!o.page || o.page.split(",").includes(p.page))
                specs.push({
                    ...p,
                    ...(SMOKE ? smokeSize(p) : {}),
                    reps: Number(o.reps ?? 3),
                    dist: o.dist,
                    tier: name,
                    only: o.only ?? p.only,
                });
        out = resolve(file2 ?? "");
    } else if (cmd === "element") {
        const dpr2 = new Set(o["dpr2-sizes"].split(",").filter(Boolean));
        for (const s of o.sizes.split(","))
            for (const dpr of dpr2.has(s) ? [1, 2] : [1])
                for (const mode of o.modes.split(","))
                    for (const dim of o.dims.split(","))
                        for (const path of o.paths.split(","))
                            specs.push({ kind: "element", n: SIZES[s], dim, path, mode, dpr, reps, only: o.only });
    } else
        for (const graph of o.graphs.split(","))
            for (const features of o.features.split(","))
                for (const dim of o["app-dims"].split(","))
                    specs.push({ kind: "app", graph, features, dim, dist: o.dist, reps, only: o.only });
    mkdirSync(dirname(out), { recursive: true });
    const wrap = (process.env.LAT_WRAP ?? "").split(" ").filter(Boolean);
    for (const spec of specs) {
        const argv = [fileURLToPath(import.meta.url), "page", out, "--spec", JSON.stringify(spec)];
        console.log("==", JSON.stringify(spec));
        const [bin, ...args] = wrap.length ? [...wrap, process.execPath, ...argv] : [process.execPath, ...argv];
        const r = spawnSync(bin, args, { stdio: "inherit" });
        // A page process that died (a crash, a signal, the lock wrapper failing) leaves a failure, never silence.
        if (r.status !== 0)
            appendFileSync(
                out,
                JSON.stringify({
                    ...spec,
                    tierPage: spec.page,
                    failure: `the page process exited ${r.status ?? r.signal}`,
                }) + "\n",
            );
    }
} else throw new Error(`unknown command ${cmd}`);

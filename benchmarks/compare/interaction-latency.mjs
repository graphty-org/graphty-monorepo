// How long a reader waits after each kind of input: hovering, clicking, dragging, turning the camera, keys and touch on
// graphty-element, and the graphty app's own controls around it. See INTERACTION-LATENCY.md.
//
//   node interaction-latency.mjs element <results.jsonl> [--sizes 1k,10k,50k,100k] [--paths objects,batched]
//                                        [--dims 3d,2d] [--modes plain,styled] [--dpr2-sizes 50k,100k]
//                                        [--reps 5] [--only <regex>]
//   node interaction-latency.mjs app <results.jsonl> [--dist <graphty dist>] [--features ,cosmograph,file-styles]
//                                    [--graphs lesmis,yed-live,gen-1k,gen-10k,staff-50k,gen-100k]
//                                    [--app-dims 3d,2d] [--reps 5] [--only <regex>]
//   node interaction-latency.mjs report <results.jsonl>             Markdown tables, slowest first
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
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const SIZES = { 200: 200, "1k": 1000, "10k": 10000, "50k": 50000, "100k": 100000 };

// ------------------------------------------------------------------ the probe, in every page

/* global document, requestAnimationFrame, addEventListener, removeEventListener, B -- the probe and the bench page run in the browser */
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
    // a 96 x 72 thumbnail of the whole canvas. The canvas keeps its last drawn frame (graphty-element's
    // preserveDrawingBuffer, on by default), so this reads what is on screen.
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
            dw = 96,
            dh = 72;
        if (pix !== "all") {
            const w = pix.w ?? 12,
                h = pix.h ?? 12;
            sx = Math.max(0, Math.round((pix.x - w / 2 - r.left) * kx));
            sy = Math.max(0, Math.round((pix.y - h / 2 - r.top) * ky));
            sw = Math.max(1, Math.min(c.width - sx, Math.round(w * kx)));
            sh = Math.max(1, Math.min(c.height - sy, Math.round(h * ky)));
            dw = Math.min(sw, 64);
            dh = Math.min(sh, 64);
        }
        if (scratch.width !== dw) scratch.width = dw;
        if (scratch.height !== dh) scratch.height = dh;
        g2.clearRect(0, 0, dw, dh);
        g2.drawImage(c, sx, sy, sw, sh, 0, 0, dw, dh);
        return g2.getImageData(0, 0, dw, dh).data;
    };
    // Changed: at least one pixel in 500 (and at least one) moved by more than 24 levels in a channel.
    const differs = (a, b) => {
        if (!a || !b || a.length !== b.length) return false;
        let n = 0;
        for (let i = 0; i < a.length; i += 4)
            if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 24) n++;
        return n >= Math.max(1, a.length / 4 / 500);
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
        // Watches for the first `type` input event; from then, each frame, for `cond` (an expression over el, the
        // element; s, this measurement; p, the params) to hold and, with `pix`, for the pixels there to change.
        // With `settle`, then waits for waitForStableFrame (a layout or a glide finishing) as settledMs.
        arm({ type, cond, params, event, capMs, pix, settle }) {
            const s = { tInput: null, tState: null, tPix: null, tEvent: null, frames: 0, cam0: cam() };
            const base = pix ? grab(pix) : null;
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
            // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
            const test = new Function("el", "s", "p", `return (${cond});`);
            const wait = { painted: null, after: 0, asked: false, noState: 0 };
            // One frame after the input: true when the result is drawn, or never will be.
            const over = () => {
                // The frame after the pixels changed is the one that presents them.
                if (s.tPix !== null && s.tPixNext === undefined) s.tPixNext = performance.now();
                // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                if (s.tState === null && test(el(), s, params ?? {})) s.tState = performance.now();
                if (base && s.tPix === null && differs(grab(pix), base)) s.tPix = performance.now();
                // Drawn, but the state never says so (a 2D pinch moves no camera field): ten frames' grace, then done.
                if (s.tState === null && s.tPix !== null && ++wait.noState >= 10) return true;
                if (s.tState === null) return false;
                if (!base || s.tPix !== null) return true;
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
                };
            })();
            armed = s;
        },
        result: () => armed.done,
        // A burst: records every `type` input and, each frame, `track` (an expression over el and p); `end()` waits
        // until `track` holds still for `still` frames after the last input, then reports the lag from the last input
        // to the frame after `track` first changed following it, and the frames dropped from the first input to it.
        burst({ type, track, params, still = 6 }) {
            // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
            const read = new Function("el", "p", `return JSON.stringify(${track});`);
            const inputs = [];
            const frames = [];
            const onInput = (e) => inputs.push(e.timeStamp);
            addEventListener(type, onInput, { capture: true });
            const run = { on: true };
            const loop = (async () => {
                while (run.on) {
                    await raf();
                    // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                    frames.push({ t: performance.now(), v: read(el(), params ?? {}) });
                }
            })();
            return {
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
                    if (last === undefined) return { sawInput: false, timeout: false, ms: null };
                    const before = frames.findLast((f) => f.t <= last);
                    const seen = frames.find((f) => f.t > last && f.v !== before?.v);
                    const next = seen && frames.find((f) => f.t > seen.t);
                    const span = frames.filter((f) => f.t >= inputs[0] && f.t <= (next?.t ?? last));
                    const gaps = span.slice(1).map((f, i) => f.t - span[i].t);
                    const period = globalThis.__lat.period ?? 16.7;
                    const drops = gaps.reduce((a, g) => a + Math.max(0, Math.round(g / period) - 1), 0);
                    return {
                        ms: next ? +(next.t - last).toFixed(1) : null,
                        stateMs: seen ? +(seen.t - last).toFixed(1) : null,
                        drops,
                        maxGapMs: gaps.length ? +Math.max(...gaps).toFixed(1) : null,
                        inputs: inputs.length,
                        spanMs: +((next?.t ?? last) - inputs[0]).toFixed(1),
                        sawInput: true,
                        timeout: !seen,
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
    await page.evaluate((a) => globalThis.__lat.arm(a), { capMs: CAP_MS, ...spec });
    await act();
    return page.evaluate(() => globalThis.__lat.result());
}
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
            for (let t = 0; out.length < k && t < 20000; t++) {
                const id = ids[Math.floor(rnd() * ids.length)];
                const at = el.nodeScreenPosition(id);
                if (!at?.visible) continue;
                if (at.x < 0.15 * r.width || at.x > 0.85 * r.width || at.y < 0.15 * r.height || at.y > 0.85 * r.height)
                    continue;
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
        let n = 0,
            found = 0,
            tried = 0;
        for (const e of el.session.data.edges()) {
            if (++n > 200000) break;
            const [a, b] = [el.nodeScreenPosition(e.source), el.nodeScreenPosition(e.target)];
            if (!a?.visible || !b?.visible || Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 40) continue;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (mid.x < 20 || mid.y < 20 || mid.x > r.width - 20 || mid.y > r.height - 20) continue;
            // ponytail: the first 3,000 candidates only; a dense 100k drawing rarely leaves an edge's middle clear
            if (++tried > 3000) break;
            const hit = el.elementAt(mid);
            const top = document.elementFromPoint(r.left + mid.x, r.top + mid.y);
            if (hit?.kind === "edge" && String(hit.id) === String(e.id) && (top === el || el.contains(top)))
                if (found++ >= skip) return { id: String(e.id), x: r.left + mid.x, y: r.top + mid.y };
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
async function hoverUntimed(page, t) {
    await page.mouse.move(t.x, t.y);
    await until(page, "String(el.session.selection.hovered) === p.id", { id: t.id }, 600);
}

async function clickEmptyUntimed(page, ctx) {
    await page.mouse.move(ctx.empty.x, ctx.empty.y);
    await frames(page, 2);
    await page.mouse.down();
    await page.mouse.up();
    await until(page, "el.session.selection.nodes.length === 0 && el.session.selection.edges.length === 0");
}

async function selectUntimed(page, t) {
    await hoverUntimed(page, t);
    await page.mouse.down();
    await page.mouse.up();
    await until(page, SEL_IS, { id: t.id });
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
 * A burst of inputs at `hz`: `send(i)` sends input i of `count`; the in-page recorder reports the lag from the last
 * input to the frame showing it, and the frames dropped during the burst.
 */
async function burst(page, { type, track, params, hz, count, send, before, after }) {
    await page.evaluate(() => globalThis.__lat.measurePeriod());
    if (before) await before();
    await page.evaluate((a) => (globalThis.__burst = globalThis.__lat.burst(a)), { type, track, params });
    const period = 1000 / hz;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
        await send(i);
        const wait = t0 + (i + 1) * period - performance.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    if (after) await after();
    const r = await page.evaluate(() => globalThis.__burst.end());
    return { ...r, hz };
}

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
                        send: (i) => page.mouse.move(t.x + dir * (6 + 4 * (i + 1)), t.y + (i % 2)),
                    });
                    await page.mouse.up();
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
                        send: (i) => page.mouse.move(s.x + dir * 4 * (i + 1), s.y + (i % 3)),
                        after: () => page.mouse.up(),
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
                        send: (i) => page.mouse.move(s.x + (i % 3), s.y + dir * 4 * (i + 1)),
                        after: () => page.mouse.up({ button }),
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
                        send: () => page.mouse.wheel(0, dir * 40),
                    });
                },
            },
            {
                id: `burst-pinch-wheel-${hz}hz`,
                name: `Trackpad pinch (Ctrl+wheel), ${hz} events a second`,
                async run(page, ctx, rep) {
                    // The 60 and 120 Hz bursts go opposite ways, so zooming never runs into its limit.
                    const dir = (rep + (hz === 120 ? 1 : 0)) % 2 ? 1 : -1;
                    const r = await burst(page, {
                        type: "wheel",
                        track: CAM,
                        hz,
                        count: 20,
                        before: async () => {
                            await page.mouse.move(ctx.center.x, ctx.center.y);
                            await camStill(page);
                            await page.keyboard.down("Control");
                        },
                        send: () => page.mouse.wheel(0, dir * 6),
                        after: () => page.keyboard.up("Control"),
                    });
                    return r;
                },
            },
        );
    }
    return out;
}

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
                { type: "pointermove", cond: "el.session.selection.hovered === null", pix: at(t, 40, 40) },
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
                { type: "pointerdown", cond: "el.session.selection.nodes.length === 0", pix: at(t, 40, 40) },
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
            const rect = await page.evaluate(() => {
                const r = document.querySelector("graphty-element").getBoundingClientRect();
                return { left: r.left, top: r.top };
            });
            const near =
                "(() => { const a = el.nodeScreenPosition(p.id); return a && Math.hypot(a.x - p.x, a.y - p.y) <= 2; })()";
            const dir = t.x < 600 ? 1 : -1;
            const r = await measuredDrag(page, t, 10 * dir, 0, this.moves, {
                cond: near,
                params: (x, y) => ({ id: t.id, x: x - rect.left, y: y - rect.top }),
                pix: (x, y) => ({ x, y, w: 30, h: 30 }),
            });
            return r.slice(1); // the first move crosses the drag threshold
        },
    },
    {
        id: "drop-node",
        name: "Let go of a dragged node (node-drag-end event)",
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
            return timed(page, { type: "pointerup", cond: "s.tEvent !== null", event: "graphty-node-drag-end" }, () =>
                page.mouse.up(),
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
            return out.slice(1);
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
            return out.slice(1);
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

// Switching the layout through graphty-element's own config (an API call, not an input): from the call to the first
// frame whose drawing moved, and to the settled frame.
const LAYOUTS = [
    {
        id: "element-layout-switch",
        name: "Set the layout config (circular / grid alternately): first moved frame; settled",
        async run(page, ctx, rep) {
            const type = rep % 2 ? "grid" : "circular";
            return page.evaluate(
                async ([type, capMs]) => {
                    const el = document.querySelector("graphty-element");
                    const raf = () => new Promise((r) => requestAnimationFrame(r));
                    const base = globalThis.__lat.grab("all");
                    const t0 = performance.now();
                    const done = el.setLayout(type);
                    let moved = null;
                    while (moved === null && performance.now() - t0 < capMs) {
                        await raf();
                        if (globalThis.__lat.differs(globalThis.__lat.grab("all"), base)) moved = performance.now();
                    }
                    await raf();
                    const drawn = performance.now();
                    await done;
                    await Promise.race([el.waitForStableFrame(), new Promise((r) => setTimeout(r, capMs))]).catch(
                        () => {},
                    );
                    const settled = performance.now();
                    return {
                        ms: moved === null ? null : +(drawn - t0).toFixed(1),
                        stateMs: moved === null ? null : +(moved - t0).toFixed(1),
                        settledMs: +(settled - t0).toFixed(1),
                        sawInput: true,
                        timeout: moved === null,
                    };
                },
                [type, CAP_MS],
            );
        },
    },
];

// While a force layout keeps moving the graph, last: it changes the drawing for good. Pixels change every frame
// here, so these end on state alone.
const RUNNING = [
    {
        id: "hover-node-running-layout",
        name: "Hover a node while a force layout runs (state only)",
        async run(page, ctx, rep) {
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await until(page, "el.session.selection.hovered === null");
            const t = (await nodeTargets(page, 1, 300 + rep))[0];
            if (!t) return { skip: "no node in view" };
            return timed(
                page,
                {
                    type: "pointermove",
                    cond: "el.session.selection.hovered !== null",
                    event: "graphty-node-hover",
                    capMs: 3000,
                },
                () => page.mouse.move(t.x, t.y),
            );
        },
    },
    {
        id: "click-select-running-layout",
        name: "Click a node while a force layout runs (state only)",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            const t = (await nodeTargets(page, 1, 700 + rep))[0];
            if (!t) return { skip: "no node in view" };
            await page.mouse.move(t.x, t.y);
            await until(page, "el.session.selection.hovered !== null", {}, 60);
            return timed(page, { type: "pointerdown", cond: "el.session.selection.nodes.length === 1" }, () =>
                clickHere(page),
            );
        },
    },
    {
        id: "drag-node-running-layout",
        name: "Drag a node while a force layout runs (per move; node under the pointer)",
        moves: 8,
        async run(page, ctx, rep) {
            const t = (await nodeTargets(page, 1, 1100 + rep))[0];
            if (!t) return { skip: "no node in view" };
            const rect = await page.evaluate(() => {
                const r = document.querySelector("graphty-element").getBoundingClientRect();
                return { left: r.left, top: r.top };
            });
            const near =
                "(() => { const a = el.nodeScreenPosition(p.id); return a && Math.hypot(a.x - p.x, a.y - p.y) <= 3; })()";
            const out = [];
            await page.mouse.move(t.x, t.y);
            await page.mouse.down();
            let x = t.x;
            const dir = t.x < 600 ? 1 : -1;
            for (let i = 0; i < 9; i++) {
                x += 10 * dir;
                out.push(
                    await timed(
                        page,
                        {
                            type: "pointermove",
                            cond: near,
                            params: { id: t.id, x: x - rect.left, y: t.y - rect.top },
                            capMs: 5000,
                        },
                        () => page.mouse.move(x, t.y),
                    ),
                );
            }
            await page.mouse.up();
            return out.slice(1);
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
    const ms = flat.map((r) => r.ms);
    const st = stats(ms);
    const med = (k) => stats(flat.map((r) => r[k]))?.median ?? null;
    return {
        ...base,
        interaction: inter.id,
        name: inter.name,
        reps,
        samples: flat.length,
        timeouts: flat.filter((r) => r.timeout).length,
        noInput: flat.filter((r) => r.sawInput === false).length,
        noVisible: flat.filter((r) => r.noVisible).length,
        median_ms: st?.median ?? null,
        p95_ms: st?.p95 ?? null,
        worst_ms: st?.worst ?? null,
        best_ms: st?.best ?? null,
        state_median_ms: med("stateMs"),
        event_median_ms: med("eventMs"),
        settled_median_ms: med("settledMs"),
        drops_median: med("drops"),
        max_gap_median_ms: med("maxGapMs"),
        perceivable: st ? st.p95 > PERCEIVED_MS : null,
        raw: ms,
        rawState: flat.map((r) => r.stateMs ?? null),
        ...extra,
    };
}

/** One repetition of one interaction, into `g`; a rep that throws is recorded and its held keys let go. */
async function oneRep(page, ctx, inter, rep, cdp, g) {
    try {
        // A camera move or a layout changes where everything is drawn: find the targets again.
        if (!ctx.moving) await camStill(page);
        if (ctx.moving || ctx.dirty || (await camOf(page)) !== ctx.cam) {
            Object.assign(ctx, await pageContext(page, ctx));
            // A glide can leave the camera close on one node: fit the graph again and look once more.
            if (ctx.nodes.length < 2 && ctx.refit) {
                await ctx.refit();
                Object.assign(ctx, await pageContext(page, ctx));
            }
            ctx.dirty = false;
        }
        if (ctx.prep) await ctx.prep(page, ctx);
        const t0 = Date.now();
        const r = await inter.run(page, ctx, rep, cdp);
        if (r?.skip) g.skip = r.skip;
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
    console.log(rep, inter.id, JSON.stringify(g.samples.at(-1))?.slice(0, 200) ?? g.skip ?? g.errors.at(-1));
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

async function elementPage(spec, out) {
    const build = process.env.BENCH_BUILD ?? join(HERE, "builds", process.env.BENCH_LABEL ?? "interaction-latency");
    const server = process.env.BENCH_URL ? null : await serve(build);
    const url = process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`;
    const dpr = spec.dpr ?? 1;
    const b = await launch({ width: 1280, height: 1000 }, dpr);
    const base = {
        surface: "graphty-element",
        path: spec.path,
        dim: spec.dim,
        mode: spec.mode ?? "plain",
        dpr,
        n: spec.n,
        smoke: SMOKE || undefined,
        at: new Date().toISOString(),
        loadavg: loadavg()[0],
        cpus: /Cpus_allowed_list:\s*(\S+)/.exec(readFileSync("/proc/self/status", "utf8"))?.[1],
    };
    try {
        const { page } = b;
        await page.goto(url);
        await page.waitForFunction(() => globalThis.B);
        const info = await page.evaluate(() => B.info());
        Object.assign(base, { sha: info.build?.sha, dirty: info.build?.dirty, renderer: info.webgl });
        checkRenderer(info.webgl);
        const gen = await page.evaluate(([n]) => B.gen(n, 2 * n), [spec.n]);
        base.edges = gen.m;
        const styled = base.mode === "styled";
        await page.evaluate((o) => B.setup("graphty", o), {
            mode: "plain",
            accel: "on",
            dpr,
            renderPath: spec.path,
            dim: spec.dim,
            labels: styled,
            arrows: styled,
        });
        // The styled look adds graphty-element's own default style layers (Everything, Selected, Hovered).
        if (styled)
            await page.evaluate(() =>
                document.querySelector("graphty-element").session.config.set({ startingRows: true }),
            );
        const load = await page.evaluate(() => B.load());
        if (load.error) throw new Error("load failed: " + load.error);
        await page.evaluate(() => B.adapter.settle());
        await page.evaluate(() => document.querySelector("graphty-element").waitForPainted());
        base.renderPathDrawn = await page.evaluate(() => document.querySelector("graphty-element").renderPath);
        const ctx = await pageContext(page, spec);
        console.log("targets", JSON.stringify({ nodes: ctx.nodes, empty: ctx.empty, edges: ctx.edges }));
        if (ctx.nodes.length < 2 || !ctx.empty) throw new Error("no two pickable nodes or no empty point");
        ctx.refit = async () => {
            await page.evaluate(() => document.querySelector("graphty-element").zoomToFit());
            await camStill(page);
        };
        await roundRobin(
            page,
            ctx,
            wanted(variant(ELEMENT, COLD_ELEMENT, "cold", "first after load"), spec),
            1,
            base,
            out,
        );
        await roundRobin(page, ctx, wanted(ELEMENT, spec), spec.reps, base, out);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(bursts([60, 120]), spec), spec.reps, base, out);
        const cdp = await b.ctx.newCDPSession(page);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await page.mouse.move(ctx.empty.x, ctx.empty.y);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(TOUCH, spec), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
        if (wanted(TIPS, spec).length) {
            await addTooltips(page);
            await newPhase(ctx);
            await roundRobin(page, ctx, wanted(TIPS, spec), spec.reps, base, out);
        }
        if (wanted(LAYOUTS, spec).length) {
            ctx.dirty = true;
            await roundRobin(page, ctx, wanted(LAYOUTS, spec), spec.reps, base, out);
        }
        if (wanted(RUNNING, spec).length) {
            await page.evaluate(() => document.querySelector("graphty-element").setLayout("ngraph"));
            await frames(page, 30);
            ctx.moving = true;
            await roundRobin(page, ctx, wanted(RUNNING, spec), spec.reps, base, out);
        }
    } catch (e) {
        appendFileSync(
            out,
            JSON.stringify({ ...base, failure: String(e?.message ?? e).slice(0, 300), errors: b.errors }) + "\n",
        );
        console.log("failure", e?.message);
    } finally {
        await b.close();
        server?.close();
    }
}

const camOf = (page) => page.evaluate(() => JSON.stringify(document.querySelector("graphty-element").getCameraState()));

async function pageContext(page, spec) {
    const cam = await camOf(page);
    const nodes = await nodeTargets(page, 2);
    const empty = await emptyPoint(page);
    const edges = [await edgeTarget(page, 0), await edgeTarget(page, 1)].filter(Boolean);
    const center = await page.evaluate(() => {
        const r = document.querySelector("graphty-element").getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    return { nodes, empty, edges, center, cam, dim: spec.dim, n: spec.n };
}

// ------------------------------------------------------------------ the graphty app

/**
 * A G(n, 2n) GraphML file shaped like staff-50k.graphml (name, dept), plus a number (score) to bind a style to and
 * a year to step a timeline through. Seeded: every run writes the same file.
 */
function writeGraph(n, file) {
    let a = 79 >>> 0;
    const rnd = () => {
        a = (a * 1664525 + 1013904223) >>> 0;
        return a / 4294967296;
    };
    const depts = ["Facilities", "Research", "Finance", "Library", "Legal", "Grants", "Payroll", "Security"];
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
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
        lines.push(
            `<node id="n${i}"><data key="name">Person ${i}</data><data key="dept">${d}</data><data key="score">${s}</data><data key="year">${y}</data></node>`,
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

const genFile = (n, dir) => {
    const f = join(dir, `latency-${K(n)}.graphml`);
    if (!existsSync(f)) writeGraph(n, f);
    return f;
};

const GRAPHS = {
    lesmis: { label: "Les Miserables (sample)", open: (page) => openSample(page, "Les Miserables") },
    "yed-live": {
        label: "yEd Live WaveNet (file)",
        open: (page) =>
            openFile(page, process.env.LAT_YED_LIVE ?? join(MAIN, "tmp/interaction-latency/yed-live.graphml")),
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
};

// Opening is timed from the real click (the sample button, or the file chooser's button) to the first frame that
// draws the nodes (graph-first-frame) and to the settled picture: one cold row per page.
async function watchOpen(page) {
    await page.evaluate(() => {
        globalThis.__open = { first: null, input: null };
        addEventListener(
            "pointerdown",
            (e) => {
                if (globalThis.__open.input === null) globalThis.__open.input = e.timeStamp;
            },
            { capture: true },
        );
        const hook = () => {
            const el = document.querySelector("graphty-element");
            if (!el) return requestAnimationFrame(hook);
            el.addEventListener("graph-first-frame", () => (globalThis.__open.first ??= performance.now()), {
                once: true,
            });
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
            ctx.dirty = true;
            return r;
        },
    },
    {
        id: "app-table-open",
        name: "Shift+T opens the table (first data row shown; DOM)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const r = await timed(
                page,
                { type: "keydown", cond: `!!${TABLE}?.querySelector('[role=gridcell], [role=cell]')` },
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
                .nth(1);
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
    ...["drag-node", "drag-orbit-3d", "drag-pan", "wheel-zoom", "pinch-ctrl-wheel"].map((id) => ({
        ...ELEMENT.find((i) => i.id === id),
    })),
];

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

async function appPage(spec, out) {
    const dist = resolve(spec.dist);
    const server = await serve(dist);
    const query = spec.features ? "?features=" + spec.features : "";
    const origin = `http://127.0.0.1:${server.address().port}/${query}`;
    const b = await launch({ width: 1440, height: 900 });
    const g = GRAPHS[spec.graph];
    const base = {
        surface: "graphty app",
        graph: g.label,
        features: spec.features || "default",
        smoke: SMOKE || undefined,
        at: new Date().toISOString(),
        loadavg: loadavg()[0],
        cpus: /Cpus_allowed_list:\s*(\S+)/.exec(readFileSync("/proc/self/status", "utf8"))?.[1],
    };
    try {
        const { page } = b;
        base.renderer = await rendererOf(page);
        checkRenderer(base.renderer);
        await page.goto(origin);
        // The usage-data question sits over the drawing until answered.
        await page
            .getByRole("button", { name: "No thanks" })
            .click({ timeout: 10000 })
            .catch(() => {});
        await watchOpen(page);
        const t0 = Date.now();
        await g.open(page, dirname(out));
        await stable(page);
        base.openMs = Date.now() - t0;
        const opened = await page.evaluate(() => ({ ...globalThis.__open, now: performance.now() }));
        // A control the walk cannot find fails that rep after a minute, not the whole page after ten.
        page.setDefaultTimeout(60000);
        if (spec.dim === "2d") {
            await page.getByRole("button", { name: /^Mode, / }).click();
            await page.getByRole("menuitemradio", { name: "2D" }).click();
            await stable(page);
        }
        const facts = await page.evaluate(() => {
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
                            timeout: false,
                        },
                    ],
                    1,
                ),
            ) + "\n",
        );
        const ctx = await pageContext(page, { dim: facts.dim, n: facts.nodes });
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
        const cold = [...COLD_APP, ...variant(APP, COLD_APP_IDS, "cold", "first after opening")].map((i) =>
            i.id.endsWith("-cold") ? i : { ...i, id: `${i.id}-cold` },
        );
        await roundRobin(page, ctx, wanted(cold, sp), 1, base, out);
        await roundRobin(page, ctx, wanted(APP, sp), spec.reps, base, out);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(bursts([60, 120]), sp), spec.reps, base, out);
        const cdp = await b.ctx.newCDPSession(page);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await page.mouse.move(ctx.empty.x, ctx.empty.y);
        await newPhase(ctx);
        await roundRobin(page, ctx, wanted(TOUCH, sp), spec.reps, base, out, cdp);
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
        for (const inter of wanted(APP_LATE, sp)) {
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
            await roundRobin(page, ctx, [inter], spec.reps, base, out);
        }
    } catch (e) {
        appendFileSync(
            out,
            JSON.stringify({ ...base, failure: String(e?.message ?? e).slice(0, 300), errors: b.errors }) + "\n",
        );
        console.log("failure", e?.message);
    } finally {
        await b.close();
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
    const cells = rows.filter((r) => !r.failure);
    const fmt = (x) => (x === null || x === undefined ? "-" : String(Math.round(x)));
    const where = (r) =>
        r.surface === "graphty app"
            ? `app ${r.graph} ${r.features} ${r.dim} (${r.path}, ${K(r.n)})`
            : `element ${r.path} ${r.dim} ${r.mode ?? "plain"} dpr${r.dpr ?? 1} ${K(r.n)}`;
    const note = (r) =>
        [
            r.notMeasured,
            r.noVisible ? `${r.noVisible} of ${r.samples} never drawn a change (state time shown)` : "",
            r.timeouts ? r.timeouts + " timeouts" : "",
            r.errors ? r.errors.length + " errors: " + r.errors[0] : "",
        ]
            .filter(Boolean)
            .join("; ");
    const animation = (r) => /glide-settled/.test(r.interaction);
    const input = cells.filter((r) => !BURST.test(r.interaction) && !animation(r));
    const out = [
        "## Input to result drawn",
        "",
        "| interaction | where | reps | drawn median ms | drawn p95 ms | worst ms | state median ms | settled median ms | note |",
        "|---|---|---|---|---|---|---|---|---|",
    ];
    for (const r of input.sort((a, b) => (b.p95_ms ?? -1) - (a.p95_ms ?? -1)))
        out.push(
            `| ${r.interaction} | ${where(r)} | ${r.reps} | ${fmt(r.median_ms)} | ${fmt(r.p95_ms)} | ${fmt(r.worst_ms)} | ${fmt(r.state_median_ms)} | ${fmt(r.settled_median_ms)} | ${note(r)} |`,
        );
    for (const f of fails) out.push(`| (page failed) | ${where(f)} | | | | | | | ${f.failure} |`);
    const b = cells.filter((r) => BURST.test(r.interaction));
    if (b.length) {
        out.push(
            "",
            "## Bursts: lag after the last input, and frames dropped",
            "",
            "| interaction | where | reps | lag median ms | lag p95 ms | dropped frames (median) | longest frame gap (median) ms |",
            "|---|---|---|---|---|---|---|",
        );
        for (const r of b.sort((x, y) => (y.p95_ms ?? -1) - (x.p95_ms ?? -1)))
            out.push(
                `| ${r.interaction} | ${where(r)} | ${r.reps} | ${fmt(r.median_ms)} | ${fmt(r.p95_ms)} | ${fmt(r.drops_median)} | ${fmt(r.max_gap_median_ms)} |`,
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
    console.log(out.join("\n"));
    const slow = input.filter((r) => r.p95_ms > PERCEIVED_MS);
    console.log(
        `\n${slow.length} of ${input.length} input cells have a drawn p95 above ${PERCEIVED_MS} ms (glide and bursts not counted).`,
    );
}

// ------------------------------------------------------------------ main

const [cmd, file, ...rest] = process.argv.slice(2);
const { values: o } = parseArgs({
    args: rest,
    options: {
        sizes: { type: "string", default: "1k,10k,50k,100k" },
        paths: { type: "string", default: "objects,batched" },
        dims: { type: "string", default: "3d,2d" },
        modes: { type: "string", default: "plain,styled" },
        "dpr2-sizes": { type: "string", default: "50k,100k" },
        reps: { type: "string", default: "5" },
        only: { type: "string" },
        dist: { type: "string", default: join(REPO, "graphty/dist") },
        features: { type: "string", default: ",cosmograph,file-styles" },
        graphs: { type: "string", default: "lesmis,yed-live,gen-1k,gen-10k,staff-50k,gen-100k" },
        "app-dims": { type: "string", default: "3d,2d" },
        spec: { type: "string" },
    },
});
if (!file) throw new Error("usage: see the top of interaction-latency.mjs");
const out = resolve(file);
mkdirSync(dirname(out), { recursive: true });

if (cmd === "report") report(out);
else if (cmd === "page") {
    const spec = JSON.parse(o.spec);
    // A page that hangs is ended after 60 minutes from its start (after the lock), recorded as failed.
    setTimeout(
        () => {
            appendFileSync(out, JSON.stringify({ ...spec, failure: "the page did not finish in 60 minutes" }) + "\n");
            process.exit(1);
        },
        60 * 60 * 1000,
    ).unref();
    if (spec.kind === "app") await appPage(spec, out);
    else await elementPage(spec, out);
} else if (cmd === "element" || cmd === "app") {
    const specs = [];
    const reps = Number(o.reps);
    if (cmd === "element") {
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
    const wrap = (process.env.LAT_WRAP ?? "").split(" ").filter(Boolean);
    for (const spec of specs) {
        const argv = [fileURLToPath(import.meta.url), "page", out, "--spec", JSON.stringify(spec)];
        console.log("==", JSON.stringify(spec));
        const [bin, ...args] = wrap.length ? [...wrap, process.execPath, ...argv] : [process.execPath, ...argv];
        spawnSync(bin, args, { stdio: "inherit" });
    }
} else throw new Error(`unknown command ${cmd}`);

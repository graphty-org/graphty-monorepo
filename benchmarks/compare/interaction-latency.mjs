// How long a reader waits after each kind of input: hovering, clicking, dragging, turning the camera, keys and touch on
// graphty-element, and the graphty app's own controls around it. See INTERACTION-LATENCY.md.
//
//   node interaction-latency.mjs element <results.jsonl> [--sizes 1k,10k,50k,100k] [--paths objects,batched]
//                                        [--dims 3d,2d] [--reps 5] [--only <regex>]
//   node interaction-latency.mjs app <results.jsonl> [--dist <graphty dist>] [--features ,cosmograph]
//                                    [--graphs lesmis,yed-live,staff-50k] [--reps 5] [--only <regex>]
//   node interaction-latency.mjs report <results.jsonl>             Markdown tables, slowest first
//
// Latency is measured in the page, from the input event's own timeStamp (the moment the browser received the real
// mouse, wheel, key or touch input Playwright sent) to the second requestAnimationFrame after the result became
// readable through graphty-element's public API (selection, hovered node, camera state, a node's screen position) or
// the app's accessibility tree: the first frame that can show it, plus one, so the drawn frame is on screen. Where the
// result is only an event, the event's time is reported as well (eventMs).
//
// `element` runs one page per graph size, render path and dimension (the bench page this directory builds, see
// RUNBOOK.md, section 1, BENCH_URL or BENCH_BUILD), loads a G(n, 2n) graph, and runs every interaction round-robin, so
// drift spreads over all of them. `app` walks the built graphty app. Each page is one child process, run through
// LAT_WRAP when set (a command prefix, words split on spaces: for example the GPU lock and the reserved cores), and
// appends one JSON line per interaction cell to the results file.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
const PERCEIVED_MS = 300;
const K = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));
const SIZES = { "1k": 1000, "10k": 10000, "50k": 50000, "100k": 100000 };

// ------------------------------------------------------------------ the probe, in every page

/* global document, requestAnimationFrame, addEventListener, removeEventListener, B -- the probe and the bench page run in the browser */
const PROBE = () => {
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const el = () => document.querySelector("graphty-element");
    const cam = () => JSON.stringify(el().getCameraState());
    let armed = null;
    globalThis.__lat = {
        // Watches for the first `type` input event and, from the frame after it, for `cond` (an expression over el,
        // the element; s, this measurement; p, the params) to hold; then waits two more frames.
        arm({ type, cond, params, event, capMs }) {
            const s = { tInput: null, tSeen: null, tEnd: null, tEvent: null, frames: 0, cam0: cam() };
            const onInput = (e) => {
                if (s.tInput === null) s.tInput = e.timeStamp;
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
            s.done = (async () => {
                const t0 = performance.now();
                for (;;) {
                    await raf();
                    s.frames++;
                    // eslint-disable-next-line sonarjs/code-eval -- the runner's own expressions, in its own page
                    if (s.tInput !== null && test(el(), s, params ?? {})) break;
                    if (performance.now() - t0 > capMs) {
                        s.timeout = true;
                        break;
                    }
                }
                s.tSeen = performance.now();
                await raf();
                await raf();
                s.tEnd = performance.now();
                removeEventListener(type, onInput, { capture: true });
                if (event) el().removeEventListener(event, onEvent);
                const r = (t) => (t === null || s.tInput === null ? null : +(t - s.tInput).toFixed(1));
                return {
                    ms: s.timeout ? null : r(s.tEnd),
                    seenMs: s.timeout ? null : r(s.tSeen),
                    eventMs: r(s.tEvent),
                    frames: s.frames,
                    sawInput: s.tInput !== null,
                    timeout: !!s.timeout,
                };
            })();
            armed = s;
        },
        result: () => armed.done,
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
 * @param {object} spec - type (the input event), cond, params, event.
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

async function launch(viewport) {
    const { chromium } = createRequire(join(REPO, "visual-review/package.json"))("playwright");
    if (!existsSync(join(EGL, "libEGL.so.1"))) throw new Error(`no libEGL.so.1 in ${EGL}`);
    const profiles = join(HERE, "profiles");
    mkdirSync(profiles, { recursive: true });
    const udd = mkdtempSync(join(profiles, "lat-"));
    const ctx = await chromium.launchPersistentContext(udd, {
        args: [
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-angle=vulkan",
            "--disable-vulkan-surface",
            "--js-flags=--max-old-space-size=16384",
        ],
        env: { ...process.env, FC_FONTATIONS: "1", LD_LIBRARY_PATH: EGL },
        viewport,
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

/**
 * A drag measured move by move: each move is timed from its pointermove to the frame after the camera (or `cond`)
 * changed. The camera is let come to rest before each move, untimed, so inertia from the last move is not counted.
 */
async function measuredDrag(page, from, dx, dy, moves, { button = "left", cond = CAM_MOVED, params } = {}) {
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
        out.push(await timed(page, { type: "pointermove", cond, params: p }, () => page.mouse.move(x, y)));
    }
    await page.mouse.up({ button });
    await camStill(page);
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
                },
                () => page.mouse.move(t.x, t.y),
            );
        },
    },
    {
        id: "pointer-leaves-node",
        name: "Move the pointer off a node",
        async run(page, ctx, rep) {
            await hoverUntimed(page, ctx.nodes[rep % 2]);
            return timed(page, { type: "pointermove", cond: "el.session.selection.hovered === null" }, () =>
                page.mouse.move(ctx.empty.x, ctx.empty.y),
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
            await hoverUntimed(page, t);
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id } }, async () => {
                await page.mouse.down();
                await page.mouse.up();
            });
        },
    },
    {
        id: "shift-click-add-node",
        name: "Shift-click a second node to add it",
        async run(page, ctx) {
            const [a, b] = ctx.nodes;
            await selectUntimed(page, a);
            await page.keyboard.down("Shift");
            await hoverUntimed(page, b);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                },
                async () => {
                    await page.mouse.down();
                    await page.mouse.up();
                },
            );
            await page.keyboard.up("Shift");
            return r;
        },
    },
    {
        id: "ctrl-click-toggle-node",
        name: "Ctrl-click a selected node to take it out",
        async run(page, ctx) {
            const [a, b] = ctx.nodes;
            await selectUntimed(page, a);
            await page.keyboard.down("Shift");
            await hoverUntimed(page, b);
            await page.mouse.down();
            await page.mouse.up();
            await page.keyboard.up("Shift");
            await until(page, "el.session.selection.has(p.b)", { b: b.id });
            await page.keyboard.down("Control");
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && !el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                },
                async () => {
                    await page.mouse.down();
                    await page.mouse.up();
                },
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
                { type: "pointerdown", cond: "el.session.selection.edges.map(String).includes(p.id)", params: e },
                async () => {
                    await page.mouse.down();
                    await page.mouse.up();
                },
            );
        },
    },
    {
        id: "click-empty-deselect",
        name: "Click empty canvas to clear the selection",
        async run(page, ctx, rep) {
            await selectUntimed(page, ctx.nodes[rep % 2]);
            await page.mouse.move(ctx.empty.x, ctx.empty.y);
            await frames(page, 2);
            return timed(page, { type: "pointerdown", cond: "el.session.selection.nodes.length === 0" }, async () => {
                await page.mouse.down();
                await page.mouse.up();
            });
        },
    },
    {
        id: "right-click-node",
        name: "Right-click an unselected node (selects it)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await hoverUntimed(page, t);
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id } }, async () => {
                await page.mouse.down({ button: "right" });
                await page.mouse.up({ button: "right" });
            });
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
            return timed(page, { type: "wheel", cond: CAM_MOVED }, () => page.mouse.wheel(0, rep % 2 ? 120 : -120));
        },
    },
    {
        id: "pinch-ctrl-wheel",
        name: "Trackpad pinch (Ctrl+wheel)",
        async run(page, ctx, rep) {
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await camStill(page);
            await page.keyboard.down("Control");
            const r = await timed(page, { type: "wheel", cond: CAM_MOVED }, () =>
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
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED }, () => page.keyboard.down(key));
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
            const r = await timed(page, { type: "keydown", cond: CAM_MOVED }, () => page.keyboard.down(key));
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
            const r = await timed(page, { type: "pointerup", cond: "el.session.selection.nodes.length > 0" }, () =>
                page.mouse.up(),
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
            return timed(page, { type: "pointerdown", cond: CAM_MOVED }, () =>
                page.mouse.click(box.x + f * box.w, box.y + f * box.h),
            );
        },
    },
    {
        id: "node-list-walk",
        name: "Keyboard walk of the accessible node list (ArrowDown; element option)",
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
            return timed(page, { type: "keydown", cond: "el.session.selection.nodes.length === 1" }, () =>
                page.keyboard.press("Enter"),
            );
        },
    },
];

// Touch runs after the mouse, with touch emulation switched on for the page.
const TOUCH = [
    {
        id: "touch-tap-select",
        name: "Tap a node to select it",
        async run(page, ctx, rep, cdp) {
            const t = ctx.nodes[rep % 2];
            const tp = (p) => [{ x: p.x, y: p.y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id } }, async () => {
                await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(t) });
                await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            });
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
                    await timed(page, { type: "pointermove", cond: CAM_MOVED }, () =>
                        cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(x, y) }),
                    ),
                );
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
            const c = ctx.center;
            const fingers = (gap) => [
                { x: c.x - gap / 2, y: c.y, id: 0, radiusX: 1, radiusY: 1, force: 1 },
                { x: c.x + gap / 2, y: c.y, id: 1, radiusX: 1, radiusY: 1, force: 1 },
            ];
            const out = [];
            let gap = rep % 2 ? 300 : 120;
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(gap) });
            for (let i = 0; i < 6; i++) {
                await camStill(page);
                gap += rep % 2 ? -25 : 25;
                out.push(
                    await timed(page, { type: "touchmove", cond: CAM_MOVED }, () =>
                        cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(gap) }),
                    ),
                );
            }
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await camStill(page);
            return out.slice(1);
        },
    },
];

// While a force layout keeps moving the graph, last: it changes the drawing for good.
const RUNNING = [
    {
        id: "hover-node-running-layout",
        name: "Hover a node while a force layout runs",
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
        name: "Click a node while a force layout runs",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            const t = (await nodeTargets(page, 1, 700 + rep))[0];
            if (!t) return { skip: "no node in view" };
            await page.mouse.move(t.x, t.y);
            await until(page, "el.session.selection.hovered !== null", {}, 60);
            return timed(page, { type: "pointerdown", cond: "el.session.selection.nodes.length === 1" }, async () => {
                await page.mouse.down();
                await page.mouse.up();
            });
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
    const ev = stats(flat.map((r) => r.eventMs));
    return {
        ...base,
        interaction: inter.id,
        name: inter.name,
        reps,
        samples: flat.length,
        timeouts: flat.filter((r) => r.timeout).length,
        noInput: flat.filter((r) => r.sawInput === false).length,
        median_ms: st?.median ?? null,
        p95_ms: st?.p95 ?? null,
        worst_ms: st?.worst ?? null,
        best_ms: st?.best ?? null,
        event_median_ms: ev?.median ?? null,
        perceivable: st ? st.p95 > PERCEIVED_MS : null,
        raw: ms,
        ...extra,
    };
}

/** One repetition of one interaction, into `g`; a rep that throws is recorded and its held keys let go. */
async function oneRep(page, ctx, inter, rep, cdp, g) {
    try {
        // A camera move or a layout changes where everything is drawn: find the targets again.
        if (!ctx.moving) await camStill(page);
        if (ctx.moving || (await camOf(page)) !== ctx.cam) Object.assign(ctx, await pageContext(page, ctx));
        const t0 = Date.now();
        const r = await inter.run(page, ctx, rep, cdp);
        if (r?.skip) g.skip = r.skip;
        else {
            g.samples.push(r);
            g.reps++;
        }
        if (Date.now() - t0 > 10000 && ctx.n >= 100000) g.slow = true;
    } catch (e) {
        g.errors.push(
            String(e?.message ?? e)
                .split("\n")[0]
                .slice(0, 200),
        );
        await page.mouse.up().catch(() => {});
        for (const k of ["Shift", "Control"]) await page.keyboard.up(k).catch(() => {});
    }
    console.log(rep, inter.id, JSON.stringify(g.samples.at(-1))?.slice(0, 160) ?? g.skip ?? g.errors.at(-1));
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

// ------------------------------------------------------------------ element pages

async function elementPage(spec, out) {
    const build = process.env.BENCH_BUILD ?? join(HERE, "builds", process.env.BENCH_LABEL ?? "interaction-latency");
    const server = process.env.BENCH_URL ? null : await serve(build);
    const url = process.env.BENCH_URL ?? `http://127.0.0.1:${server.address().port}/`;
    const b = await launch({ width: 1280, height: 1000 });
    const base = {
        surface: "graphty-element",
        path: spec.path,
        dim: spec.dim,
        n: spec.n,
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
        if (!/NVIDIA/.test(info.webgl)) throw new Error("void: renderer is " + info.webgl);
        const gen = await page.evaluate(([n]) => B.gen(n, 2 * n), [spec.n]);
        base.edges = gen.m;
        await page.evaluate((o) => B.setup("graphty", o), {
            mode: "plain",
            accel: "on",
            dpr: 1,
            renderPath: spec.path,
            dim: spec.dim,
        });
        const load = await page.evaluate(() => B.load());
        if (load.error) throw new Error("load failed: " + load.error);
        await page.evaluate(() => B.adapter.settle());
        base.renderPathDrawn = await page.evaluate(() => document.querySelector("graphty-element").renderPath);
        const ctx = await pageContext(page, spec);
        console.log("targets", JSON.stringify({ nodes: ctx.nodes, empty: ctx.empty, edges: ctx.edges }));
        if (ctx.nodes.length < 2 || !ctx.empty) throw new Error("no two pickable nodes or no empty point");
        const want = (list) =>
            list.filter(
                (i) => (!i.dims || i.dims.includes(spec.dim)) && (!spec.only || new RegExp(spec.only).test(i.id)),
            );
        await roundRobin(page, ctx, want(ELEMENT), spec.reps, base, out);
        const cdp = await b.ctx.newCDPSession(page);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await page.mouse.move(ctx.empty.x, ctx.empty.y);
        await roundRobin(page, ctx, want(TOUCH), spec.reps, base, out, cdp);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
        if (want(RUNNING).length) {
            await page.evaluate(() => document.querySelector("graphty-element").setLayout("ngraph"));
            await frames(page, 30);
            ctx.moving = true;
            await roundRobin(page, ctx, want(RUNNING), spec.reps, base, out);
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
};

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

const stable = (page) => page.evaluate(() => document.querySelector("graphty-element").waitForStableFrame());
const INSPECTOR = `document.querySelector('[aria-label="Inspector"] [role=heading][aria-level="2"]')?.textContent ?? ''`;

async function setFocusSelected(page, on) {
    await page.getByRole("button", { name: /^Camera\b/ }).click();
    const item = page.getByRole("menuitemcheckbox", { name: "Focus selected" });
    const checked = (await item.getAttribute("aria-checked")) === "true";
    if (checked !== on) await item.click();
    else await page.keyboard.press("Escape");
    await frames(page, 5);
}

const APP = [
    ...["hover-node", "pointer-leaves-node", "hover-edge", "click-empty-deselect", "click-select-edge"].map((id) => ({
        ...ELEMENT.find((i) => i.id === id),
    })),
    {
        id: "app-click-select-node",
        name: "Click a node (selection drawn; Inspector shows it; Focus selected glide)",
        async run(page, ctx, rep) {
            const t = ctx.nodes[rep % 2];
            await clickEmptyUntimed(page, ctx);
            await stable(page);
            await hoverUntimed(page, t);
            return timed(page, { type: "pointerdown", cond: SEL_IS, params: { id: t.id } }, async () => {
                await page.mouse.down();
                await page.mouse.up();
            });
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
            const before = await page.evaluate(`(() => ${INSPECTOR})()`);
            return timed(
                page,
                {
                    type: "pointerdown",
                    cond: `${SEL_IS} && (${INSPECTOR}) !== p.before`,
                    params: { id: u.id, before },
                },
                async () => {
                    await page.mouse.down();
                    await page.mouse.up();
                },
            );
        },
    },
    {
        id: "app-click-glide-settled",
        name: "Click a node until the Focus selected glide has settled",
        async run(page, ctx, rep) {
            await clickEmptyUntimed(page, ctx);
            await stable(page);
            const u = (await nodeTargets(page, 2))[rep % 2] ?? ctx.nodes[rep % 2];
            await hoverUntimed(page, u);
            await page.evaluate(() => {
                globalThis.__settle = null;
                addEventListener("pointerdown", (e) => (globalThis.__settle = { t0: e.timeStamp }), {
                    capture: true,
                    once: true,
                });
            });
            await page.mouse.down();
            await page.mouse.up();
            const ms = await page.evaluate(async (id) => {
                const el = document.querySelector("graphty-element");
                const raf = () => new Promise((r) => requestAnimationFrame(r));
                while (!el.session.selection.has(id)) await raf();
                await raf();
                await el.waitForStableFrame();
                await raf();
                await raf();
                return +(performance.now() - globalThis.__settle.t0).toFixed(1);
            }, u.id);
            return { ms, sawInput: true, timeout: false };
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
            await page.keyboard.down("Shift");
            await hoverUntimed(page, b);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "el.session.selection.has(p.a) && el.session.selection.has(p.b)",
                    params: { a: a.id, b: b.id },
                },
                async () => {
                    await page.mouse.down();
                    await page.mouse.up();
                },
            );
            await page.keyboard.up("Shift");
            return r;
        },
    },
    {
        id: "app-escape-deselect",
        name: "Escape clears the selection",
        async run(page, ctx, rep) {
            await selectUntimed(page, ctx.nodes[rep % 2]);
            await stable(page);
            return timed(page, { type: "keydown", cond: "el.session.selection.nodes.length === 0" }, () =>
                page.keyboard.press("Escape"),
            );
        },
    },
    {
        id: "app-right-click-menu",
        name: "Right-click a node until the canvas menu shows",
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
            const r = await timed(
                page,
                { type: "keydown", cond: "el.session.selection.nodes.length >= p.n", params: { n: ctx.nodeCount } },
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
            return timed(page, { type: "keydown", cond: "el.session.selection.nodes.length > 1" }, () =>
                page.keyboard.press("g"),
            );
        },
    },
    {
        id: "app-fit-graph",
        name: "0 fits the graph (first moved frame)",
        async run(page, ctx) {
            await page.mouse.move(ctx.center.x, ctx.center.y);
            await page.mouse.wheel(0, -360);
            await stable(page);
            await camStill(page);
            await clickEmptyUntimed(page, ctx);
            return timed(page, { type: "keydown", cond: CAM_MOVED }, () => page.keyboard.press("0"));
        },
    },
    {
        id: "app-switch-dimension",
        name: "5 switches 2D and 3D (dimension changed and drawn)",
        async run(page, ctx) {
            await stable(page);
            await clickEmptyUntimed(page, ctx);
            const before = await page.evaluate(
                () => document.querySelector("graphty-element").session.layout.dimension,
            );
            const r = await timed(
                page,
                { type: "keydown", cond: "el.session.layout.dimension !== p.before", params: { before } },
                () => page.keyboard.press("5"),
            );
            await stable(page);
            return r;
        },
    },
    {
        id: "app-table-open",
        name: "Shift+T opens the table (first data row shown)",
        async run(page, ctx) {
            await clickEmptyUntimed(page, ctx);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: '!!document.querySelector(\'[aria-label="Table"] [role=row] [role=cell], [aria-label="Table"] tbody tr\')',
                },
                () => page.keyboard.press("Shift+T"),
            );
            await page.keyboard.press("Shift+T");
            await until(
                page,
                '!document.querySelector(\'[aria-label="Table"] tbody tr, [aria-label="Table"] [role=cell]\')',
            );
            await stable(page);
            return r;
        },
    },
    {
        id: "app-quick-actions",
        name: "Ctrl+K opens the quick actions palette",
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
        name: "Typing one character in Find updates the results",
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
        name: "Click the Data place in the rail",
        async run(page) {
            const data = page.getByRole("button", { name: "Data", exact: true });
            const graph = page.getByRole("button", { name: "Graph", exact: true });
            const box = await data.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            const r = await timed(
                page,
                {
                    type: "pointerdown",
                    cond: "!!document.querySelector('[aria-label=\"Data place\"]')?.getClientRects().length",
                },
                () => page.mouse.click(box.x + box.width / 2, box.y + box.height / 2),
            );
            await graph.click();
            await stable(page);
            return r;
        },
    },
    {
        id: "app-restyle-color",
        name: "Set the Everything layer's node color (Enter until nodes resolve to it)",
        async run(page, ctx, rep) {
            const color = rep % 2 ? "blue" : "red";
            const hex = rep % 2 ? "#0000FF" : "#FF0000";
            await page.getByRole("treeitem", { name: /^Everything,/ }).click();
            const field = page.getByRole("textbox", { name: /^Node color/ });
            await field.click();
            await field.fill(color);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: "(() => { const s = el.session; const v = s.styles.explain({ node: p.id }).merged['node.color']; return v && String(v.hex ?? v).toUpperCase() === p.hex; })()",
                    params: { id: ctx.nodes[0].id, hex },
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
            const look = () =>
                page.evaluate((id) => {
                    const v = document.querySelector("graphty-element").session.styles.explain({ node: id }).merged[
                        "node.color"
                    ];
                    return v ? String(v.hex ?? v).toUpperCase() : null;
                }, ctx.nodes[0].id);
            await page.getByRole("treeitem", { name: /^Everything,/ }).click();
            const field = page.getByRole("textbox", { name: /^Node color/ });
            await field.click();
            await field.fill("green");
            await page.keyboard.press("Enter");
            await stable(page);
            const changed = await look();
            await clickEmptyUntimed(page, ctx);
            const r = await timed(
                page,
                {
                    type: "keydown",
                    cond: "(() => { const v = el.session.styles.explain({ node: p.id }).merged['node.color']; return (v ? String(v.hex ?? v).toUpperCase() : null) !== p.changed; })()",
                    params: { id: ctx.nodes[0].id, changed },
                },
                () => page.keyboard.press("Control+z"),
            );
            await stable(page);
            return r;
        },
    },
    ...["drag-node", "drag-orbit-3d", "wheel-zoom"].map((id) => ({ ...ELEMENT.find((i) => i.id === id) })),
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
        at: new Date().toISOString(),
        loadavg: loadavg()[0],
        cpus: /Cpus_allowed_list:\s*(\S+)/.exec(readFileSync("/proc/self/status", "utf8"))?.[1],
    };
    try {
        const { page } = b;
        base.renderer = await rendererOf(page);
        if (!/NVIDIA/i.test(base.renderer)) throw new Error("void: renderer is " + base.renderer);
        await page.goto(origin);
        const t0 = Date.now();
        await g.open(page);
        await stable(page);
        base.openMs = Date.now() - t0;
        // A control the walk cannot find fails that rep after a minute, not the whole page after ten.
        page.setDefaultTimeout(60000);
        const facts = await page.evaluate(() => {
            const el = document.querySelector("graphty-element");
            return {
                renderPath: el.renderPath,
                nodes: el.session.data.nodes().length,
                edges: el.session.data.edges().length,
                dim: el.session.layout.dimension,
            };
        });
        Object.assign(base, { path: facts.renderPath, n: facts.nodes, edges: facts.edges, dim: facts.dim });
        const ctx = await pageContext(page, { dim: facts.dim, n: facts.nodes });
        ctx.nodeCount = facts.nodes;
        ctx.findChar = await page.evaluate(() => {
            const n = document.querySelector("graphty-element").session.data.nodes()[0];
            const name = String(n.name ?? n.label ?? n.id);
            return name[0] ?? "a";
        });
        console.log("targets", JSON.stringify({ nodes: ctx.nodes, empty: ctx.empty, edges: ctx.edges }));
        if (ctx.nodes.length < 2 || !ctx.empty) throw new Error("no two pickable nodes or no empty point");
        const list = APP.filter((i) => !spec.only || new RegExp(spec.only).test(i.id));
        await roundRobin(page, ctx, list, spec.reps, base, out);
        // The same click with the app's Focus selected glide switched off, to separate the glide's cost.
        if (!spec.only || new RegExp(spec.only).test("app-click-select-node")) {
            await setFocusSelected(page, false);
            const again = APP.filter((i) => i.id === "app-click-select-node" || i.id === "app-click-inspector").map(
                (i) => ({ ...i, id: `${i.id}-focus-off`, name: `${i.name} (Focus selected off)` }),
            );
            await roundRobin(page, ctx, again, spec.reps, base, out);
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
            ? `app ${r.graph} ${r.features} (${r.path}, ${K(r.n)})`
            : `element ${r.path} ${r.dim} ${K(r.n)}`;
    const note = (r) =>
        [
            r.notMeasured,
            r.timeouts ? r.timeouts + " timeouts" : "",
            r.errors ? r.errors.length + " errors: " + r.errors[0] : "",
        ]
            .filter(Boolean)
            .join("; ");
    const lines = [
        "| interaction | where | reps | median ms | p95 ms | worst ms | event ms | note |",
        "|---|---|---|---|---|---|---|---|",
    ];
    for (const r of cells.sort((a, b) => (b.p95_ms ?? -1) - (a.p95_ms ?? -1)))
        lines.push(
            `| ${r.interaction} | ${where(r)} | ${r.reps} | ${fmt(r.median_ms)} | ${fmt(r.p95_ms)} | ${fmt(r.worst_ms)} | ${fmt(r.event_median_ms)} | ${note(r)} |`,
        );
    for (const f of fails) lines.push(`| (page failed) | ${where(f)} | | | | | | ${f.failure} |`);
    console.log(lines.join("\n"));
    const slow = cells.filter((r) => r.p95_ms > PERCEIVED_MS);
    console.log(`\n${slow.length} of ${cells.length} cells have a p95 above ${PERCEIVED_MS} ms.`);
}

// ------------------------------------------------------------------ main

const [cmd, file, ...rest] = process.argv.slice(2);
const { values: o } = parseArgs({
    args: rest,
    options: {
        sizes: { type: "string", default: "1k,10k,50k,100k" },
        paths: { type: "string", default: "objects,batched" },
        dims: { type: "string", default: "3d,2d" },
        reps: { type: "string", default: "5" },
        only: { type: "string" },
        dist: { type: "string", default: join(REPO, "graphty/dist") },
        features: { type: "string", default: ",cosmograph" },
        graphs: { type: "string", default: "lesmis,yed-live,staff-50k" },
        spec: { type: "string" },
    },
});
if (!file) throw new Error("usage: see the top of interaction-latency.mjs");
const out = resolve(file);
mkdirSync(dirname(out), { recursive: true });

if (cmd === "report") report(out);
else if (cmd === "page") {
    const spec = JSON.parse(o.spec);
    if (spec.kind === "app") await appPage(spec, out);
    else await elementPage(spec, out);
} else if (cmd === "element" || cmd === "app") {
    const specs = [];
    if (cmd === "element")
        for (const s of o.sizes.split(","))
            for (const dim of o.dims.split(","))
                for (const path of o.paths.split(","))
                    specs.push({ kind: "element", n: SIZES[s], dim, path, reps: Number(o.reps), only: o.only });
    else
        for (const graph of o.graphs.split(","))
            for (const features of o.features.split(","))
                specs.push({ kind: "app", graph, features, dist: o.dist, reps: Number(o.reps), only: o.only });
    const wrap = (process.env.LAT_WRAP ?? "").split(" ").filter(Boolean);
    for (const spec of specs) {
        const argv = [fileURLToPath(import.meta.url), "page", out, "--spec", JSON.stringify(spec)];
        console.log("==", JSON.stringify(spec));
        const [bin, ...args] = wrap.length ? [...wrap, process.execPath, ...argv] : [process.execPath, ...argv];
        // A page that hangs is ended after 40 minutes; its interactions are then missing from the results.
        spawnSync(bin, args, { stdio: "inherit", timeout: 40 * 60 * 1000 });
    }
} else throw new Error(`unknown command ${cmd}`);

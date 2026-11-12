// BENCH_URL=... BENCH_RESULTS=... node run.mjs <lib> <mode> <accel> <n> <m> <dpr> [skip-layout] [labels] [sampled] [glyphs] [curves] [3d] [no-still] [no-move]
// lib: cosmos|graphty; mode: default|lean; accel: on|off. Appends one JSON line to BENCH_RESULTS.
// dpr other than 1 sets pixel-ratio="device" on graphty-element. BENCH_RENDER_PATH sets its renderPath option;
// unset, the element keeps its default. BENCH_ANTIALIAS=false sets antialias="false". See RUNBOOK.md for the others.
import { execFileSync, execSync } from "node:child_process";
import { appendFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadavg } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROFILES = join(HERE, "profiles");
mkdirSync(PROFILES, { recursive: true });
// The checkout whose Playwright, and so whose Chromium, drives the run.
const TOOLS = process.env.BENCH_TOOLS ?? join(HERE, "../..");
const { chromium } = createRequire(join(TOOLS, "visual-review/package.json"))("playwright");

const BASE = process.env.BENCH_URL;
const RESULTS = process.env.BENCH_RESULTS;
if (!BASE || !RESULTS) throw new Error("set BENCH_URL and BENCH_RESULTS");
const DEADLINE_S = Number(process.env.BENCH_DEADLINE_S ?? 570);
const RENDER_PATH = process.env.BENCH_RENDER_PATH || undefined;
const RENDERER = process.env.BENCH_RENDERER || undefined;
const ANTIALIAS = process.env.BENCH_ANTIALIAS === undefined ? undefined : process.env.BENCH_ANTIALIAS !== "false";
const LIMITS = process.env.BENCH_LIMITS ? JSON.parse(process.env.BENCH_LIMITS) : undefined;
const [lib, mode, accel, n, m, dpr, ...flags] = process.argv.slice(2);
const skip = flags.includes("skip-layout"),
    labels = flags.includes("labels"),
    // label sampling on (layoutBehavior.labels.sampleCell), only with labels
    sampled = flags.includes("sampled"),
    // labels drawn from the glyph atlas (layoutBehavior.labels.labelText "glyphs"), only with labels
    glyphs = flags.includes("glyphs"),
    // every edge a curve (edge.curvature) with no caps, in 3D: the curve scenario of stage 21
    curves = flags.includes("curves"),
    // the lean mode's straight edges kept in 3D, where they are pulled under batched (cosmos-gap G12)
    threeD = flags.includes("3d"),
    noStill = flags.includes("no-still"),
    noMove = flags.includes("no-move");
const N = Number(n),
    M = Number(m),
    DPR = Number(dpr);
// The extracted libEGL sits in the main checkout's tmp/, which a worktree does not have.
const gitDir = execSync("git rev-parse --path-format=absolute --git-common-dir", { cwd: HERE }); // NOSONAR(S4036): a local measuring tool, run from the owner's PATH
const MAIN = dirname(gitDir.toString().trim());
const EGL = process.env.BENCH_EGL ?? join(MAIN, "tmp/egl/root/usr/lib/x86_64-linux-gnu");
const FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
    "--enable-precise-memory-info",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
    `--unsafely-treat-insecure-origin-as-secure=${BASE}`,
    "--js-flags=--max-old-space-size=16384",
];
const gpuMB = () =>
    Number(execSync("nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits").toString().trim()); // NOSONAR(S4036): a local measuring tool, run from the owner's PATH
// Sum RSS (MB) of every browser process launched with this run's profile dir, by process type.
const rssMB = () => {
    const rows = execSync("ps -eo pid,ppid,rss,args --no-headers") // NOSONAR(S4036): a local measuring tool, run from the owner's PATH
        .toString()
        .trim()
        .split("\n")
        .map((l) => {
            const [pid, ppid, rss, ...a] = l.trim().split(/\s+/);
            return { pid: +pid, ppid: +ppid, rss: +rss, args: a.join(" ") };
        });
    const roots = rows.filter((r) => r.args.includes(UDD) && !r.args.includes("--type="));
    const kids = new Map();
    for (const r of rows) (kids.get(r.ppid) ?? kids.set(r.ppid, []).get(r.ppid)).push(r);
    const by = {};
    const st = [...roots];
    while (st.length) {
        const r = st.pop();
        const type = (r.args.match(/--type=([a-z-]+)/) ?? [null, "browser"])[1];
        const sub = (r.args.match(/--utility-sub-type=([a-zA-Z.]+)/) ?? [null, ""])[1];
        const key = type === "utility" && sub ? sub.split(".").pop() : type;
        by[key] = (by[key] ?? 0) + r.rss;
        st.push(...(kids.get(r.pid) ?? []));
    }
    for (const k in by) by[k] = Math.round(by[k] / 1024);
    return by;
};

mkdirSync(join(dirname(RESULTS), "shots"), { recursive: true });
const out = {
    lib,
    mode,
    accel,
    renderPath: lib === "graphty" ? RENDER_PATH : undefined,
    rendererRequest: lib === "graphty" ? RENDERER : undefined,
    antialias: lib === "graphty" ? ANTIALIAS : undefined,
    limits: lib === "graphty" ? LIMITS : undefined,
    n: N,
    m: M,
    dpr: DPR,
    labels,
    flags,
    at: new Date().toISOString(),
    loadavgBefore: loadavg()[0],
};
const log = (k, v) => {
    out[k] = v;
    console.log(k, JSON.stringify(v));
};
const UDD = mkdtempSync(join(PROFILES, "p-"));
const ctx = await chromium.launchPersistentContext(UDD, {
    args: FLAGS,
    env: { ...process.env, FC_FONTATIONS: "1", LD_LIBRARY_PATH: EGL },
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: DPR,
});
let saved = false;
const save = () => {
    out.loadavgAfter = loadavg()[0];
    if (!saved) appendFileSync(RESULTS, JSON.stringify(out) + "\n");
    saved = true;
};
// Ends a run that cannot finish: the row records how far it got, and the failure is the result.
setTimeout(async () => {
    log("failure", DEADLINE_S >= 570 ? "did not finish in 10 minutes" : `did not finish in ${DEADLINE_S} s`);
    save();
    try {
        execFileSync("pkill", ["-9", "-f", UDD]); // NOSONAR(S4036): a local measuring tool, run from the owner's PATH
    } catch {
        /* pkill exits 1 when nothing matched */
    }
    rmSync(UDD, { recursive: true, force: true });
    process.exit(0);
}, DEADLINE_S * 1000).unref();
try {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    page.setDefaultTimeout(900000);
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    page.on("crash", () => log("crash", { atS: Math.round((Date.now() - Date.parse(out.at)) / 1000), peak: out.peak }));
    // Labels at 100,000 nodes can end the browser, so a run with them keeps the highest memory it saw.
    if (labels) {
        out.peak = { gpuMB: 0, rendererMB: 0, gpuProcessMB: 0 };
        setInterval(() => {
            const r = rssMB();
            out.peak = {
                gpuMB: Math.max(out.peak.gpuMB, gpuMB()),
                rendererMB: Math.max(out.peak.rendererMB, r.renderer ?? 0),
                gpuProcessMB: Math.max(out.peak.gpuProcessMB, r["gpu-process"] ?? 0),
            };
        }, 5000).unref();
    }
    page.on("console", (c) => {
        if (c.type() === "error") console.log("console.error:", c.text().slice(0, 300));
    });
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${BASE}/`);
    await page.waitForFunction(() => globalThis.B);
    const info = await page.evaluate(() => B.info());
    log("info", info);
    Object.assign(out, {
        sha: info.build.sha,
        source: info.build.source,
        dirty: info.build.dirty,
        renderer: info.webgl,
    });
    if (!/RTX 4070 SUPER/.test(info.webgl) || /swiftshader/i.test(info.webgl)) {
        out.void = true;
        throw new Error("void: renderer is " + info.webgl);
    }
    const gpu0 = gpuMB();
    log("baseline", {
        gpuMB: gpu0,
        rssMB: rssMB(),
        secure: await page.evaluate(() => [isSecureContext, !!navigator.gpu]),
    });
    log("floor", await page.evaluate(() => B.floor()));
    log("gen", await page.evaluate(([n, m]) => B.gen(n, m), [N, M]));
    // BENCH_PROFILE_TIMED names a file prefix: the engine setup, the load and the layout frame stages are then
    // CPU-profiled while they are timed, into <prefix>-setup, -load and -layout .cpuprofile, to read their
    // garbage collector and per-function time. The profiler slows them, so write those rows to their own file.
    const profiled = async (stage, run, arg) => {
        if (!process.env.BENCH_PROFILE_TIMED) return page.evaluate(run, arg);
        await cdp.send("Profiler.enable");
        await cdp.send("Profiler.start");
        const out = await page.evaluate(run, arg);
        const { profile: p } = await cdp.send("Profiler.stop");
        writeFileSync(`${process.env.BENCH_PROFILE_TIMED}-${stage}.cpuprofile`, JSON.stringify(p));
        return out;
    };
    log(
        "setup",
        await profiled("setup", ([l, o]) => B.setup(l, o), [
            lib,
            {
                mode,
                accel,
                dpr: DPR,
                labels,
                sampled,
                glyphs,
                curves,
                threeD,
                renderPath: RENDER_PATH,
                renderer: RENDERER,
                antialias: ANTIALIAS,
                limits: LIMITS,
                onDemand: !!process.env.LAYOUT_ONLY,
            },
        ]),
    );
    const load = await profiled("load", () => B.load());
    log("load", load);
    if (load.error) throw new Error("load failed: " + load.error);
    log("canvas", await page.evaluate(() => B.canvasSize()));
    // A row that quietly left the fast path would be measured as if it were on it. Checked after
    // the load and again after the drag, the one stage that touches a node.
    const checkBatched = async (stage) => {
        if (lib !== "graphty" || RENDER_PATH !== "batched") return;
        const rows = await page.evaluate(() => document.querySelector("graphty-element")?.rowCounts);
        log(stage === "load" ? "rowCounts" : `rowCounts-${stage}`, rows);
        if (!rows || rows.objectNodes > 0 || ((curves || threeD) && rows.objectEdges > 0))
            throw new Error(`rows left the batched path after ${stage}: ${JSON.stringify(rows)}`);
    };
    await checkBatched("load");
    // What a labelled run really built: with sampling on, only the cells' winners.
    if (labels && lib === "graphty")
        log(
            "labelCounts",
            await page.evaluate(async () => {
                const el = document.querySelector("graphty-element");
                await el.graph?.waitForStableFrame?.();
                return el.nodeLabelCounts;
            }),
        );
    if (process.env.ONLY_ORBIT) {
        console.log("orbit-debug", JSON.stringify(await page.evaluate(() => B.orbitDebug(20))));
        throw new Error("debug stop");
    }
    if (process.env.LAYOUT_ONLY) {
        out.layoutOnly = true;
        log(
            "layoutSteps",
            await page.evaluate(async () => {
                await B.layoutFps(1, 1);
                return B.layoutSteps();
            }),
        );
        throw new Error("layout-only run, render-on-demand");
    }
    if (!noStill) log("still", await page.evaluate(() => B.still(200)));
    if (!noStill) log("gpuFrame", await page.evaluate(() => B.gpuFrame(60)));
    await page
        .screenshot({
            path: join(
                dirname(RESULTS),
                "shots",
                `${lib}-${mode}-${accel}-${N}-${M}-dpr${DPR}${labels ? "-labels" : ""}.png`,
            ),
            timeout: 20000,
        })
        .catch((e) => console.log("screenshot failed", String(e).slice(0, 120)));
    // BENCH_PROFILE names a file prefix: the moving and still stages are then also CPU-profiled
    // into <prefix>-orbit.cpuprofile and <prefix>-still.cpuprofile, outside the timed runs.
    const profile = async (stage, run) => {
        if (!process.env.BENCH_PROFILE) return;
        await cdp.send("Profiler.enable");
        await cdp.send("Profiler.start");
        await page.evaluate(run);
        const { profile: p } = await cdp.send("Profiler.stop");
        writeFileSync(`${process.env.BENCH_PROFILE}-${stage}.cpuprofile`, JSON.stringify(p));
    };
    await profile("still", () => B.still(60));
    await profile("orbit", () => B.orbit(60));
    if (!noMove) log("orbit", await page.evaluate(() => B.orbit(200)));
    if (!noMove) log("drag", await page.evaluate(() => B.drag(60)));
    if (!noMove) await checkBatched("drag");
    // The heap as the page holds it, before the forced collection below shrinks it.
    log("memoryNoGc", { ...(await page.evaluate(() => B.mem())), rssMB: rssMB() });
    await cdp.send("HeapProfiler.collectGarbage");
    log("memory", { ...(await page.evaluate(() => B.mem())), gpuMBDelta: gpuMB() - gpu0, rssMB: rssMB() });
    // Hover before the layout: a run of the layout moves cosmos.gl's points off the screen, which is
    // why its 10,000-node hover used to find no target. Both libraries hover the same still scene.
    await hoverStage(page, "hover");
    if (lib === "graphty") log("lasso", await page.evaluate(() => B.lasso(20)));
    if (!skip) {
        log("layoutFps", await profiled("layout", () => B.layoutFps(200, 30000)));
        // The layout is still running: a hover reads the node under the pointer back from the GPU,
        // which waits behind every frame queued ahead of it.
        await hoverStage(page, "hoverLayout");
        log("layoutSteps", await page.evaluate(() => B.layoutSteps()));
    }
} catch (e) {
    log("failure", String(e?.message ?? e).slice(0, 500));
} finally {
    save();
    await ctx.close();
    rmSync(UDD, { recursive: true, force: true });
}

/**
 * Hovers ten nodes and logs how long each took to answer, under a stage name.
 * @param {import("playwright").Page} page - The page.
 * @param {string} stage - The row's field.
 */
async function hoverStage(page, stage) {
    const K = 10;
    const targets = await page.evaluate((k) => B.hoverTargets(k), K);
    const lats = [];
    for (const t of targets) {
        await page.mouse.move(1260, 980);
        await page.waitForTimeout(150);
        await page.evaluate(() => B.armHover());
        await page.mouse.move(t.x, t.y);
        const ok = await page
            .waitForFunction(() => B.hoverResult()?.hit, null, { timeout: 180000, polling: 20 })
            .then(
                () => true,
                () => false,
            );
        if (!ok) {
            lats.push(">180000");
            break;
        }
        const r = await page.evaluate(() => B.hoverResult());
        lats.push(+r.hit.lat.toFixed(1));
    }
    await page.mouse.move(1260, 980);
    log(stage, { targets: targets.length, latMs: lats });
}

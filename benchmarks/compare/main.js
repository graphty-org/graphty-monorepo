// Benchmark page: one library per page load. The runner (run.mjs) calls window.B.* in order.
import { erdosRenyiGnmGraph } from "@graphty/graph-samples/generators";

const host = document.getElementById("host");
const now = () => performance.now();
const raf = () => new Promise((r) => requestAnimationFrame(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stats(xs) {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
    return {
        n: s.length,
        median: +q(0.5).toFixed(2),
        p95: +q(0.95).toFixed(2),
        p99: +q(0.99).toFixed(2),
        min: +s[0].toFixed(2),
        max: +s[s.length - 1].toFixed(2),
    };
}
const intervals = (st) => st.slice(1).map((t, i) => t - st[i]);

function mulberry32(a) {
    return () => {
        a |= 0; // NOSONAR(S7767): int32 wrap, which Math.trunc does not do; the positions depend on it
        a = (a + 0x6d2b79f5) | 0; // NOSONAR(S7767): int32 wrap, as above
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function webglRenderer() {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : String(gl?.getParameter(gl.RENDERER));
}

// The element's own 30 s default rejects at 100,000 nodes; the runner's deadline is what ends a hang.
const STABLE_MS = 600000;
let G = null; // the graph: its counts, edge endpoints and positions
let lib = null; // adapter
const stamps = [];
// When true, every drawn frame is followed by a blocking 1-pixel readPixels, so a stamp marks
// the frame's GPU work as finished and nothing queues: interval = CPU + GPU cost of one frame.
let SYNC = true;
const px = new Uint8Array(4);
const finish = (gl) => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

const B = {
    async info() {
        let gpu = null;
        try {
            const a = await navigator.gpu?.requestAdapter();
            gpu = a
                ? {
                      vendor: a.info?.vendor,
                      architecture: a.info?.architecture,
                      description: a.info?.description,
                      device: a.info?.device,
                  }
                : null;
        } catch (e) {
            gpu = String(e);
        }
        return {
            build: __BENCH_BUILD__,
            ua: navigator.userAgent,
            dpr: devicePixelRatio,
            webgl: webglRenderer(),
            webgpu: gpu,
            heapLimitMB: performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) : null,
        };
    },

    // The cost of the measurement itself: clear a 1200x900 WebGL2 canvas and read one pixel.
    async floor() {
        const c = document.createElement("canvas");
        c.width = 1200 * devicePixelRatio;
        c.height = 900 * devicePixelRatio;
        document.body.append(c);
        const gl = c.getContext("webgl2");
        const st = [];
        while (st.length < 201) {
            await raf();
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            finish(gl);
            st.push(now());
        }
        c.remove();
        return stats(intervals(st));
    },
    gen(n, m) {
        const t = now();
        const g = erdosRenyiGnmGraph({ n, m, seed: 42 });
        const r = mulberry32(7);
        const L = 4 * Math.sqrt(n);
        const xy = new Float32Array(2 * n);
        for (let i = 0; i < 2 * n; i++) xy[i] = (r() - 0.5) * L;
        G = { n, m: g.src.length, src: g.src, dst: g.dst, xy };
        return { n, m: G.m, genMs: Math.round(now() - t) };
    },

    async setup(name, opts) {
        lib = name === "cosmos" ? await cosmosAdapter(opts) : await graphtyAdapter(opts);
        return lib.describe();
    },
    load: () => lib.load(),
    async still(frames = 200) {
        await lib.settle();
        SYNC = false;
        const paced = stats(intervals(await lib.frames(frames + 1, null)));
        SYNC = true;
        const serial = stats(intervals(await lib.frames(frames + 1, null)));
        return { serial, paced };
    },
    // The GPU time of each of `frames` still frames, from EXT_disjoint_timer_query_webgl2, to set
    // beside the serial still frame: a serial interval below it means the stamps run early.
    gpuFrame: (frames = 60) => lib.gpuFrame?.(frames) ?? null,
    async orbit(frames = 200) {
        const st = await lib.frames(frames + 1, (i) => lib.moveCamera(i));
        await lib.resetCamera?.();
        return stats(intervals(st));
    },
    // A node moved each frame the way a drag does, through setMeshPosition (NodeBehavior's drag
    // path). Never through `node.mesh`: reading it sends the node's whole group off the batch.
    // cosmos.gl has no drag here.
    async drag(frames = 60) {
        if (!lib.moveNode) return null;
        const st = await lib.frames(frames + 1, (i) => lib.moveNode(i));
        await lib.settle();
        return stats(intervals(st));
    },
    async orbitDebug(frames) {
        const cam = lib.el?.graph.getCameraState();
        const t = [];
        for (let i = 0; i < frames; i++) {
            const a = now();
            lib.moveCamera(i);
            await raf();
            t.push(+(now() - a).toFixed(1));
        }
        return { cam, t, stamps: stamps.length, after: lib.el?.graph.getCameraState() };
    },
    hoverTargets: (k) => lib.hoverTargets(k),
    // A lasso over the middle half of the canvas, through the `{ region }` selection target
    // (row-renderer.md stage 23): each call's time, the nodes it selected and whether the cap cut it.
    // cosmos.gl's region select is not measured here.
    async lasso(times = 20) {
        const el = lib.el;
        if (!el?.session?.selection) return null;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const polygon = [
            { x: w / 4, y: h / 4 },
            { x: (3 * w) / 4, y: h / 4 },
            { x: (3 * w) / 4, y: (3 * h) / 4 },
            { x: w / 4, y: (3 * h) / 4 },
        ];
        const ms = [];
        let delta = null;
        for (let i = 0; i < times; i++) {
            await el.session.selection.clear();
            const a = now();
            delta = await el.session.selection.apply({ region: { polygon } });
            ms.push(+(now() - a).toFixed(2));
        }
        await el.session.selection.clear();
        return { ms: stats(ms), nodes: delta.nodes, truncated: delta.truncated };
    },
    armHover() {
        B._hover = { ev: null, hit: null, f0: stamps.length, tArm: now() };
        return true;
    },
    hoverResult: () => B._hover,
    layoutFps: (frames, capMs) => lib.layoutFps(frames, capMs),
    layoutSteps: () => lib.layoutSteps(),
    mem() {
        return performance.memory
            ? {
                  usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
                  totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
              }
            : null;
    },
    canvasSize() {
        const c =
            host.querySelector("canvas") ??
            document.querySelector("graphty-element")?.shadowRoot?.querySelector("canvas") ??
            document.querySelector("canvas");
        return c ? { width: c.width, height: c.height, cssW: c.clientWidth, cssH: c.clientHeight } : null;
    },
};
globalThis.B = B;
globalThis.addEventListener(
    "pointermove",
    () => {
        if (B._hover && B._hover.ev === null) B._hover.ev = now();
    },
    true,
);
const hoverHit = (detail) => {
    if (B._hover && B._hover.ev !== null && B._hover.hit === null)
        B._hover.hit = {
            t: now(),
            lat: now() - B._hover.ev,
            detail,
            frames: stamps.length - B._hover.f0,
            armToEv: B._hover.ev - B._hover.tArm,
        };
};

// ---------------------------------------------------------------- cosmos.gl
async function cosmosAdapter({ dpr }) {
    const { Graph } = await import("@cosmos.gl/graph");
    const div = document.createElement("div");
    div.style.cssText = "width:1200px;height:900px";
    host.append(div);
    const tCreate = now();
    const graph = new Graph(div, {
        enableRenderLoop: false,
        enableSimulation: true,
        pixelRatio: dpr,
        randomSeed: 7,
        fitViewOnInit: true,
        rescalePositions: false,
        fitViewDelay: 0,
        fitViewDuration: 0,
        backgroundColor: "#ffffff",
        pointDefaultColor: "#6366F1",
        linkDefaultColor: "#999999",
        onPointMouseOver: (index) => hoverHit({ index }),
    });
    await graph.ready;
    const readyMs = now() - tCreate;
    let loop = null; // per-frame hook while frames() runs
    let gl = null;
    const sync = () => {
        gl ??= div.querySelector("canvas").getContext("webgl2");
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    };
    // Our own frame loop: one forced draw per animation frame.
    let running = true;
    // Paced like graphty-element's own loop (RenderManager.gpuBehind): skip a tick while the
    // previous frame's fence is unsignalled, so the GPU queue never grows past one frame.
    let fence = null;
    const tick = () => {
        if (!running) return;
        requestAnimationFrame(tick);
        gl ??= div.querySelector("canvas").getContext("webgl2");
        if (fence !== null) {
            if (gl.getSyncParameter(fence, gl.SYNC_STATUS) === gl.UNSIGNALED) return;
            gl.deleteSync(fence);
            fence = null;
        }
        if (loop) loop();
        graph.renderOneFrame();
        if (SYNC) finish(gl);
        else {
            fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl.flush();
        }
        stamps.push(now());
    };
    let k0 = null;
    const a = {
        describe: () => ({ lib: "cosmos", deviceReadyMs: Math.round(readyMs) }),
        async load() {
            // Same layout as graphty's, mapped into cosmos' space (spaceSize 4096) so no rescale runs.
            const L = 4 * Math.sqrt(G.n);
            const pos = new Float32Array(G.xy.length);
            for (let i = 0; i < pos.length; i++) pos[i] = 2048 + (G.xy[i] / L) * 3000;
            const links = new Float32Array(2 * G.m);
            for (let e = 0; e < G.m; e++) {
                links[2 * e] = G.src[e];
                links[2 * e + 1] = G.dst[e];
            }
            const t0 = now();
            graph.setPointPositions(pos);
            graph.setLinks(links);
            graph.render();
            if (graph.isSimulationRunning) graph.pause();
            const tHanded = now();
            graph.renderOneFrame();
            sync();
            const tFirst = now();
            requestAnimationFrame(tick);
            return {
                handoverMs: +(tHanded - t0).toFixed(1),
                firstFrameMs: +(tFirst - t0).toFixed(1),
                readyMs: +(tFirst - t0).toFixed(1),
                simRunningAfterRender: graph.isSimulationRunning,
            };
        },
        async settle() {
            for (let i = 0; i < 30; i++) await raf();
        },
        async frames(count, hook) {
            let i = 0;
            stamps.length = 0;
            loop = hook ? () => hook(i++) : null;
            while (stamps.length < count) await raf();
            loop = null;
            return stamps.slice(0, count);
        },
        moveCamera(i) {
            k0 ??= graph.getZoomLevel();
            const w = 1200,
                h = 900;
            const dx = 100 * Math.sin(i / 20);
            graph.setViewTransform({ k: k0, x: w / 2 - (k0 * w) / 2 + dx, y: h / 2 - (k0 * h) / 2 });
        },
        hoverTargets(k) {
            const p = graph.getPointPositionsArray();
            const r = mulberry32(11);
            const out = [];
            for (let tries = 0; out.length < k && tries < 100000; tries++) {
                const i = Math.floor(r() * G.n);
                const [x, y] = graph.spaceToScreenPosition([p[2 * i], p[2 * i + 1]]);
                if (x > 100 && x < 1100 && y > 100 && y < 800) out.push({ id: i, x, y });
            }
            return out;
        },
        async layoutFps(count, capMs) {
            graph.start(1);
            const t = now();
            stamps.length = 0;
            while (stamps.length < count + 1 && now() - t < capMs) await raf();
            const st = stamps.slice();
            return { ...stats(intervals(st)), frames: st.length - 1, running: graph.isSimulationRunning };
        },
        async layoutSteps() {
            running = false; // stop our loop so nothing else touches the GPU
            await raf();
            await raf();
            graph.pause();
            const rb = [],
                single = [],
                batched = [];
            for (let i = 0; i < 5; i++) {
                const t = now();
                graph.getPointPositionsArray();
                rb.push(now() - t);
            }
            const rbMed = stats(rb).median;
            for (let i = 0; i < 10; i++) {
                const t = now();
                graph.step();
                graph.getPointPositionsArray();
                single.push(now() - t);
            }
            const N = 50;
            for (let rep = 0; rep < 3; rep++) {
                const t = now();
                for (let i = 0; i < N; i++) graph.step();
                graph.getPointPositionsArray();
                batched.push((now() - t - rbMed) / N);
            }
            running = true;
            requestAnimationFrame(tick);
            return {
                readbackMs: rbMed,
                stepPlusReadback: stats(single),
                perStepBatched50: stats(batched),
                backend: "WebGL2 fragment passes",
            };
        },
    };
    return a;
}

// ---------------------------------------------------------------- graphty-element
// One repack of every row and its upload, finished on the card, with the frame loop stopped.
// Opened only here so that no earlier stage pays for tables nothing draws from yet. By now the
// meshes are behind the lane, and a row drawn off its lane is held out of the repack until the
// funnel lands it back, so every node is updated once first; `rowsCopied` is how many rows each
// timed flush really changed, which is what says the repack did the work the time is for.
async function measureRepack(graph, eng) {
    if (!graph.openRowTable) return undefined;
    const table = graph.openRowTable();
    for (const node of graph.getNodes()) node.update();
    const gl = graph.engine?._gl;
    table.flush();
    const repack = [];
    const copied = [];
    const sent = table.uploadedBytes;
    for (let i = 0; i < 10; i++) {
        await eng.stepAsync(1);
        eng.publishPositions();
        const before = table.rowPosition.slice();
        const t = now();
        table.flush();
        gl?.finish();
        repack.push(now() - t);
        copied.push(changedRows(before, table.rowPosition, table.rows));
    }
    return {
        ...stats(repack),
        rows: table.rows,
        rowsCopied: Math.min(...copied),
        bytes: (table.uploadedBytes - sent) / 10,
    };
}

function changedRows(before, after, rows) {
    let changed = 0;
    for (let row = 0; row < rows; row++) {
        const i = row * 4;
        if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) changed++;
    }
    return changed;
}

// layoutBehavior.labels for the sampled and glyphs flags
function labelBehavior(sampled, glyphs) {
    const b = {};
    if (sampled) b.sampleCell = 96;
    if (glyphs) b.labelText = "glyphs";
    return b;
}

// the lean mode's boxes and capless edges, and the curves flag's curves
async function addShapeStyles(el, mode, curves) {
    if (mode === "lean") {
        await el.session.styles.add({
            name: "lean nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await el.session.styles.add({
            name: "lean edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        });
    }
    if (curves)
        await el.session.styles.add({
            name: "curves",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none", "edge.curvature": true },
        });
}

// The element ignores what it does not know, so without these checks a build that lacks an option
// would be measured on its default and recorded under the requested value.
function setRequestedOptions(el, { antialias, renderPath, renderer, limits }) {
    // antialias first, before any other property builds the engine, which reads it only then.
    if (antialias !== undefined) {
        if (!("antialias" in el))
            throw new Error(`antialias ${antialias} requested, but this build has no antialias option`);
        el.antialias = antialias;
    }
    if (renderPath) {
        if (!("renderPath" in el))
            throw new Error(`renderPath "${renderPath}" requested, but this build has no renderPath option`);
        el.renderPath = renderPath;
    }
    if (renderer) el.renderer = renderer;
    if (limits) {
        if (!("limits" in el)) throw new Error("limits requested, but this build has no limits option");
        el.limits = limits;
    }
}

async function graphtyAdapter({
    mode,
    accel,
    onDemand,
    dpr,
    labels,
    sampled,
    glyphs,
    curves,
    threeD,
    renderPath,
    renderer,
    antialias,
    limits,
}) {
    await import("@graphty/graphty-element");
    if (accel !== "off") await import("@graphty/graphty-element/webgpu");
    const el = document.createElement("graphty-element");
    el.style.cssText = "display:block;width:1200px;height:900px";
    setRequestedOptions(el, { antialias, renderPath, renderer, limits });
    el.layout = "fixed";
    // A pulled line is drawn only in 3D, so the curves and 3d flags keep 3D whatever the mode. The
    // camera moves below follow the same choice: a 2D pan does nothing to the 3D orbit camera.
    const is2d = mode === "lean" && !curves && !threeD;
    el.viewMode = is2d ? "2d" : "3d";
    el.acceleration = accel === "off" ? "off" : "auto";
    if (onDemand) el.renderOnDemand = true;
    if (dpr !== 1) el.setAttribute("pixel-ratio", "device");
    const errors = [];
    el.addEventListener("error", (e) => errors.push(String(e.detail?.error?.message ?? e.detail?.error ?? e.detail)));
    el.addEventListener("data-loading-error", (e) => errors.push(String(e.detail?.error?.message ?? e.detail?.error)));
    el.addEventListener("graphty-node-hover", (e) => hoverHit({ id: e.detail?.node ?? e.detail?.id ?? null }));
    host.append(el);
    const tCreate = now();
    while (!el.graph?.scene) await raf();
    await el.graph.waitForStableFrame?.({ timeoutMs: STABLE_MS }).catch(() => {});
    const readyMs = now() - tCreate;
    const graph = el.graph;
    const gl = graph.engine?._gl ?? null;
    let onFrame = null;
    await addShapeStyles(el, mode, curves);
    if (labels && (sampled || glyphs)) el.layoutBehavior = { labels: labelBehavior(sampled, glyphs) };
    if (labels)
        await el.session.styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.label": { by: "data.id", scale: "passthrough" } },
        });
    graph.scene.onAfterRenderObservable.add(() => {
        if (SYNC && gl) finish(gl);
        stamps.push(now());
        if (onFrame) onFrame();
    });
    let cam0 = null,
        cam0Before = null;
    let moved = null;
    const a = {
        el,
        describe: () => ({
            lib: "graphty",
            mode,
            accel,
            engineReadyMs: Math.round(readyMs),
            renderer: el.rendererStatus,
            acceleration: el.session.capabilities.acceleration,
        }),
        async load() {
            const nodes = new Array(G.n);
            for (let i = 0; i < G.n; i++) nodes[i] = { id: i, position: { x: G.xy[2 * i], y: G.xy[2 * i + 1], z: 0 } };
            const edges = new Array(G.m);
            for (let e = 0; e < G.m; e++) edges[e] = { src: G.src[e], dst: G.dst[e] };
            let tLoaded = null,
                tStable = null,
                tFirst = null;
            el.addEventListener(
                "data-loaded",
                () => {
                    tLoaded ??= now();
                },
                { once: true },
            );
            const t0 = now();
            try {
                el.nodeData = nodes;
                el.edgeData = edges;
            } catch (e) {
                return { error: String(e?.code ?? "") + " " + String(e?.message ?? e) };
            }
            const tHanded = now();
            onFrame = () => {
                if (tFirst === null && graph.getNodeCount() >= G.n && graph.getEdgeCount() >= G.m) {
                    gl?.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
                    tFirst = now();
                }
            };
            const deadline = now() + STABLE_MS;
            while (tFirst === null && errors.length === 0 && now() < deadline) await sleep(20); // NOSONAR(S2189): an event handler sets tFirst and errors during the await
            onFrame = null;
            if (tFirst === null)
                return {
                    error: errors.join(" | ") || "timeout",
                    nodeCount: graph.getNodeCount(),
                    edgeCount: graph.getEdgeCount(),
                };
            let stableError = null;
            await graph.waitForStableFrame({ timeoutMs: STABLE_MS }).catch((e) => {
                stableError = String(e?.message ?? e).slice(0, 300);
            });
            tStable = now();
            return {
                handoverMs: +(tHanded - t0).toFixed(1),
                dataLoadedMs: tLoaded === null ? null : +(tLoaded - t0).toFixed(1),
                firstFrameMs: +(tFirst - t0).toFixed(1),
                readyMs: +(tStable - t0).toFixed(1),
                nodeCount: graph.getNodeCount(),
                edgeCount: graph.getEdgeCount(),
                errors,
                stableError,
            };
        },
        async settle() {
            await graph.waitForStableFrame({ timeoutMs: STABLE_MS }).catch(() => {});
            for (let i = 0; i < 10; i++) await raf();
        },
        async frames(count, hook) {
            let i = 0;
            stamps.length = 0;
            const t = now();
            while (stamps.length < count && now() - t < 120000) {
                if (hook) hook(i++);
                await raf();
            }
            return stamps.slice(0, count);
        },
        async gpuFrame(count) {
            const ext = gl?.getExtension("EXT_disjoint_timer_query_webgl2");
            if (!ext) return null;
            const queries = [];
            const scene = graph.scene;
            const begin = scene.onBeforeRenderObservable.add(() => {
                const q = gl.createQuery();
                gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
                queries.push(q);
            });
            // First, so the query ends before the stamp's readPixels.
            const end = scene.onAfterRenderObservable.add(() => gl.endQuery(ext.TIME_ELAPSED_EXT), undefined, true);
            await a.frames(count, null);
            scene.onBeforeRenderObservable.remove(begin);
            scene.onAfterRenderObservable.remove(end);
            const t = now();
            while (!queries.every((q) => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) && now() - t < 10000)
                await raf();
            const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
            const ms = queries.map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            for (const q of queries) gl.deleteQuery(q);
            return { ...stats(ms), disjoint };
        },
        moveNode(i) {
            moved ??= graph.getNode(0) ?? null;
            if (moved) {
                // A build from before `drawnPosition` (the reference run) moves its mesh instead.
                const p = moved.drawnPosition ?? moved.mesh.position;
                moved.setMeshPosition(p.x + 0.05 * Math.sin(i / 5 + 1), p.y, p.z);
            }
        },
        moveCamera(i) {
            if (!cam0) {
                cam0 = graph.getCameraState();
                cam0Before = JSON.stringify(cam0);
            }
            if (is2d) {
                const p = cam0.pan ?? { x: 0, y: 0 };
                graph.setCameraState({ pan: { x: p.x + 0.05 * 4 * Math.sqrt(G.n) * Math.sin(i / 20), y: p.y } });
            } else {
                const P = cam0.position,
                    T = cam0.target ?? { x: 0, y: 0, z: 0 };
                const dx = P.x - T.x,
                    dy = P.y - T.y,
                    dz = P.z - T.z;
                const r = Math.hypot(dx, dy, dz);
                cam0.alpha ??= Math.atan2(dz, dx);
                cam0.beta ??= Math.acos(dy / r);
                cam0.radius ??= r;
                graph.setCameraState({
                    alpha: cam0.alpha + i * 0.01,
                    beta: cam0.beta,
                    radius: cam0.radius,
                    target: T,
                });
            }
        },
        async resetCamera() {
            // A camera move the view ignores would time a still view as a moving one.
            if (cam0 && JSON.stringify(graph.getCameraState()) === cam0Before)
                throw new Error("the camera did not move during the moving stage");
            if (cam0)
                graph.setCameraState(
                    is2d
                        ? { pan: cam0.pan }
                        : { alpha: cam0.alpha, beta: cam0.beta, radius: cam0.radius, target: cam0.target },
                );
            for (let i = 0; i < 5; i++) await raf();
        },
        hoverTargets(k) {
            const r = mulberry32(11);
            const out = [];
            for (let tries = 0; out.length < k && tries < 100000; tries++) {
                const i = Math.floor(r() * G.n);
                const at = el.nodeScreenPosition(i);
                if (at?.visible && at.x > 100 && at.x < 1100 && at.y > 100 && at.y < 800)
                    out.push({ id: i, x: at.x, y: at.y, radius: at.radius });
            }
            return out;
        },
        async layoutFps(count, capMs) {
            await el.setLayout("ngraph");
            const t0 = now();
            // wait for the engine to exist
            while (!graph.getLayoutManager().layoutEngine && now() - t0 < 30000) await raf();
            const eng = graph.getLayoutManager().layoutEngine;
            const it0 = eng.iterationsDone ?? null;
            // Batches of positions that came back from the device and were published: what moved
            // the picture. Iterations count what was asked for, which rises with nothing landing.
            const landed0 = eng.landedBatchesPublished ?? null;
            stamps.length = 0;
            const t = now();
            while (stamps.length < count + 1 && now() - t < capMs) await raf();
            const st = stamps.slice();
            const it1 = eng.iterationsDone ?? null;
            const landed = landed0 === null ? null : eng.landedBatchesPublished - landed0;
            const wall = (st[st.length - 1] ?? now()) - (st[0] ?? t);
            return {
                ...(st.length > 2 ? stats(intervals(st)) : { n: st.length - 1 }),
                frames: st.length - 1,
                setupMs: +(t - t0).toFixed(0),
                engine: eng?.type,
                accelerated: eng?.isAccelerated ?? false,
                iterationsPerSec: it0 === null ? null : +((it1 - it0) / ((now() - t) / 1000)).toFixed(1),
                landedBatches: landed,
                // A GPU layout whose positions never came back did not move: its frames time a still
                // scene, so the row is refused rather than reported as a layout frame.
                refused: eng?.isAccelerated && landed === 0 ? "no layout batch landed" : undefined,
                wallMs: +wall.toFixed(0),
                acceleration: el.session.capabilities.acceleration,
            };
        },
        async layoutSteps() {
            el.setRunning(false);
            for (let i = 0; i < 5; i++) await raf();
            const eng = graph.getLayoutManager().layoutEngine;
            const out = { engine: eng.type, accelerated: eng.isAccelerated ?? false };
            if (typeof eng.stepAsync === "function" && eng.isAccelerated) {
                const single = [],
                    b16 = [];
                await eng.stepAsync(1);
                for (let i = 0; i < 10; i++) {
                    const t = now();
                    await eng.stepAsync(1);
                    single.push(now() - t);
                }
                for (let i = 0; i < 5; i++) {
                    const t = now();
                    await eng.stepAsync(16);
                    b16.push((now() - t) / 16);
                }
                out.stepPlusReadback = stats(single);
                out.perStepBatched16 = stats(b16);
                const publish = [];
                for (let i = 0; i < 10; i++) {
                    const t = now();
                    eng.publishPositions();
                    publish.push(now() - t);
                }
                out.publish = stats(publish);
                // Nothing runs after this stage, so the frame loop can stop for good: what is left of
                // the step is the simulation and its readback, without the frames sharing the card.
                graph.scene.getEngine().stopRenderLoop();
                const undrawn = [];
                for (let i = 0; i < 10; i++) {
                    const t = now();
                    await eng.stepAsync(1);
                    undrawn.push(now() - t);
                }
                out.stepUndrawn = stats(undrawn);
                out.repackUpload = await measureRepack(graph, eng);
            } else {
                const single = [];
                const budget = now() + 20000;
                for (let i = 0; i < 10 && now() < budget; i++) {
                    const t = now();
                    eng.step();
                    single.push(now() - t);
                }
                out.stepCpu = stats(single);
            }
            return out;
        },
    };
    return a;
}

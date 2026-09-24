/**
 * Standalone browser demo of the exact-tier GPU layouts (ForceAtlas2 of P3, Fruchterman-Reingold and the
 * spring-electrical preset of P5) and GPU PageRank (P7): a canvas 2D renderer over
 * the simulation's own stride-3 position array, stepped once per animation frame exactly the way graphty-element's
 * frame loop will (fire-and-forget step(), at most maxInFlight batches in flight), with drag / pin through
 * setPosition / setFixed; a "Run PageRank" button runs the device PageRank over the same resident snapshot, checks
 * the f32 scores against the test suite's f64 oracle, and colours and sizes the nodes by score.
 * Served by `pnpm run dev:webgpu-graph-algorithms` (started through servherd, which sets PORT); not part of the package build, the tests or the lint set.
 */

import { installRemoteLog } from "./remote-log.js";
import { fromEdgeArrays, type GraphSnapshot, makeMask, maskSet, maskTest, type U32 } from "@graphty/graph-format";

import { pageRankOracle } from "../test/oracle/pagerank.js";
import { pageRank } from "../src/algorithms/pagerank.js";
import { requestGpuContext } from "../src/browser/index.js";
import type { GpuContext } from "../src/context.js";
import { createForceAtlas2 } from "../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../src/layouts/spring-electrical.js";
import type { GpuLayoutSimulation, GpuLayoutTuning, LayoutStatsBase } from "../src/types/layout.js";
import type { ForceAtlas2Options, FruchtermanReingoldOptions, SpringElectricalOptions } from "../src/types/options.js";

// ------------------------------------------------------------------ graphs

interface Edges {
    readonly nodeCount: number;
    readonly src: U32;
    readonly dst: U32;
}

function lcg(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function randomGraph(n: number, m: number, seed: number): Edges {
    const rnd = lcg(seed);
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        let a = Math.floor(rnd() * n);
        let b = Math.floor(rnd() * n);
        if (a === b) {
            b = (b + 1) % n;
        }
        src[e] = a;
        dst[e] = b;
    }
    return { nodeCount: n, src, dst };
}

function clusteredGraph(clusters: number, perCluster: number, inEdges: number, outEdges: number, seed: number): Edges {
    const rnd = lcg(seed);
    const n = clusters * perCluster;
    const src: number[] = [];
    const dst: number[] = [];
    for (let c = 0; c < clusters; c++) {
        for (let e = 0; e < inEdges; e++) {
            const a = c * perCluster + Math.floor(rnd() * perCluster);
            let b = c * perCluster + Math.floor(rnd() * perCluster);
            if (a === b) {
                b = c * perCluster + ((b - c * perCluster + 1) % perCluster);
            }
            src.push(a);
            dst.push(b);
        }
    }
    for (let e = 0; e < outEdges; e++) {
        src.push(Math.floor(rnd() * n));
        dst.push(Math.floor(rnd() * n));
    }
    return { nodeCount: n, src: Uint32Array.from(src), dst: Uint32Array.from(dst) };
}

function gridGraph(w: number, h: number): Edges {
    const src: number[] = [];
    const dst: number[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (x + 1 < w) {
                src.push(i);
                dst.push(i + 1);
            }
            if (y + 1 < h) {
                src.push(i);
                dst.push(i + w);
            }
        }
    }
    return { nodeCount: w * h, src: Uint32Array.from(src), dst: Uint32Array.from(dst) };
}

function rmatGraph(scale: number, edgeFactor: number, seed: number): Edges {
    const rnd = lcg(seed);
    const n = 1 << scale;
    const m = n * edgeFactor;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const [a, b, c] = [0.57, 0.19, 0.19];
    for (let e = 0; e < m; e++) {
        let u = 0;
        let v = 0;
        for (let bit = 0; bit < scale; bit++) {
            const r = rnd();
            if (r < a) {
                // top-left quadrant
            } else if (r < a + b) {
                v |= 1 << bit;
            } else if (r < a + b + c) {
                u |= 1 << bit;
            } else {
                u |= 1 << bit;
                v |= 1 << bit;
            }
        }
        if (u === v) {
            v = (v + 1) % n;
        }
        src[e] = u;
        dst[e] = v;
    }
    return { nodeCount: n, src, dst };
}

const KARATE: readonly (readonly [number, number])[] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [0, 8],
    [0, 10],
    [0, 11],
    [0, 12],
    [0, 13],
    [0, 17],
    [0, 19],
    [0, 21],
    [0, 31],
    [1, 2],
    [1, 3],
    [1, 7],
    [1, 13],
    [1, 17],
    [1, 19],
    [1, 21],
    [1, 30],
    [2, 3],
    [2, 7],
    [2, 8],
    [2, 9],
    [2, 13],
    [2, 27],
    [2, 28],
    [2, 32],
    [3, 7],
    [3, 12],
    [3, 13],
    [4, 6],
    [4, 10],
    [5, 6],
    [5, 10],
    [5, 16],
    [6, 16],
    [8, 30],
    [8, 32],
    [8, 33],
    [9, 33],
    [13, 33],
    [14, 32],
    [14, 33],
    [15, 32],
    [15, 33],
    [18, 32],
    [18, 33],
    [19, 33],
    [20, 32],
    [20, 33],
    [22, 32],
    [22, 33],
    [23, 25],
    [23, 27],
    [23, 29],
    [23, 32],
    [23, 33],
    [24, 25],
    [24, 27],
    [24, 31],
    [25, 31],
    [26, 29],
    [26, 33],
    [27, 33],
    [28, 31],
    [28, 33],
    [29, 32],
    [29, 33],
    [30, 32],
    [30, 33],
    [31, 32],
    [31, 33],
    [32, 33],
];

function karateGraph(): Edges {
    return {
        nodeCount: 34,
        src: Uint32Array.from(KARATE.map((e) => e[0])),
        dst: Uint32Array.from(KARATE.map((e) => e[1])),
    };
}

/**
 * A SNAP edge list (https://snap.stanford.edu/data/): `#` comment lines, then one whitespace-separated pair of node
 * ids per line. Ids are renumbered densely, self-loops dropped and each unordered pair kept once. The files are
 * gzipped under tmp/datasets/ (gitignored; the download commands are in the README of the demo) and served by
 * vite's /@fs/ route, which serves a `.gz` file with `Content-Encoding: gzip`, so fetch() hands back the inflated
 * text.
 */
const DATASETS: Readonly<Record<string, string>> = {
    brightkite: "loc-brightkite_edges.txt.gz",
    gnutella: "p2p-Gnutella31.txt.gz",
    enron: "email-Enron.txt.gz",
    condmat: "ca-CondMat.txt.gz",
};

async function loadSnapEdges(file: string): Promise<Edges> {
    const url = new URL(`../tmp/datasets/${file}`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok || response.body === null) {
        throw new Error(`${file}: HTTP ${response.status}`);
    }
    const text = await response.text();
    const ids = new Map<number, number>();
    const seen = new Set<number>();
    const src: number[] = [];
    const dst: number[] = [];
    const renumber = (id: number): number => {
        let index = ids.get(id);
        if (index === undefined) {
            index = ids.size;
            ids.set(id, index);
        }
        return index;
    };
    for (const line of text.split("\n")) {
        if (line.length === 0 || line.startsWith("#")) {
            continue;
        }
        const tab = line.search(/\s/);
        const a = renumber(Number(line.slice(0, tab)));
        const b = renumber(Number(line.slice(tab + 1)));
        if (a === b) {
            continue;
        }
        const key = a < b ? a * 4_294_967_296 + b : b * 4_294_967_296 + a;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        src.push(a);
        dst.push(b);
    }
    return { nodeCount: ids.size, src: Uint32Array.from(src), dst: Uint32Array.from(dst) };
}

async function buildEdges(kind: string, seed: number): Promise<Edges> {
    const dataset = DATASETS[kind];
    if (dataset !== undefined) {
        setStatus(`loading ${dataset}...`);
        return loadSnapEdges(dataset);
    }
    switch (kind) {
        case "karate":
            return karateGraph();
        case "grid":
            return gridGraph(30, 30);
        case "clusters":
            return clusteredGraph(15, 100, 560, 600, seed);
        case "random10k":
            return randomGraph(10_000, 30_000, seed);
        case "rmat":
            return rmatGraph(14, 8, seed);
        case "random30k":
            return randomGraph(30_000, 90_000, seed);
        default:
            return randomGraph(2_000, 6_000, seed);
    }
}

// ------------------------------------------------------------------ dom

function el<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (node === null) {
        throw new Error(`missing #${id}`);
    }
    return node as T;
}

const canvas = el<HTMLCanvasElement>("canvas");
const graphSelect = el<HTMLSelectElement>("graph");
const modelSelect = el<HTMLSelectElement>("model");
const compatSelect = el<HTMLSelectElement>("compat");
const ipsInput = el<HTMLInputElement>("ips");
const linlogInput = el<HTMLInputElement>("linlog");
const strongInput = el<HTMLInputElement>("strong");
const adaptiveInput = el<HTMLInputElement>("adaptive");
const edgesInput = el<HTMLInputElement>("edges");
const playButton = el<HTMLButtonElement>("play");
const restartButton = el<HTMLButtonElement>("restart");
const unpinButton = el<HTMLButtonElement>("unpin");
const zoomInButton = el<HTMLButtonElement>("zoomin");
const zoomOutButton = el<HTMLButtonElement>("zoomout");
const colourSelect = el<HTMLSelectElement>("colour");
const pagerankButton = el<HTMLButtonElement>("pagerank");
const prStatsBox = el<HTMLDivElement>("prstats");
const statusBox = el<HTMLDivElement>("status");
const statsBox = el<HTMLDivElement>("stats");

function setStatus(text: string, error = false): void {
    statusBox.textContent = text;
    statusBox.className = error ? "error" : "";
    if (error) {
        console.error(`status: ${text}`);
    } else {
        console.log(`status: ${text}`);
    }
}

// ------------------------------------------------------------------ state

interface Demo {
    readonly snapshot: GraphSnapshot;
    readonly edges: Edges;
    readonly sim: GpuLayoutSimulation<unknown, LayoutStatsBase>;
    readonly positions: Float32Array;
    readonly degree: Uint32Array;
    readonly fixed: U32;
    /** The last PageRank scores over this snapshot, or null before the first run. */
    scores: Float32Array | null;
    running: boolean;
    pending: Promise<void> | null;
    frames: number;
    lastFrameMs: number;
}

let ctx: GpuContext | null = null;
let demo: Demo | null = null;
let createGeneration = 0;
let seed = 1;
const view = { scale: 1, cx: 0, cy: 0, fitted: false, zoom: 1 };
const drag = { index: -1, wasFixed: false, moved: false };

function degreesOf(edges: Edges): Uint32Array {
    const degree = new Uint32Array(edges.nodeCount);
    for (let e = 0; e < edges.src.length; e++) {
        degree[edges.src[e]]++;
        degree[edges.dst[e]]++;
    }
    return degree;
}

async function createDemo(): Promise<void> {
    if (ctx === null) {
        return;
    }
    if (demo !== null) {
        demo.running = false;
        demo.sim.dispose();
        ctx.release(demo.snapshot);
        demo = null;
    }
    const kind = graphSelect.value;
    const generation = ++createGeneration;
    let edges: Edges;
    try {
        edges = await buildEdges(kind, seed);
    } catch (error) {
        setStatus(`${kind}: ${error instanceof Error ? error.message : String(error)}`, true);
        return;
    }
    if (generation !== createGeneration) {
        return; // a newer createDemo() superseded this one while the dataset was loading
    }
    const snapshot = fromEdgeArrays({ directed: false, nodeCount: edges.nodeCount, src: edges.src, dst: edges.dst });
    const n = snapshot.nodeCount;
    const positions = new Float32Array(3 * n).fill(Number.NaN); // NaN rows are seeded by the simulation's LCG
    const tuning: GpuLayoutTuning = {
        repulsion: "exact",
        exactMaxNodes: 65_536,
        compat: compatSelect.value === "networkx" ? "networkx" : "paper",
    };
    const shared = {
        seed,
        settleThreshold: 1e-3,
        settleWindow: 20,
        iterationsPerStep: Math.max(1, Math.min(64, Number(ipsInput.value) || 1)),
        maxInFlight: 2,
        ...tuning,
    };
    const model = modelSelect.value;
    let sim: GpuLayoutSimulation<unknown, LayoutStatsBase>;
    if (model === "fr") {
        // linear cooling spends its whole budget, so it gets a long one; adaptive cooling settles on its own
        const options: FruchtermanReingoldOptions = adaptiveInput.checked
            ? { ...shared, cooling: "adaptive" }
            : { ...shared, iterations: 2_000 };
        sim = createFruchtermanReingold(ctx, options);
    } else if (model === "se") {
        const options: SpringElectricalOptions = { ...shared };
        sim = createSpringElectrical(ctx, options);
    } else {
        const options: ForceAtlas2Options = {
            ...shared,
            maxIter: 100_000,
            linlog: linlogInput.checked,
            strongGravity: strongInput.checked,
        };
        sim = createForceAtlas2(ctx, options);
    }
    sim.load(snapshot, positions);
    demo = {
        snapshot,
        edges,
        sim,
        positions,
        degree: degreesOf(edges),
        fixed: makeMask(n),
        scores: null,
        running: true,
        pending: null,
        frames: 0,
        lastFrameMs: 0,
    };
    view.fitted = false;
    view.zoom = 1;
    prStatsBox.textContent = "";
    colourSelect.value = "degree";
    playButton.textContent = "Pause";
    setStatus(
        `${kind} / ${model}: ${n.toLocaleString()} nodes, ${edges.src.length.toLocaleString()} edges; ${ctx.caps.vendor} / ${ctx.caps.architecture}${ctx.caps.software ? " (software adapter)" : ""}`,
    );
    console.log(
        `caps: features=${[...ctx.caps.features].join(",")} wgsl=${[...ctx.caps.wgslFeatures].join(",")} subgroups=${ctx.caps.subgroupMinSize}-${ctx.caps.subgroupMaxSize} maxComputeInvocationsPerWorkgroup=${ctx.caps.limits.maxComputeInvocationsPerWorkgroup} maxStorageBuffersPerShaderStage=${ctx.caps.limits.maxStorageBuffersPerShaderStage}`,
    );
}

// ------------------------------------------------------------------ rendering

function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
}

function fitView(d: Demo): void {
    // Frame the CORE of the layout, not its bounding box: with the FA2 laws an isolated node sits far outside
    // the core (spec 7.7), so a bbox fit would shrink everything else to a blob. The stats carry the centroid and
    // the RMS radius of the last landed batch; 2.6 RMS radii hold the bulk of any of the demo graphs.
    const s = d.sim.stats;
    let cx = s.centroid[0];
    let cy = s.centroid[1];
    let half = 2.6 * s.rmsRadius;
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !(half > 0)) {
        // Before the first batch lands: the seeded positions in [-1, 1).
        cx = 0;
        cy = 0;
        half = 1;
    }
    const margin = 0.92;
    const target = ((Math.min(canvas.width, canvas.height) * margin) / (2 * half)) * view.zoom;
    if (!view.fitted) {
        view.scale = target;
        view.cx = cx;
        view.cy = cy;
        view.fitted = true;
    } else {
        // Smooth the framing so the picture does not jitter while the layout expands.
        view.scale += (target - view.scale) * 0.08;
        view.cx += (cx - view.cx) * 0.08;
        view.cy += (cy - view.cy) * 0.08;
    }
}

function toScreen(x: number, y: number): [number, number] {
    return [canvas.width / 2 + (x - view.cx) * view.scale, canvas.height / 2 + (y - view.cy) * view.scale];
}

function toLayout(sx: number, sy: number): [number, number] {
    return [(sx - canvas.width / 2) / view.scale + view.cx, (sy - canvas.height / 2) / view.scale + view.cy];
}

function draw(d: Demo): void {
    resize();
    fitView(d);
    const g = canvas.getContext("2d");
    if (g === null) {
        return;
    }
    const n = d.snapshot.nodeCount;
    const p = d.positions;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const drawEdges = edgesInput.checked && d.edges.src.length <= 200_000;
    if (drawEdges) {
        g.strokeStyle = "rgba(150, 170, 200, 0.28)";
        g.lineWidth = 1;
        g.beginPath();
        for (let e = 0; e < d.edges.src.length; e++) {
            const a = d.edges.src[e];
            const b = d.edges.dst[e];
            const [ax, ay] = toScreen(p[3 * a], p[3 * a + 1]);
            const [bx, by] = toScreen(p[3 * b], p[3 * b + 1]);
            g.moveTo(ax, ay);
            g.lineTo(bx, by);
        }
        g.stroke();
    }
    const radius = n <= 100 ? 6 : n <= 2_000 ? 3.5 : n <= 12_000 ? 2.2 : 1.4;
    const byScore = colourSelect.value === "pagerank" && d.scores !== null ? d.scores : null;
    // t in [0, 1]: log-scaled degree, or log-scaled PageRank score between the graph's min and max.
    let lo = 0;
    let hi = 1;
    if (byScore !== null) {
        lo = Number.POSITIVE_INFINITY;
        hi = 0;
        for (let i = 0; i < n; i++) {
            if (byScore[i] < lo) lo = byScore[i];
            if (byScore[i] > hi) hi = byScore[i];
        }
        lo = Math.log(Math.max(lo, 1e-12));
        hi = Math.max(Math.log(Math.max(hi, 1e-12)), lo + 1e-9);
    } else {
        for (let i = 0; i < n; i++) {
            if (d.degree[i] > hi) hi = d.degree[i];
        }
        hi = Math.log1p(hi);
    }
    for (let i = 0; i < n; i++) {
        const [x, y] = toScreen(p[3 * i], p[3 * i + 1]);
        const t =
            byScore !== null ? (Math.log(Math.max(byScore[i], 1e-12)) - lo) / (hi - lo) : Math.log1p(d.degree[i]) / hi;
        const hue = 210 - 170 * t;
        const pinned = maskTest(d.fixed, i);
        const r = byScore !== null ? radius * (0.6 + 1.8 * t) : radius;
        g.fillStyle = pinned ? "#ffd166" : `hsl(${hue.toFixed(0)} 85% ${(55 + 15 * t).toFixed(0)}%)`;
        g.beginPath();
        g.arc(x, y, pinned ? r * 1.8 : r, 0, Math.PI * 2);
        g.fill();
    }
}

// ------------------------------------------------------------------ PageRank

const PAGERANK = { dampingFactor: 0.85, maxIterations: 100, tolerance: 1e-6 } as const;

async function runPageRank(): Promise<void> {
    const d = demo;
    if (ctx === null || d === null) {
        return;
    }
    pagerankButton.disabled = true;
    prStatsBox.textContent = "running on the GPU...";
    try {
        const t0 = performance.now();
        const gpu = await pageRank(ctx, d.snapshot, PAGERANK);
        const gpuMs = performance.now() - t0;
        if (d !== demo) {
            return; // the graph changed while the run was in flight
        }
        const t1 = performance.now();
        const ref = pageRankOracle(d.snapshot, { alpha: PAGERANK.dampingFactor, ...PAGERANK, weighted: true });
        const cpuMs = performance.now() - t1;
        const n = d.snapshot.nodeCount;
        let maxAbs = 0;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(gpu.scores[i] - ref.scores[i]));
            sum += gpu.scores[i];
        }
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => gpu.scores[b] - gpu.scores[a]);
        const top = order.slice(0, 10).map((i, rank) => {
            const s = gpu.scores[i];
            return `${String(rank + 1).padStart(2)}  node ${String(i).padEnd(6)} ${s.toExponential(3)}  deg ${d.degree[i]}`;
        });
        d.scores = gpu.scores;
        colourSelect.value = "pagerank";
        prStatsBox.textContent = [
            `GPU ms        ${gpuMs.toFixed(1)}  (${ctx.caps.vendor})`,
            `iterations    ${gpu.iterations}  converged ${gpu.converged}`,
            `dangling mass ${gpu.danglingMass.toExponential(2)}`,
            `sum of scores ${sum.toFixed(6)}`,
            `CPU f64 ms    ${cpuMs.toFixed(1)}  (${ref.iterations} iterations)`,
            `max |gpu-f64| ${maxAbs.toExponential(2)}`,
            "",
            "top 10 by score",
            ...top,
        ].join("\n");
        setStatus(
            `PageRank: ${gpu.iterations} iterations in ${gpuMs.toFixed(1)} ms on the GPU; max error vs f64 ${maxAbs.toExponential(2)}`,
        );
    } catch (error) {
        prStatsBox.textContent = "";
        setStatus(`PageRank failed: ${error instanceof Error ? error.message : String(error)}`, true);
    } finally {
        pagerankButton.disabled = false;
    }
}

function renderStats(d: Demo): void {
    const s = d.sim.stats;
    const lines = [
        `iterations   ${d.sim.iterationsDone}`,
        `settled      ${d.sim.settled}`,
        `in flight    ${d.sim.inFlight}`,
        `ms / iter    ${s.msPerIteration === null ? "-" : s.msPerIteration.toFixed(3)}`,
        `frame ms     ${d.lastFrameMs.toFixed(1)}`,
    ];
    // The model-specific fields: FA2's controller, FR's temperature, the spring preset's kinetic energy.
    for (const [key, value] of Object.entries(s)) {
        if (typeof value === "number" && !(key in LAYOUT_STATS_BASE)) {
            lines.push(
                `${key.padEnd(12)} ${Math.abs(value) >= 1e3 || (Math.abs(value) < 1e-2 && value !== 0) ? value.toExponential(2) : value.toFixed(3)}`,
            );
        }
    }
    lines.push(
        `mean disp    ${s.meanDisplacement.toExponential(2)}`,
        `rms radius   ${s.rmsRadius.toFixed(2)}`,
        `tier         ${s.repulsionTier}`,
    );
    statsBox.textContent = lines.join("\n");
}

/** The LayoutStatsBase keys, so renderStats can print whatever a model adds without naming the models. */
const LAYOUT_STATS_BASE: Record<keyof LayoutStatsBase, true> = {
    iteration: true,
    meanDisplacement: true,
    rmsRadius: true,
    layoutRadius: true,
    centroid: true,
    repulsionTier: true,
    maxCellOccupancy: true,
    outsideGrid: true,
    msPerIteration: true,
};

// ------------------------------------------------------------------ frame loop (the element bridge, D6)

let lastPromise: Promise<void> | null = null;

function frame(now: number): void {
    const d = demo;
    if (d !== null) {
        if (d.running && !d.sim.settled) {
            const promise = d.sim.step();
            if (promise !== lastPromise) {
                lastPromise = promise;
                promise.catch((error: unknown) => {
                    d.running = false;
                    setStatus(`step failed: ${error instanceof Error ? error.message : String(error)}`, true);
                });
            }
        } else if (d.running && d.sim.settled) {
            d.running = false;
            playButton.textContent = "Play";
            setStatus(`settled after ${d.sim.iterationsDone} iterations`);
        }
        draw(d);
        if ((d.frames & 7) === 0) {
            renderStats(d);
        }
        d.frames++;
        d.lastFrameMs = performance.now() - now;
    }
    requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ interaction

function nearestNode(sx: number, sy: number): number {
    const d = demo;
    if (d === null) {
        return -1;
    }
    const [lx, ly] = toLayout(sx, sy);
    const reach = 12 / view.scale;
    let best = -1;
    let bestDist = reach * reach;
    const p = d.positions;
    for (let i = 0; i < d.snapshot.nodeCount; i++) {
        const dx = p[3 * i] - lx;
        const dy = p[3 * i + 1] - ly;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    }
    return best;
}

function canvasPoint(event: PointerEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return [(event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr];
}

canvas.addEventListener("pointerdown", (event) => {
    const d = demo;
    if (d === null) {
        return;
    }
    const [sx, sy] = canvasPoint(event);
    const i = nearestNode(sx, sy);
    if (i < 0) {
        return;
    }
    drag.index = i;
    drag.wasFixed = maskTest(d.fixed, i);
    drag.moved = false;
    maskSet(d.fixed, i, true);
    d.sim.setFixed(d.fixed);
    canvas.classList.add("dragging");
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
    const d = demo;
    if (d === null || drag.index < 0) {
        return;
    }
    const [sx, sy] = canvasPoint(event);
    const [lx, ly] = toLayout(sx, sy);
    drag.moved = true;
    d.sim.setPosition(drag.index, lx, ly, 0);
    if (!d.running) {
        d.running = true;
        playButton.textContent = "Pause";
    }
});

canvas.addEventListener("pointerup", (event) => {
    const d = demo;
    if (d === null || drag.index < 0) {
        return;
    }
    if (!drag.moved && drag.wasFixed) {
        // A click on a pinned node releases it (an unpin reheats, spec 7.12).
        maskSet(d.fixed, drag.index, false);
        d.sim.setFixed(d.fixed);
        if (!d.running) {
            d.running = true;
            playButton.textContent = "Pause";
        }
    }
    drag.index = -1;
    canvas.classList.remove("dragging");
    canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener(
    "wheel",
    (event) => {
        event.preventDefault();
        view.zoom = Math.min(20, Math.max(0.2, view.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    },
    { passive: false },
);

playButton.addEventListener("click", () => {
    const d = demo;
    if (d === null) {
        return;
    }
    if (d.running) {
        d.running = false;
        playButton.textContent = "Play";
    } else {
        if (d.sim.settled) {
            d.sim.reheat();
        }
        d.running = true;
        playButton.textContent = "Pause";
    }
});

restartButton.addEventListener("click", () => {
    seed = (seed % 1_000_000) + 1;
    void createDemo();
});

unpinButton.addEventListener("click", () => {
    const d = demo;
    if (d === null) {
        return;
    }
    d.fixed.fill(0);
    d.sim.setFixed(d.fixed);
});

zoomInButton.addEventListener("click", () => {
    view.zoom = Math.min(20, view.zoom * 1.25);
});
zoomOutButton.addEventListener("click", () => {
    view.zoom = Math.max(0.2, view.zoom / 1.25);
});

pagerankButton.addEventListener("click", () => {
    void runPageRank();
});

for (const input of [graphSelect, modelSelect, compatSelect, linlogInput, strongInput, adaptiveInput]) {
    input.addEventListener("change", () => {
        void createDemo();
    });
}
ipsInput.addEventListener("change", () => {
    const d = demo;
    if (d !== null) {
        d.sim.setParams({ iterationsPerStep: Math.max(1, Math.min(64, Number(ipsInput.value) || 1)) });
    }
});

// ------------------------------------------------------------------ start

async function main(): Promise<void> {
    const session = installRemoteLog();
    console.log(`remote log session ${session}`);
    try {
        ctx = await requestGpuContext({ powerPreference: "high-performance" });
    } catch (error) {
        setStatus(
            `no WebGPU device: ${error instanceof Error ? error.message : String(error)} (Chrome / Edge 113+ with WebGPU enabled)`,
            true,
        );
        return;
    }
    ctx.lost.then((info) => {
        setStatus(`device lost: ${info.message}`, true);
        demo = null;
    });
    await createDemo();
    requestAnimationFrame(frame);
}

void main();

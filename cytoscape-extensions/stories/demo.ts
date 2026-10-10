/**
 * The demo every story renders: a real Cytoscape instance with the extensions registered, a seeded network from
 * @graphty/graph-samples, one layout or algorithm run on the chosen backend, and a status line saying what ran
 * where, why, and how long it took.
 *
 * The stories import the package source, so a change under src/ shows up here as soon as Vite reloads.
 */

import {
    barabasiAlbertGraph,
    erdosRenyiGnmGraph,
    gridGraph,
    plantedPartitionGraph,
    randomTreeGraph,
    type SampleGraph,
    wattsStrogatzGraph,
} from "@graphty/graph-samples/generators";
import cytoscape, {
    type Collection,
    type Core,
    type ElementDefinition,
    type NodeSingular,
    type StylesheetJson,
} from "cytoscape";

import graphtyCytoscape, { configureWebGpu } from "../src/index.js";
import { type Network, NETWORKS } from "./catalog.js";

cytoscape.use(graphtyCytoscape);

/**
 * True inside a visual-review capture (its URL carries chromatic=true, as Chromatic's does). Captures leave out run
 * times, which differ on every run.
 */
const CAPTURE = /[?&]chromatic=true/.test(globalThis.location?.search ?? "");

/** Node counts; "large" and "huge" are where the GPU is meant to pay off. */
export const SIZES = { small: 100, medium: 2_000, large: 10_000, huge: 50_000 };
type Size = keyof typeof SIZES;

/** The backend control: "auto" lets the extension decide, "cpu" passes gpu: "off", "gpu" passes gpu: "require". */
type BackendChoice = "auto" | "cpu" | "gpu";
const GPU_MODE = { auto: "auto", cpu: "off", gpu: "require" } as const;

interface NetworkArgs {
    network: Network;
    size: Size;
    seed: number;
}

export interface RunArgs extends NetworkArgs {
    backend: BackendChoice;
    /** Accept a software WebGPU adapter (SwiftShader, llvmpipe); refused by default as usually slower than the CPU. */
    acceptSoftware: boolean;
    /** Extra options as JSON, merged over the story's own. */
    options: string;
}

export const networkArgTypes = {
    network: { control: "select", options: NETWORKS },
    size: {
        control: {
            type: "select",
            labels: { small: "100 nodes", medium: "2,000 nodes", large: "10,000 nodes", huge: "50,000 nodes" },
        },
        options: Object.keys(SIZES),
    },
    seed: { control: { type: "number", min: 0, step: 1 } },
    backend: { control: "inline-radio", options: ["auto", "cpu", "gpu"] },
    acceptSoftware: { control: "boolean" },
    options: { control: "text" },
} as const;

export const networkArgs: RunArgs = {
    network: "barabasi-albert",
    size: "small",
    seed: 42,
    backend: "auto",
    acceptSoftware: false,
    options: "{}",
};

/** A seeded network of about `n` nodes, per generator. */
export const GENERATE: Record<Network, (n: number, seed: number) => SampleGraph> = {
    "barabasi-albert": (n, seed) => barabasiAlbertGraph({ n, m: 2, seed }),
    "planted-partition": (n, seed) => {
        const groups = Math.max(4, Math.round(Math.sqrt(n) / 5));
        const groupSize = Math.round(n / groups);
        // about 6 neighbours inside the group and 0.5 outside, whatever the size
        return plantedPartitionGraph({ groups, groupSize, pIn: 6 / groupSize, pOut: 0.5 / n, seed });
    },
    "erdos-renyi": (n, seed) => erdosRenyiGnmGraph({ n, m: 2 * n, seed }),
    "watts-strogatz": (n, seed) => wattsStrogatzGraph({ n, k: 4, beta: 0.1, seed }),
    grid: (n) => gridGraph({ rows: Math.round(Math.sqrt(n)), cols: Math.round(Math.sqrt(n)) }),
    "random-tree": (n, seed) => randomTreeGraph({ n, seed }),
};

/**
 * Cytoscape elements for a sample graph: node "n<i>", edge "e<i>", weight in data("w") when weighted, and the
 * generator's ground-truth group in data("community") when it has one (planted partition, SBM, LFR).
 * @param g - the graph
 * @returns the elements
 */
export function elementsOf(g: SampleGraph): ElementDefinition[] {
    const els: ElementDefinition[] = [];
    const col = g.nodeColumns?.community;
    const community = col === undefined || !ArrayBuffer.isView(col) ? undefined : (col as ArrayLike<number>);
    for (let i = 0; i < g.nodeCount; i++) {
        const data: Record<string, unknown> = { id: `n${i}` };
        if (community) {
            data.community = community[i];
        }
        els.push({ group: "nodes", data });
    }
    for (let e = 0; e < g.src.length; e++) {
        const data: Record<string, unknown> = { id: `e${e}`, source: `n${g.src[e]}`, target: `n${g.dst[e]}` };
        if (g.weights) {
            data.w = g.weights[e];
        }
        els.push({ group: "edges", data });
    }
    return els;
}

/**
 * Per core, a factor on node sizes and edge widths: below 1 when the main-component fit zoomed in past far-flung
 * outliers (so the main graph spreads out instead of its nodes growing), and on a large network so its nodes stay
 * apart (see newCore).
 */
const SCALE = new WeakMap<Core, { network: number; zoom: number; view: number }>();
const sized =
    (size: number, minPixels = 0) =>
    (ele: { cy(): Core }): number => {
        const s = SCALE.get(ele.cy());
        // never under minPixels on screen at the fitted zoom, so 50,000 nodes do not fade to nothing
        return s === undefined ? size : Math.max(size * s.network * s.zoom, minPixels / s.view);
    };

/** A node's size: 8 units, times its data("scale") when a story sizes nodes by a value (degree, population, ...). */
const nodeSize = (ele: { cy(): Core; data(key: string): unknown }): number => {
    const scale = ele.data("scale");
    return sized(8, 2)(ele) * (typeof scale === "number" ? scale : 1);
};

const STYLE = [
    {
        selector: "node",
        style: { width: nodeSize, height: nodeSize, "background-color": "#7a8aa6", "border-width": 0 },
    },
    { selector: "node[color]", style: { "background-color": "data(color)" } },
    { selector: "edge", style: { width: sized(0.5), "line-color": "#b8c0cc", "curve-style": "straight" } },
    { selector: "edge[color]", style: { "line-color": "data(color)", width: sized(2) } },
    // a directed graph's edges point from source to target (markDirected)
    // Cytoscape draws an arrow at least 29 units wide whatever the edge width: scaled to about half a node
    {
        selector: "edge.directed",
        style: { "target-arrow-shape": "triangle", "arrow-scale": 0.15, "target-arrow-color": "#9aa3b0" },
    },
];

/**
 * A large network's extra style: thin, faint edges, so tens of thousands of them read as a haze that shows where the
 * connections run without covering the nodes. Haystack edges draw fastest; a haystack radius of 0 joins the node
 * centers, where the default picks a random point inside each node and the picture would differ on every run.
 * @param edgeCount - the number of edges
 * @returns the style rules
 */
function largeStyle(edgeCount: number): StylesheetJson {
    // fainter as the edges grow: 0.12 up to 40,000 edges, 0.03 at 160,000
    const opacity = Math.min(0.12, (0.12 * 40_000) / Math.max(1, edgeCount));
    return [
        {
            selector: "edge",
            style: {
                "curve-style": "haystack",
                "haystack-radius": 0,
                "line-opacity": opacity,
                "line-color": "#6b7280",
            },
        },
    ];
}

/** A network with more nodes than this is drawn as a large one (newCore); the force stories go up to 50,000. */
const LARGE = 5_000;

/**
 * Draws the edges of a graph added after the core was made as the large style draws them, when there are more than
 * 5,000: faint and thin, so they read as a haze instead of covering the nodes.
 * @param cy - the core
 */
export function fadeManyEdges(cy: Core): void {
    const edges = cy.edges().length;
    if (edges > LARGE) {
        cy.style()
            .fromJson([...STYLE, ...largeStyle(edges)])
            .update();
    }
}

/**
 * Draws arrows on the edges of a directed graph.
 * @param cy - the core
 * @param directed - whether the graph is directed
 */
export function markDirected(cy: Core, directed: boolean): void {
    if (directed && cy.edges().length <= LARGE) {
        cy.edges().addClass("directed");
    }
}

let live: Core[] = [];

/**
 * A Cytoscape core in `container` with the demo's style; retireAll() destroys it.
 * @param container - the element to draw in
 * @param elements - the graph
 * @returns the core
 */
export function newCore(container: HTMLElement, elements: ElementDefinition[] = []): Core {
    const nodeCount = elements.filter((e) => e.group === "nodes").length;
    const big = nodeCount > LARGE;
    const cy = cytoscape({
        container,
        style: big ? [...STYLE, ...largeStyle(elements.length - nodeCount)] : STYLE,
        // Cytoscape's WebGL renderer (3.31 and later) draws tens of thousands of nodes at interactive frame rates;
        // edges are still hidden while the view moves
        ...(big ? { renderer: { name: "canvas", webgl: true } } : {}),
        hideEdgesOnViewport: big,
        textureOnViewport: big,
        elements,
        layout: { name: "preset" },
    });
    if (big) {
        // smaller nodes as the network grows (about 3.6 pixels at 10,000 nodes, 2 at 50,000), so they stay apart
        SCALE.set(cy, { network: Math.max(0.25, Math.sqrt(2_000 / nodeCount)), zoom: 1, view: 1 });
    }
    live.push(cy);
    // the container's size can change after the layout fitted the graph to it (the window or Storybook's panels
    // resize, the toolbar's full-screen button): fit it again, so the graph always fills the space it has
    let size = `${container.clientWidth}x${container.clientHeight}`;
    const watch = new ResizeObserver(() => {
        const now = `${container.clientWidth}x${container.clientHeight}`;
        if (now !== size) {
            size = now;
            fitToContainer(cy);
        }
    });
    watch.observe(container);
    cy.one("destroy", () => watch.disconnect());
    // for poking at from the browser console
    (window as unknown as { cy?: Core }).cy = cy;
    return cy;
}

/** The space left around the graph when it is fitted, in pixels: Cytoscape's default layout padding. */
const FIT_PADDING = 30;

/**
 * Fits the graph to the container's current size: cy.resize() reads the size, cy.fit() zooms and pans to it. The
 * view is fitted to the largest connected component when it holds most of the nodes, not to the farthest node: a
 * force layout pushes isolated nodes and small pieces far out (ForceAtlas2's gravity, Fruchterman-Reingold has none),
 * and fitted to them the main graph shrank to a few percent of the picture. They are still drawn, outside the view.
 * @param cy - the core
 * @returns how many nodes lie outside the view
 */
export function fitToContainer(cy: Core): number {
    cy.resize();
    const nodes = cy.nodes();
    let main = cy.collection();
    for (const c of cy.elements().components()) {
        if (c.nodes().length > main.nodes().length) {
            main = c;
        }
    }
    cy.fit(undefined, FIT_PADDING);
    const all = cy.zoom();
    if (main.nodes().length * 2 > nodes.length) {
        cy.fit(main, FIT_PADDING);
    }
    const s = SCALE.get(cy) ?? { network: 1, zoom: 1, view: 1 };
    const zoom = all / cy.zoom();
    if (zoom !== s.zoom || cy.zoom() !== s.view) {
        SCALE.set(cy, { ...s, zoom, view: cy.zoom() });
        cy.style().update();
    }
    const { x1, x2, y1, y2 } = cy.extent();
    return nodes.filter((n) => {
        const p = n.position();
        return p.x < x1 || p.x > x2 || p.y < y1 || p.y > y2;
    }).length;
}

/** Destroys every core the demo made, before a story draws new ones. */
export function retireAll(): void {
    for (const cy of live) {
        cy.destroy();
    }
    live = [];
}

/**
 * Marks a story root as the element visual-review waits on: its whenDone() resolves once the runs it started have
 * finished, successfully or not (visual-review.config.json names the selector and the method).
 * @param root - the story root
 * @param done - the runs' promise; it must not reject
 */
export function markDone(root: HTMLElement, done: () => Promise<void>): void {
    root.dataset.demo = "";
    Object.assign(root, { whenDone: () => done().then(freeze) });
}

/**
 * In a capture, covers every live core with a picture of it drawn by cy.png(). Cytoscape's own canvas is not the same
 * from one run to the next: it draws from textures it builds in idle frames, and it redraws when the window resizes,
 * which a full-page screenshot does. cy.png() draws every element directly, the same way every time.
 * @returns when the pictures are in place
 */
async function freeze(): Promise<void> {
    if (!CAPTURE) {
        return;
    }
    await Promise.all(
        live.map(async (cy) => {
            const img = new Image();
            img.src = cy.png({ full: false, scale: window.devicePixelRatio, bg: "#ffffff" });
            img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:10;";
            await img.decode();
            cy.container()?.append(img);
        }),
    );
}

/**
 * Reports a failed run: visual-review fails a capture whose console holds "graphty demo failed".
 * @param what - what failed
 * @param e - the error
 */
export function reportFailure(what: string, e: unknown): void {
    console.error(`graphty demo failed: ${what}:`, e);
}

/** What the status line reports about one run. */
export interface Outcome {
    /** "gpu", "cpu", or "not run" (detail then says why). */
    ran: string;
    /** Why the CPU ran, or the device the GPU run used. */
    detail: string | null;
    /** Anything worth one more line: the result's size, the modularity, ... */
    note?: string;
    /** The time of the work itself, when the run did more (an algorithm lays the graph out first). */
    ms?: number;
}

interface Demo {
    cy: Core;
    root: HTMLElement;
    gpuMode: "auto" | "off" | "require";
    /** The parsed extra options. */
    extra: Record<string, unknown>;
    setStatus(text: string, kind?: "info" | "ok" | "error"): void;
}

/**
 * Renders the demo frame and runs `run` once the network is in place; a "Run again" button repeats it.
 * @param args - the story's args
 * @param title - what is being run, for the status line
 * @param run - the work: returns which backend ran
 * @param load - puts the graph into the empty core and describes it; default: the network the args pick
 * @param headline - the status line's first line from the graph's description; default "<title> on <graph>"
 * @returns the story's root element
 */
export function renderDemo(
    args: RunArgs,
    title: string,
    run: (d: Demo) => Promise<Outcome>,
    load?: (cy: Core) => Promise<string>,
    headline: (graph: string) => string = (graph) => `${title} on ${graph}`,
): HTMLElement {
    retireAll();

    const root = document.createElement("div");
    // the whole viewport: the status bar on top, the graph in all the rest (Storybook's layout is "fullscreen")
    root.style.cssText = "display:flex;flex-direction:column;width:100%;height:100vh;font:13px system-ui,sans-serif;";
    const bar = document.createElement("div");
    // a fixed height: a status line that grows would shrink the canvas under a graph already fitted to it
    bar.style.cssText =
        "display:flex;gap:12px;align-items:center;padding:0 12px;height:76px;flex:none;overflow:hidden;border-bottom:1px solid #ddd;";
    const button = document.createElement("button");
    button.textContent = "Run again";
    const status = document.createElement("div");
    status.dataset.testid = "status";
    status.style.cssText = "white-space:pre-wrap;flex:1;";
    bar.append(button, status);
    const canvas = document.createElement("div");
    canvas.style.cssText = "flex:1;min-height:0;position:relative;";
    root.append(bar, canvas);

    const setStatus = (text: string, kind: "info" | "ok" | "error" = "info"): void => {
        status.textContent = text;
        status.style.color = { error: "#b00020", ok: "#14532d", info: "#333" }[kind];
        root.dataset.state = kind === "info" ? "running" : kind;
    };

    let extra: Record<string, unknown>;
    try {
        extra = JSON.parse(args.options || "{}") as Record<string, unknown>;
    } catch (e) {
        setStatus(`The options control is not valid JSON: ${(e as Error).message}`, "error");
        return root;
    }

    configureWebGpu({ acceptSoftware: args.acceptSoftware });

    const go = async (): Promise<void> => {
        button.disabled = true;
        try {
            retireAll();
            setStatus("Generating the network...");
            // let a frame paint first (and a capture see the story rendered) before generating a large network holds
            // the page
            await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
            const g = load === undefined ? GENERATE[args.network](SIZES[args.size], args.seed) : undefined;
            const cy = newCore(canvas, g === undefined ? [] : elementsOf(g));
            const graph =
                g === undefined
                    ? await (load as (cy: Core) => Promise<string>)(cy)
                    : `${args.network}, ${g.nodeCount.toLocaleString()} nodes, ${g.src.length.toLocaleString()} edges, seed ${args.seed}`;
            setStatus(`${headline(graph)}: running...`);
            const t0 = performance.now();
            const out = await run({ cy, root, gpuMode: GPU_MODE[args.backend], extra, setStatus });
            // a layout fits the graph to the size the container had when it started; fit it to the size it has now
            const outside = fitToContainer(cy);
            const ms = Math.round(out.ms ?? performance.now() - t0);
            const why = out.detail ? `\n${out.ran === "gpu" ? "device" : "why the CPU"}: ${out.detail}` : "";
            const time = CAPTURE ? "" : ` in ${ms.toLocaleString()} ms`;
            const off =
                outside === 0
                    ? ""
                    : `; ${outside.toLocaleString()} node${outside === 1 ? "" : "s"} outside the view (zoom out to see them)`;
            setStatus(
                out.ran === "not run"
                    ? `${headline(graph)}\ndid not run: ${out.detail ?? ""}`
                    : `${headline(graph)}\nran on ${out.ran.toUpperCase()}${time}${off}${why}${out.note ? `\n${out.note}` : ""}`,
                "ok",
            );
        } catch (e) {
            setStatus(`${title} failed: ${(e as Error).message}`, "error");
            reportFailure(title, e);
        } finally {
            button.disabled = false;
        }
    };
    // the canvas needs its size before Cytoscape mounts
    let running = new Promise<void>((resolve) => requestAnimationFrame(() => resolve(go())));
    button.onclick = () => {
        running = go();
    };
    markDone(root, () => running);
    return root;
}

/**
 * Covers the canvas while a large network is laid out without animation: what runs, the time so far, and how far the nodes moved in
 * the last half second, which falls toward 0 as the layout settles. The page stays live: the timer keeps counting
 * while a GPU run or an animated CPU run steps (a non-animated CPU run holds the page until it ends).
 * @param canvas - the canvas element to cover
 * @param cy - the core, whose node positions are sampled
 * @param what - what runs, for the first line
 * @returns removes the overlay
 */
export function showWorking(canvas: HTMLElement, cy: Core, what: string): () => void {
    const panel = document.createElement("div");
    panel.dataset.testid = "working";
    panel.style.cssText =
        "position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:#fff;";
    const text = document.createElement("div");
    text.style.cssText = "white-space:pre-wrap;text-align:center;line-height:1.6;color:#333;";
    panel.append(text);
    canvas.append(panel);
    const t0 = performance.now();
    // about 300 nodes spread over the whole graph
    const nodes = cy.nodes();
    const sample: NodeSingular[] = [];
    for (let i = 0; i < nodes.length; i += Math.ceil(nodes.length / 300)) {
        sample.push(nodes[i]);
    }
    let last: { x: number; y: number }[] | undefined;
    let moved = "";
    const update = (): void => {
        const now = sample.map((n) => ({ ...n.position() }));
        const before = last;
        if (before !== undefined) {
            const cx = now.reduce((a, p) => a + p.x, 0) / now.length;
            const cyy = now.reduce((a, p) => a + p.y, 0) / now.length;
            const radius = Math.sqrt(now.reduce((a, p) => a + (p.x - cx) ** 2 + (p.y - cyy) ** 2, 0) / now.length);
            const step = now.reduce((a, p, i) => a + Math.hypot(p.x - before[i].x, p.y - before[i].y), 0) / now.length;
            moved =
                radius === 0 || step === 0
                    ? "the nodes are drawn when the run ends"
                    : `the nodes moved ${((100 * step) / radius).toFixed(2)}% of the graph's radius in the last half second; it settles as this falls toward 0`;
        }
        last = now;
        const seconds = Math.round((performance.now() - t0) / 1_000);
        text.textContent = `${what}\nlaying out... ${seconds} s${moved ? `\n${moved}` : ""}`;
    };
    update();
    const timer = setInterval(update, 500);
    return () => {
        clearInterval(timer);
        panel.remove();
    };
}

/** Ten distinguishable colors for clusters. */
export const PALETTE = [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ac",
];

/**
 * Colors every node (or every element of `eles`) from `value`: low values pale, high values dark red.
 * @param cy - the core
 * @param value - each element's value; undefined leaves the element uncolored
 * @param eles - what to color; default every node
 */
export function colorByValue(
    cy: Core,
    value: (id: string) => number | undefined,
    eles: Collection = cy.elements("node"),
): void {
    const vals = eles.map((n) => value(n.id()));
    const finite = vals.filter((v): v is number => v !== undefined && Number.isFinite(v));
    const lo = Math.min(...finite);
    const hi = Math.max(...finite);
    cy.batch(() => {
        eles.forEach((n, i) => {
            const v = vals[i];
            if (v === undefined || !Number.isFinite(v)) {
                n.removeData("color");
                return;
            }
            const t = hi > lo ? (v - lo) / (hi - lo) : 1;
            n.data("color", `hsl(0, ${Math.round(30 + 60 * t)}%, ${Math.round(85 - 50 * t)}%)`);
        });
    });
}

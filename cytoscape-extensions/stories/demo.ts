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
import cytoscape, { type Collection, type Core, type ElementDefinition } from "cytoscape";

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
 * Cytoscape elements for a sample graph: node "n<i>", edge "e<i>", weight in data("w") when weighted.
 * @param g - the graph
 * @returns the elements
 */
export function elementsOf(g: SampleGraph): ElementDefinition[] {
    const els: ElementDefinition[] = [];
    for (let i = 0; i < g.nodeCount; i++) {
        els.push({ group: "nodes", data: { id: `n${i}` } });
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

const STYLE = [
    {
        selector: "node",
        style: { width: 8, height: 8, "background-color": "#7a8aa6", "border-width": 0 },
    },
    { selector: "node[color]", style: { "background-color": "data(color)" } },
    { selector: "edge", style: { width: 0.5, "line-color": "#b8c0cc", "curve-style": "straight" } },
    { selector: "edge[color]", style: { "line-color": "data(color)", width: 2 } },
];

let live: Core[] = [];

/**
 * A Cytoscape core in `container` with the demo's style; retireAll() destroys it.
 * @param container - the element to draw in
 * @param elements - the graph
 * @returns the core
 */
export function newCore(container: HTMLElement, elements: ElementDefinition[] = []): Core {
    const big = elements.length > 5_000;
    const cy = cytoscape({
        container,
        // haystack edges draw fastest, but each picks a random end point inside its nodes, so they are kept for the
        // large networks no snapshot shows
        style: big ? [...STYLE, { selector: "edge", style: { "curve-style": "haystack" } }] : STYLE,
        // ponytail: cheap viewport tricks only; Cytoscape's WebGL renderer is the upgrade for 50k nodes
        hideEdgesOnViewport: big,
        textureOnViewport: big,
        elements,
        layout: { name: "preset" },
    });
    live.push(cy);
    // for poking at from the browser console
    (window as unknown as { cy?: Core }).cy = cy;
    return cy;
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
    /** "gpu" or "cpu". */
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
 * @returns the story's root element
 */
export function renderDemo(
    args: RunArgs,
    title: string,
    run: (d: Demo) => Promise<Outcome>,
    load?: (cy: Core) => Promise<string>,
): HTMLElement {
    retireAll();

    const root = document.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;height:100vh;font:13px system-ui,sans-serif;";
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
    canvas.style.cssText = "flex:1;min-height:400px;";
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
            await new Promise((r) => setTimeout(r, 0)); // let the frame paint first
            const g = load === undefined ? GENERATE[args.network](SIZES[args.size], args.seed) : undefined;
            const cy = newCore(canvas, g === undefined ? [] : elementsOf(g));
            const graph =
                g === undefined
                    ? await (load as (cy: Core) => Promise<string>)(cy)
                    : `${args.network}, ${g.nodeCount.toLocaleString()} nodes, ${g.src.length.toLocaleString()} edges, seed ${args.seed}`;
            setStatus(`${title} on ${graph}: running...`);
            const t0 = performance.now();
            const out = await run({ cy, root, gpuMode: GPU_MODE[args.backend], extra, setStatus });
            const ms = Math.round(out.ms ?? performance.now() - t0);
            const why = out.detail ? `\n${out.ran === "gpu" ? "device" : "why the CPU"}: ${out.detail}` : "";
            const time = CAPTURE ? "" : ` in ${ms.toLocaleString()} ms`;
            setStatus(
                `${title} on ${graph}\nran on ${out.ran.toUpperCase()}${time}${why}${out.note ? `\n${out.note}` : ""}`,
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

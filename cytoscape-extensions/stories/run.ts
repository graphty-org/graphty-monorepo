/**
 * Runs one layout or one algorithm on a core the way a Cytoscape user would, fills in the inputs an algorithm needs
 * (a root, a goal, a source and sink, pairs, ...) from the graph, and paints the result. Shared by the interactive
 * stories and the galleries.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { Collection, Core, LayoutOptions, Layouts, NodeCollection, NodeSingular } from "cytoscape";

import { ASYNC_ALGORITHM_NAMES, type Backend, type ExportFormat } from "../src/index.js";
import { SIMULATION_LAYOUTS } from "./catalog.js";
import { colorByValue, type Outcome, PALETTE } from "./demo.js";

type GpuMode = "auto" | "off" | "require";

/**
 * Runs one "graphty-<name>" layout and waits for layoutstop.
 * @param cy - the core
 * @param options - the layout options
 * @returns the backend the layout reports, when it reports one
 */
function layoutOnce(cy: Core, options: Record<string, unknown>): Promise<Backend | undefined> {
    return new Promise((resolve, reject) => {
        const l = cy.layout(options as unknown as LayoutOptions) as Layouts & { backend?: Backend };
        l.one("layouterror", (_e: unknown, err: Error) => reject(err));
        l.one("layoutstop", () => resolve(l.backend));
        l.run();
    });
}

/**
 * The inputs a static layout needs that the graph can supply: three layers for multipartite (by node order), the
 * first node as the root of bfs and radial.
 * @param cy - the core
 * @param layout - the layout name without "graphty-"
 * @returns the options
 */
function layoutInputs(cy: Core, layout: string): Record<string, unknown> {
    const nodes = cy.nodes();
    switch (layout) {
        case "multipartite":
            return { subsets: [0, 1, 2].map((k) => nodes.filter((_n, i) => i % 3 === k)) };
        case "bfs":
        case "radial":
            return { root: nodes[0] };
        default:
            return {};
    }
}

interface LayoutRun {
    gpuMode: GpuMode;
    seed: number;
    /** Simulations: the fixed iteration count (maxIter for ForceAtlas2, iterations for the others). */
    iterations: number;
    /** Simulations: draw every frame. Static layouts: tween from the old positions to the new (`animate: "end"`). */
    animate: boolean;
    extra?: Record<string, unknown>;
}

/**
 * Lays the core out with one graphty layout.
 * @param cy - the core
 * @param layout - the name without "graphty-"
 * @param run - the run settings
 * @returns which backend ran and why
 */
export async function runLayout(cy: Core, layout: string, run: LayoutRun): Promise<Outcome> {
    const simulation = (SIMULATION_LAYOUTS as readonly string[]).includes(layout);
    if (layout === "kamada-kawai" && cy.nodes().length > 2_000) {
        throw new Error("kamada-kawai needs memory in the square of the node count; pick 2,000 nodes or fewer");
    }
    const options: Record<string, unknown> = { name: `graphty-${layout}`, seed: run.seed, ...layoutInputs(cy, layout) };
    if (simulation) {
        Object.assign(options, {
            gpu: run.gpuMode,
            animate: run.animate,
            [layout === "forceatlas2" ? "maxIter" : "iterations"]: run.iterations,
        });
    } else if (run.gpuMode === "require") {
        throw new Error(`graphty-${layout} has no GPU implementation; only the force simulations do`);
    } else if (run.animate) {
        // a new core has every node at the origin: scatter them first, so the tween glides from somewhere
        await layoutOnce(cy, { name: "graphty-random", seed: run.seed, animate: false });
        options.animate = "end";
    }
    const backend = await layoutOnce(cy, { ...options, ...run.extra });
    if (!backend) {
        return { ran: "cpu", detail: "a one-shot layout: there is no GPU implementation" };
    }
    return { ran: backend.ran, detail: backend.ran === "gpu" ? backend.device : backend.reason };
}

/**
 * The layout run before an algorithm, so the result has a readable picture: ForceAtlas2 (fixed 100 iterations,
 * seeded, on the CPU so the picture does not depend on the backend) up to 2,000 nodes, a seeded random layout above.
 * @param cy - the core
 * @param seed - the seed
 * @returns when the nodes are placed
 */
export async function placeForAlgorithm(cy: Core, seed: number): Promise<void> {
    const big = cy.nodes().length > 2_000;
    await layoutOnce(cy, {
        name: big ? "graphty-random" : "graphty-forceatlas2",
        seed,
        maxIter: 100,
        gpu: "off",
        animate: false,
    });
}

/**
 * The first `count` nodes a breadth-first walk from the first node reaches, with the edges among them: a connected
 * piece small enough for the isomorphism algorithms, whose run time grows with the graph's symmetries.
 * @param cy - the core
 * @param count - how many nodes
 * @returns the piece
 */
function smallPiece(cy: Core, count: number): Collection {
    let nodes = cy.collection();
    cy.elements().bfs({
        roots: cy.nodes()[0],
        visit: (v: NodeSingular) => {
            nodes = nodes.union(v);
            return nodes.length >= count ? true : undefined;
        },
    });
    return nodes.union(nodes.edgesWith(nodes));
}

/**
 * The inputs an algorithm needs that the graph can supply. Nodes are passed as collections, which every option that
 * takes a selector also takes.
 * @param cy - the core
 * @param algorithm - the name without "graphty"
 * @returns the options, and the collection to run on when it is not the whole graph
 */
function algorithmInputs(cy: Core, algorithm: string): { options: Record<string, unknown>; eles?: Collection } {
    const nodes = cy.nodes();
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const pairWithFirst = nodes.slice(1, 11).map((n) => [first, n]);
    switch (algorithm) {
        case "breadthFirstSearch":
        case "directionOptimizedBfs":
        case "depthFirstSearch":
        case "dijkstra":
        case "bellmanFord":
        case "nodeClosenessCentrality":
        case "topCandidatesForNode":
        case "topAdamicAdarCandidatesForNode":
            return { options: { root: first } };
        case "bidirectionalDijkstra":
        case "aStar":
            return { options: { root: first, goal: last } };
        case "deltaPageRank":
            // defined on directed graphs only, whatever the directed control says
            return { options: { directed: true } };
        case "personalizedPageRank":
            return { options: { personalization: first } };
        case "maxFlow":
        case "minSTCut":
            return { options: { source: first, sink: last } };
        case "commonNeighborsScore":
        case "adamicAdarScore":
            return { options: { source: first, target: nodes[1] } };
        case "commonNeighborsForPairs":
        case "adamicAdarForPairs":
            return { options: { pairs: pairWithFirst } };
        case "evaluateCommonNeighbors":
        case "evaluateAdamicAdar":
        case "compareAdamicAdarWithCommonNeighbors": {
            // held-out edges: the first 20; non-edges: node i against node i + n/2 where they are not adjacent
            const edges = cy
                .edges()
                .slice(0, 20)
                .map((e) => [e.source(), e.target()]);
            const half = Math.floor(nodes.length / 2);
            const nonEdges = [];
            for (let i = 0; i < half && nonEdges.length < 20; i++) {
                if (nodes[i].edgesWith(nodes[i + half]).length === 0) {
                    nonEdges.push([nodes[i], nodes[i + half]]);
                }
            }
            return { options: { edges, nonEdges } };
        }
        case "labelPropagationSemiSupervised":
            return { options: { seeds: [first, last] } };
        case "spectralClustering":
            return { options: { k: 4 } };
        case "syncClustering":
            return { options: { numClusters: 4 } };
        case "modularity":
            return { options: { clusters: cy.elements().graphtyLouvain() } };
        case "isGraphIsomorphic":
        case "findAllIsomorphisms": {
            const piece = smallPiece(cy, 8);
            return { options: { other: piece }, eles: piece };
        }
        default:
            return { options: {} };
    }
}

/** The parts of every result shape the demo reads. */
type AnyResult = Partial<{
    backend: Backend;
    score(n: unknown): number | undefined;
    distanceTo(n: unknown): number;
    depth(n: unknown): number | undefined;
    distance: number | ((from: unknown, to: unknown) => number);
    path: Collection;
    found: boolean | Collection;
    totalWeight: number;
    modularity: number;
    maxCore: number;
    total: number;
    hasNegativeWeightCycle: boolean;
    value: number;
    cut: Collection;
    partitionFirst: NodeCollection;
    partitionSecond: NodeCollection;
    bipartite: boolean;
    isomorphic: boolean;
    size: number;
    mate(n: unknown): NodeSingular | undefined;
    indegree(n: unknown): number | undefined;
}>;

/**
 * Rounds the numbers of a small result object for the status line.
 * @param v - the value
 * @returns its JSON, at most 160 characters
 */
function brief(v: unknown): string {
    const s = JSON.stringify(v, (_k, x: unknown) => (typeof x === "number" ? Number(x.toPrecision(4)) : x));
    return s.length > 160 ? `${s.slice(0, 157)}...` : s;
}

/**
 * Colors the result on the graph and describes it in one line.
 * @param cy - the core
 * @param r - the algorithm's result
 * @returns the description
 */
function paint(cy: Core, r: unknown): string {
    const red = (c: { data(key: string, value: string): unknown }): void => {
        c.data("color", "#e15759");
    };
    if (r === null) {
        return "no result (null)";
    }
    if (typeof r === "boolean" || typeof r === "number") {
        return `result: ${typeof r === "number" ? Number(r.toPrecision(6)) : r}`;
    }
    if (Array.isArray(r)) {
        const items = r as unknown[];
        if (items.length === 0) {
            return "an empty list";
        }
        if (typeof items[0] === "function") {
            return `${items.length.toLocaleString()} isomorphisms of the 8-node piece onto itself`;
        }
        if (typeof items[0] === "number") {
            return `per pair: ${brief(items.slice(0, 10))}`;
        }
        if (typeof (items[0] as { score?: unknown }).score === "number") {
            const links = items as { source: NodeSingular; target: NodeSingular; score: number }[];
            for (const l of links.slice(0, 10)) {
                red(l.source.union(l.target));
            }
            return `${links.length.toLocaleString()} predicted links; the ends of the top 10 in red (best score ${Number(links[0].score.toPrecision(4))})`;
        }
        const parts = items as NodeCollection[];
        cy.batch(() => parts.forEach((c, i) => c.data("color", PALETTE[i % PALETTE.length])));
        const mod = (r as AnyResult).modularity;
        return `${parts.length.toLocaleString()} clusters${mod === undefined ? "" : `, modularity ${mod.toFixed(4)}`}`;
    }
    if (typeof (r as { cut?: unknown }).cut === "function") {
        return `a dendrogram of ${(r as { merges: number }).merges} merges; cut(height) returns the clusters at a height`;
    }
    const o = r as AnyResult;
    const isCollection = typeof (r as { nodes?: unknown }).nodes === "function";
    if (isCollection && typeof o.totalWeight === "number") {
        red(r as Collection);
        return `the tree in red, total weight ${o.totalWeight}`;
    }
    if (isCollection) {
        const order = r as NodeCollection;
        colorByValue(cy, (id) => {
            const i = order.toArray().findIndex((n) => n.id() === id);
            return i < 0 ? undefined : i;
        });
        return `${order.length.toLocaleString()} nodes in order: darker red = later`;
    }
    if (o.score) {
        const score = o.score.bind(o);
        if (cy.nodes().some((n) => score(n) !== undefined)) {
            colorByValue(cy, (id) => score(cy.getElementById(id)));
            const extra = o.maxCore === undefined ? "" : `, max core ${o.maxCore}`;
            return `darker red = higher score${extra}${o.total === undefined ? "" : `, ${o.total} triangles`}`;
        }
        colorByValue(cy, (id) => score(cy.getElementById(id)), cy.elements("edge"));
        return "per edge: darker red = higher score";
    }
    if (o.indegree) {
        const deg = o.indegree.bind(o);
        colorByValue(cy, (id) => deg(cy.getElementById(id)));
        return "darker red = higher in-degree";
    }
    if (o.distanceTo) {
        const d = o.distanceTo.bind(o);
        colorByValue(cy, (id) => d(cy.getElementById(id)));
        return `distance from the first node: darker red = farther${o.hasNegativeWeightCycle ? "; a negative cycle" : ""}`;
    }
    if (o.depth) {
        const d = o.depth.bind(o);
        colorByValue(cy, (id) => d(cy.getElementById(id)));
        return "hops from the first node: darker red = deeper";
    }
    if (o.path && typeof o.distance === "number") {
        red(o.path);
        return `the path from the first node to the last in red, length ${Number(o.distance.toPrecision(4))}`;
    }
    if (typeof o.distance === "function") {
        const first = cy.nodes()[0];
        const dist = o.distance;
        colorByValue(cy, (id) => dist.call(o, first, cy.getElementById(id)));
        return "all pairs; shown: distance from the first node, darker red = farther";
    }
    if (o.partitionFirst && o.partitionSecond) {
        o.partitionFirst.data("color", PALETTE[0]);
        o.partitionSecond.data("color", PALETTE[1]);
        if (o.cut) {
            red(o.cut);
            return `cut value ${Number((o.value ?? 0).toPrecision(4))}: the two sides in blue and orange, the cut edges in red`;
        }
        return `bipartite: ${o.bipartite}; the two sides in blue and orange`;
    }
    if (o.mate && typeof o.size === "number") {
        const mate = o.mate.bind(o);
        cy.batch(() => {
            cy.nodes().forEach((n) => {
                const m = mate(n);
                if (m) {
                    red(n.edgesWith(m));
                }
            });
        });
        return `a matching of ${o.size} edges, in red`;
    }
    if (typeof o.isomorphic === "boolean") {
        return `the 8-node piece is isomorphic to itself: ${o.isomorphic}`;
    }
    return brief(r);
}

interface AlgorithmRun {
    gpuMode: GpuMode;
    directed: boolean;
    extra?: Record<string, unknown>;
}

/**
 * Runs one algorithm on the core (its `...Async` method when it has one, so it can go to the GPU) and paints the
 * result.
 * @param cy - the core
 * @param algorithm - the name without "graphty", as @graphty/algorithms spells it
 * @param run - the run settings
 * @returns which backend ran and why, the result in words, and the algorithm's own time
 */
export async function runAlgorithm(cy: Core, algorithm: string, run: AlgorithmRun): Promise<Outcome> {
    const method = `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`;
    const hasGpu = ASYNC_ALGORITHM_NAMES.includes(`${method}Async`);
    const inputs = algorithmInputs(cy, algorithm);
    const options: Record<string, unknown> = { directed: run.directed, ...inputs.options, ...run.extra };
    const eles = (inputs.eles ?? cy.elements()) as unknown as Record<string, (o: Record<string, unknown>) => unknown>;
    const t0 = performance.now();
    let r: unknown;
    if (hasGpu) {
        r = await eles[`${method}Async`]({ ...options, gpu: run.gpuMode });
    } else if (run.gpuMode === "require") {
        throw new Error(`${method} has no GPU implementation; pick auto or cpu`);
    } else {
        r = eles[method](options);
    }
    const ms = performance.now() - t0;
    const note = paint(cy, r);
    const b = (r as AnyResult | null)?.backend;
    if (!b) {
        return { ran: "cpu", detail: "no GPU implementation of this algorithm", note, ms };
    }
    return { ran: b.ran, detail: b.ran === "gpu" ? b.device : b.reason, note, ms };
}

// ---------------------------------------------------------------------------------------------------------------
// Graphs in and out

/** The bundled datasets, smallest first; the hosted ones are downloads and stay out of the snapshots. */
export const BUNDLED_DATASETS = DATASETS.filter((d) => d.hosting !== "remote")
    .sort((a, b) => a.nodes - b.nodes)
    .map((d) => d.name);

export const CPU_LAYOUT: Pick<Outcome, "ran" | "detail"> = {
    ran: "cpu",
    detail: 'the layout is held on the CPU (gpu: "off") so the picture is the same on every machine',
};

/**
 * Colors nodes by a ground-truth field (community, club, conference, ...).
 * @param cy - the core
 * @param field - the node data field, or null for none
 */
export function colorBy(cy: Core, field: string | null): void {
    if (field === null) {
        return;
    }
    const groups = new Map<unknown, number>();
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            const v: unknown = n.data(field);
            if (v !== undefined) {
                if (!groups.has(v)) {
                    groups.set(v, groups.size);
                }
                n.data("color", PALETTE[(groups.get(v) ?? 0) % PALETTE.length]);
            }
        });
    });
}

/**
 * Counts, for the status line.
 * @param cy - the core
 * @returns "n nodes, m edges"
 */
export function counts(cy: Core): string {
    return `${cy.nodes().length.toLocaleString()} nodes, ${cy.edges().length.toLocaleString()} edges`;
}

/**
 * Writes the core in `format`, clears it and reads the text back, laying it out again when the format carries no
 * positions.
 * @param cy - the core, laid out
 * @param format - the format
 * @param seed - the seed of the layout when the format carries no positions
 * @param onText - gets the written text
 * @returns what came back, in words
 */
export async function roundTrip(
    cy: Core,
    format: ExportFormat,
    seed: number,
    onText?: (text: string) => void,
): Promise<string> {
    const text = await cy.graphtyExport(format);
    onText?.(text);
    cy.elements().remove();
    const r = await cy.graphtyImport(text, format);
    colorBy(cy, "club");
    const placed = cy.nodes().filter((n) => n.position().x !== 0 || n.position().y !== 0).length > 0;
    if (!placed) {
        await placeForAlgorithm(cy, seed);
    }
    const warnings =
        r.report.warningCount > 0 ? `, ${r.report.warningCount} warning${r.report.warningCount === 1 ? "" : "s"}` : "";
    return `${text.length.toLocaleString()} characters of ${r.format}, read back as ${counts(cy)}${warnings}; positions ${placed ? "from the file" : "not in the format: laid out again"}`;
}

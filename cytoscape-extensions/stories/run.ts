/**
 * Runs one layout or one algorithm on a core the way a Cytoscape user would, fills in the inputs an algorithm needs
 * (a root, a goal, a source and sink, pairs, ...) from the graph, and paints the result. Shared by the interactive
 * stories and the galleries.
 */

import type { Collection, Core, EdgeSingular, LayoutOptions, Layouts, NodeCollection, NodeSingular } from "cytoscape";

import { ASYNC_ALGORITHM_NAMES, type Backend, type ExportFormat } from "../src/index.js";
import { SIMULATION_LAYOUTS } from "./catalog.js";
import { colorByValue, NO_GPU, type Outcome, PALETTE } from "./demo.js";

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
    /**
     * Simulations: a fixed iteration count (iterations for Fruchterman-Reingold, maxIter for the others), or 0 to run
     * until the layout settles, capped by settleCap().
     */
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
        Object.assign(options, { gpu: run.gpuMode, animate: run.animate, ...budget(layout, run.iterations, cy) });
    } else if (run.gpuMode === "require") {
        throw new Error(`graphty-${layout} has no GPU implementation; only the force simulations do`);
    } else if (run.animate) {
        // a new core has every node at the origin: scatter them first, so the tween glides from somewhere
        await layoutOnce(cy, { name: "graphty-random", seed: run.seed, animate: false });
        options.animate = "end";
    }
    const backend = await layoutOnce(cy, { ...options, ...run.extra });
    if (!backend) {
        // a one-shot layout runs only on the CPU: nothing to report
        return { ran: "cpu", detail: null };
    }
    return { ran: backend.ran, detail: backend.ran === "gpu" ? backend.device : backend.reason };
}

/**
 * The cap on a run until settled: generous, so it only stops a layout that never settles. ForceAtlas2 settles in
 * about 320 to 450 iterations on 10,000 to 50,000 nodes, Fruchterman-Reingold's adaptive cooling in about 180;
 * spring-electrical gets five times the cap.
 * @param n - the node count
 * @returns the cap
 */
function settleCap(n: number): number {
    return Math.max(1_000, Math.round(20 * Math.sqrt(n)));
}

/**
 * A simulation's budget options: a fixed count when one is given; else run until settled under settleCap(), with
 * Fruchterman-Reingold on adaptive cooling (its linear schedule always runs the whole budget).
 * @param layout - the simulation name without "graphty-"
 * @param iterations - the fixed count, or 0
 * @param cy - the core, for its node count
 * @returns the options
 */
function budget(layout: string, iterations: number, cy: Core): Record<string, unknown> {
    const cap = iterations > 0 ? iterations : settleCap(cy.nodes().length);
    switch (layout) {
        case "fruchterman-reingold":
            return iterations > 0 ? { iterations } : { iterations: cap, cooling: "adaptive" };
        case "spring-electrical":
            // it settles slowly: 2,338 iterations at 10,000 nodes, 4,474 at 50,000
            return { maxIter: iterations > 0 ? iterations : 5 * cap };
        default:
            return { maxIter: cap };
    }
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
 * ForceAtlas2 on the CPU, seeded, run until it settles: the picture the generator and dataset stories draw.
 * @param cy - the core
 * @param seed - the seed
 * @param extra - more ForceAtlas2 options (linlog, strongGravity, weight, ...)
 * @returns when the nodes are placed
 */
export async function placeSettled(cy: Core, seed: number, extra: Record<string, unknown> = {}): Promise<void> {
    await runLayout(cy, "forceatlas2", { gpuMode: "off", seed, iterations: 0, animate: false, extra });
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
 * takes a selector also takes. The inputs read what the example graphs carry (a flow network's `role`, a planted
 * partition's `community`, the two copies of an isomorphism example) and fall back to the first and last node.
 * @param cy - the core
 * @param algorithm - the name without "graphty"
 * @returns the options, and the collection to run on when it is not the whole graph
 */
function algorithmInputs(cy: Core, algorithm: string): { options: Record<string, unknown>; eles?: Collection } {
    const nodes = cy.nodes();
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    switch (algorithm) {
        case "breadthFirstSearch":
        case "directionOptimizedBfs":
        case "depthFirstSearch":
        case "dijkstra":
        case "bellmanFord":
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
        case "nodeClosenessCentrality":
            // the best-connected node: its distances run from 1 to a few hops, so the shading shows them
            return { options: { root: nodes.max((n) => n.degree(false)).ele } };
        case "maxFlow":
        case "minSTCut": {
            // a flow network marks its source and sink (role 1 and 2) and keeps the capacities in data.weight
            const source = cy.nodes("[role = 1]");
            const sink = cy.nodes("[role = 2]");
            const capacities = cy.edges().some((e) => typeof e.data("weight") === "number");
            return {
                options: {
                    source: source.nonempty() ? source : first,
                    sink: sink.nonempty() ? sink : last,
                    ...(capacities ? { weight: "weight" } : {}),
                },
            };
        }
        case "commonNeighborsScore":
        case "adamicAdarScore": {
            // a pair that is not linked yet: the first node and its best candidate
            const best = cy.elements().graphtyTopCandidatesForNode({ root: first, topK: 1 })[0];
            return { options: { source: first, target: best === undefined ? nodes[1] : best.target } };
        }
        case "commonNeighborsForPairs":
        case "adamicAdarForPairs": {
            // the first node against every node two hops away (they share a neighbor) and five farther away
            const near = first.neighborhood().nodes();
            const twoHop = near.neighborhood().nodes().difference(near).difference(first);
            const far = nodes.difference(twoHop).difference(near).difference(first).slice(0, 5);
            return { options: { pairs: twoHop.union(far).map((n) => [first, n]) } };
        }
        case "evaluateCommonNeighbors":
        case "evaluateAdamicAdar":
        case "compareAdamicAdarWithCommonNeighbors": {
            // held out: every tenth edge, removed from what the algorithm sees; non-edges: as many unlinked pairs,
            // node i against node 7i + 13, spread over the graph
            const heldOut = cy
                .edges()
                .filter((_e, i) => i % 10 === 0)
                .edges();
            const n = nodes.length;
            const nonEdges: NodeSingular[][] = [];
            for (let i = 0; i < n && nonEdges.length < heldOut.length; i++) {
                const j = (7 * i + 13) % n;
                if (i !== j && nodes[i].edgesWith(nodes[j]).empty()) {
                    nonEdges.push([nodes[i], nodes[j]]);
                }
            }
            return {
                options: { edges: heldOut.map((e) => [e.source(), e.target()]), nonEdges },
                eles: cy.elements().difference(heldOut),
            };
        }
        case "labelPropagationSemiSupervised":
            return { options: { seeds: seedsOf(cy) } };
        case "spectralClustering":
            return { options: { k: 4 } };
        case "syncClustering":
            return { options: { numClusters: 4 } };
        case "teraHAC":
            // teraHAC merges everything into one cluster unless told when to stop; with numClusters it splits its
            // tree again from the top (docs/reference/algorithms.md), which joins two communities here
            return { options: { distanceThreshold: 2.5 } };
        case "markovClustering":
            // the default inflation of 2 splits a sparse graph's communities into many small clusters
            return { options: { inflation: 1.5 } };
        case "hierarchicalClustering":
            // single linkage (the default) chains clusters together; average linkage keeps communities apart
            return { options: { linkage: "average" } };
        case "modularity":
            return {
                options: { clusters: hasCommunities(cy) ? "community" : cy.elements().graphtyLouvain() },
            };
        case "isGraphIsomorphic":
        case "findAllIsomorphisms": {
            const second = cy.$(".second");
            if (second.nonempty()) {
                return { options: { other: second }, eles: cy.$(".first") };
            }
            const piece = smallPiece(cy, 8);
            return { options: { other: piece }, eles: piece };
        }
        default:
            return { options: {} };
    }
}

/**
 * Whether the nodes carry a planted community.
 * @param cy - the core
 * @returns true when some node has data("community")
 */
function hasCommunities(cy: Core): boolean {
    return cy.nodes().some((n) => n.data("community") !== undefined);
}

/**
 * The seeds of semi-supervised label propagation: the first node of each planted community, or the first and the
 * last node when there are none. Each seed is its own label.
 * @param cy - the core
 * @returns the seeds
 */
function seedsOf(cy: Core): NodeSingular[] {
    const byGroup = new Map<unknown, NodeSingular>();
    cy.nodes().forEach((n) => {
        const c: unknown = n.data("community");
        if (c !== undefined && !byGroup.has(c)) {
            byGroup.set(c, n);
        }
    });
    const nodes = cy.nodes();
    return byGroup.size > 1 ? [...byGroup.values()] : [nodes[0], nodes[nodes.length - 1]];
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
 * A number for the status line: at most four significant digits.
 * @param x - the number
 * @returns the text
 */
const num = (x: number): string => String(Number(x.toPrecision(4)));

/**
 * "1 cluster", "6 clusters".
 * @param n - the count
 * @param noun - the singular
 * @returns the text
 */
const plural = (n: number, noun: string): string => `${n.toLocaleString()} ${noun}${n === 1 ? "" : "s"}`;

const RED = "#e15759";
/** The names of PALETTE's colors, for the status line. */
const PALETTE_NAMES = ["blue", "orange", "red", "teal", "green", "yellow", "purple", "pink", "brown", "gray"];
const BLUE = "#4e79a7";
const GREEN = "#59a14f";

/**
 * Marks nodes as the ones a run starts from or is about: drawn larger, with a dark ring.
 * @param c - the nodes
 * @param label - a short label beside them
 */
function mark(c: { data(key: string, value: unknown): unknown }, label?: string): void {
    c.data("mark", true);
    if (label !== undefined) {
        c.data("tag", label);
    }
}

/**
 * Adds a dashed edge the run proposes or tests, after the run (so it is never part of the run's input).
 * @param cy - the core
 * @param source - one end
 * @param target - the other end
 * @param data - color, label, ...
 * @returns the edge
 */
function propose(
    cy: Core,
    source: NodeSingular,
    target: NodeSingular,
    data: Record<string, unknown> = {},
): EdgeSingular {
    return cy
        .add({ group: "edges", classes: "proposed", data: { source: source.id(), target: target.id(), ...data } })
        .edges()[0];
}

interface Link {
    source: NodeSingular;
    target: NodeSingular;
    score: number;
}

/**
 * Draws predicted links from one node as dashed edges, darker for a higher score.
 * @param cy - the core
 * @param links - the links
 * @returns the best score
 */
function drawLinks(cy: Core, links: Link[]): number {
    let added = cy.collection();
    const scoreOf = new Map<string, number>();
    for (const l of links) {
        const e = propose(cy, l.source, l.target);
        scoreOf.set(e.id(), l.score);
        added = added.union(e);
    }
    colorByValue(cy, (id) => scoreOf.get(id), added);
    return Math.max(0, ...links.map((l) => l.score));
}

/**
 * Colors a partition, one palette color per part.
 * @param cy - the core
 * @param parts - the parts
 * @param minSize - leave parts smaller than this uncolored
 * @returns how many parts were colored
 */
function colorParts(cy: Core, parts: readonly NodeCollection[], minSize = 1): number {
    let k = 0;
    cy.batch(() => {
        for (const p of parts) {
            if (p.length >= minSize) {
                p.data("color", PALETTE[k % PALETTE.length]);
                k++;
            }
        }
    });
    return k;
}

/**
 * Draws the held-out edges and the non-edges of a link-prediction evaluation: held-out edges dashed green (they
 * stay drawn, but the run did not see them), non-edges dashed gray.
 * @param cy - the core
 * @param options - the run's options
 * @returns the number of held-out edges
 */
function drawEvaluation(cy: Core, options: Record<string, unknown>): number {
    const edges = options.edges as NodeSingular[][];
    for (const [u, v] of edges) {
        u.edgesWith(v).addClass("proposed").data("color", GREEN);
    }
    for (const [u, v] of options.nonEdges as NodeSingular[][]) {
        propose(cy, u, v);
    }
    return edges.length;
}

interface Metrics {
    auc: number;
    f1Score: number;
    precision: number;
    recall: number;
}
const metrics = (m: Metrics): string => `AUC ${num(m.auc)}, best F1 ${num(m.f1Score)}`;

/** A painter: draws one algorithm's result on the graph and describes it. */
type Painter = (cy: Core, r: never, options: Record<string, unknown>) => string | Promise<string>;

/** The algorithms whose result needs a picture of its own; the rest are painted by the shape of their result. */
const PAINTERS: Partial<Record<string, Painter>> = {
    personalizedPageRank: (cy, r: AnyResult, o) => {
        paintByShape(cy, r);
        const start = o.personalization as Collection;
        mark(start);
        start.data("color", BLUE);
        return "PageRank from the blue node (every random jump returns to it): darker red = higher score";
    },
    nodeClosenessCentrality: (cy, r: number, o) => {
        const root = o.root as NodeSingular;
        const bfs = cy.elements().graphtyBreadthFirstSearch({ root });
        colorByValue(cy, (id) => bfs.depth(cy.getElementById(id)));
        mark(root);
        root.data("color", BLUE);
        const others = cy.nodes().difference(root);
        const sum = others.reduce((a, n) => a + (bfs.depth(n) ?? 0), 0);
        const exact = sum > 0 && Math.abs(r - 1 / sum) < 1e-12;
        return `closeness of the blue node: ${num(r)}${exact ? ` = 1 / ${sum}, one over the sum of its hop distances to the other ${others.length} nodes` : ""}; darker red = farther from it`;
    },
    hits: (cy, r: { hub(n: unknown): number | undefined; authority(n: unknown): number | undefined }) => {
        // each score as its rank among the nodes (0 lowest, 1 highest): authority scores pile up on a few nodes, and
        // scaled by the largest every other authority would look pale
        const rank = (score: (n: NodeSingular) => number): Map<string, number> => {
            const sorted = cy.nodes().toArray() as NodeSingular[];
            sorted.sort((a, b) => score(a) - score(b));
            return new Map(sorted.map((n, i) => [n.id(), score(n) > 0 ? i / Math.max(1, sorted.length - 1) : 0]));
        };
        const hub = rank((n) => r.hub(n) ?? 0);
        const auth = rank((n) => r.authority(n) ?? 0);
        cy.batch(() => {
            cy.nodes().forEach((n) => {
                const h = hub.get(n.id()) ?? 0;
                const a = auth.get(n.id()) ?? 0;
                const t = Math.max(h, a);
                const hue = a >= h ? 0 : 215;
                n.data("color", `hsl(${hue}, ${Math.round(30 + 60 * t)}%, ${Math.round(85 - 50 * t)}%)`);
            });
        });
        return "red = authority (pointed to by good hubs), blue = hub (points to good authorities); darker = stronger";
    },
    degrees: (cy, r: AnyResult, o) => {
        paintByShape(cy, r);
        return `darker red = higher ${o.directed === true ? "in-degree" : "degree"}`;
    },
    kCoreDecomposition: (cy, r: { score(n: unknown): number | undefined; maxCore: number }) => {
        const size = new Map<number, number>();
        const color = (k: number): number => (k + PALETTE.length - 1) % PALETTE.length;
        cy.batch(() => {
            cy.nodes().forEach((n) => {
                const k = r.score(n) ?? 0;
                size.set(k, (size.get(k) ?? 0) + 1);
                n.data("color", PALETTE[color(k)]);
            });
        });
        const cores = [...size.keys()]
            .sort((a, b) => b - a)
            .map((k) => `${k} ${PALETTE_NAMES[color(k)]} (${size.get(k) ?? 0})`)
            .join(", ");
        return `core number k (the node is in a group where every member has k or more neighbors): ${cores}`;
    },
    hierarchicalClustering: (cy, r: { cutAt(by: { clusters: number }): NodeCollection[] }, o) => {
        const groups = new Set(cy.nodes().map((n) => n.data("community") as unknown)).size;
        const k = hasCommunities(cy) && groups > 1 ? groups : 4;
        colorParts(cy, r.cutAt({ clusters: k }));
        return `${plural(k, "cluster")} cut from the merge tree (${String(o.linkage ?? "single")} linkage)`;
    },
    modularity: (cy, r: number, o) => {
        if (o.clusters === "community") {
            colorBy(cy, "community");
        } else {
            colorParts(cy, o.clusters as NodeCollection[]);
        }
        const which = o.clusters === "community" ? "the planted communities" : "Louvain's clusters";
        return `modularity of the colored partition (${which}): ${num(r)}`;
    },
    labelPropagationSemiSupervised: (cy, r: NodeCollection[], o) => {
        colorParts(cy, r);
        const seeds = o.seeds as NodeSingular[];
        for (const s of seeds) {
            mark(s);
        }
        return `${plural(r.length, "cluster")}: the labels spread from the ${seeds.length} ringed seed nodes`;
    },
    stronglyConnectedComponents: (cy, r: NodeCollection[]) => {
        const k = colorParts(cy, r, 2);
        return `${plural(k, "strongly connected component")} of 2 or more nodes in color (each node reaches every other one along the arrows); ${plural(r.length - k, "single node")} in gray`;
    },
    condensation: async (cy, r: NodeCollection[] & { condensed: { snapshot: CondensedSnapshot } }) => {
        const s = r.condensed.snapshot;
        cy.elements().remove();
        let k = 0;
        cy.add(
            r.map((part, i) => ({
                group: "nodes" as const,
                data: {
                    id: `c${i}`,
                    tag: String(part.length),
                    size: 8 + 4 * part.length,
                    ...(part.length > 1 ? { color: PALETTE[k++ % PALETTE.length] } : {}),
                },
            })),
        );
        for (let e = 0; e < s.edgeCount; e++) {
            cy.add({
                group: "edges",
                classes: "directed",
                data: { id: `ce${e}`, source: `c${s.edgeSource(e)}`, target: `c${s.edgeTarget(e)}` },
            });
        }
        await layoutOnce(cy, { name: "graphty-kamada-kawai", animate: false });
        return `the condensed graph: one node per strongly connected component, labeled with its size (colored when 2 or more); ${plural(s.edgeCount, "arc")}, and no cycles`;
    },
    hasCycle: (_cy, r: boolean) => (r ? "the graph has a cycle" : "the graph has no cycle"),
    topologicalSort: (cy, r: NodeCollection) => {
        paintByShape(cy, r);
        if (r.length <= 40) {
            r.forEach((n, i) => {
                n.data("tag", String(i + 1));
            });
            return "each node numbered by its place in the order: every arrow runs from a lower number to a higher one";
        }
        return `${r.length.toLocaleString()} nodes in order: darker red = later; every arrow runs from paler to darker`;
    },
    isBipartite: (cy, r: AnyResult) => {
        paintByShape(cy, r);
        return r.bipartite === true
            ? "bipartite: every edge joins a blue node to an orange one"
            : "not bipartite: some cycle has an odd length";
    },
    maximumBipartiteMatching: (cy, r: AnyResult) => matching(cy, r),
    greedyBipartiteMatching: (cy, r: AnyResult) => matching(cy, r),
    isGraphIsomorphic: (cy, r: { isomorphic: boolean; mapping(n: unknown): NodeSingular | undefined }, o) => {
        if (!r.isomorphic) {
            return "not isomorphic: no mapping keeps every edge";
        }
        colorMapping(cy, r.mapping.bind(r), o);
        return "isomorphic: each node has the color of the node it maps to in the other drawing, and every edge maps to an edge";
    },
    findAllIsomorphisms: (cy, r: ((n: unknown) => NodeSingular | undefined)[], o) => {
        if (r.length > 0) {
            colorMapping(cy, r[0], o);
        }
        return `${plural(r.length, "isomorphism")} between the two drawings (the graph's symmetries); the colors show the first: each node has the color of the node it maps to`;
    },
    maxFlow: (cy, r: AnyResult & { flow(e: unknown): number | undefined }, o) => {
        const flow = r.flow.bind(r);
        const max = Math.max(0, ...cy.edges().map((e) => flow(e) ?? 0));
        let full = 0;
        cy.batch(() => {
            cy.edges().forEach((e) => {
                const f = flow(e) ?? 0;
                if (f > 0) {
                    const capacity = o.weight === undefined ? undefined : (e.data(o.weight as string) as number);
                    const saturated = capacity !== undefined && f >= capacity;
                    full += saturated ? 1 : 0;
                    e.data({ thick: 1 + (5 * f) / max, color: saturated ? RED : BLUE });
                }
            });
        });
        mark(o.source as Collection, "s");
        mark(o.sink as Collection, "t");
        return `maximum flow ${num(r.value ?? 0)} from s to t: line width = flow; blue = carries flow, red = at full capacity (${full} edges)`;
    },
    minSTCut: (cy, r: AnyResult, o) => {
        const text = paintByShape(cy, r);
        mark(o.source as Collection, "s");
        mark(o.sink as Collection, "t");
        let widths = "";
        if (typeof o.weight === "string") {
            // line width = capacity, so the cut is seen to run through the thin edges
            const field = o.weight;
            const max = Math.max(...cy.edges().map((e) => Number(e.data(field)) || 0));
            cy.edges().forEach((e) => {
                e.data("thick", 0.5 + (3 * (Number(e.data(field)) || 0)) / max);
            });
            widths = "; line width = capacity";
        }
        return `${text.replace("the two sides in blue and orange", "the s side in blue, the t side in orange")}${widths}`;
    },
    commonNeighborsScore: (cy, r: number, o) => pairScore(cy, r, o, "they share"),
    adamicAdarScore: (cy, r: number, o) =>
        `${pairScore(cy, r, o, "they share")}; a shared neighbor with few links counts more than a hub`,
    commonNeighborsForPairs: (cy, r: number[], o) => pairScores(cy, r, o),
    adamicAdarForPairs: (cy, r: number[], o) => pairScores(cy, r, o),
    commonNeighborsPrediction: (cy, r: Link[]) => predictions(cy, r),
    adamicAdarPrediction: (cy, r: Link[]) => predictions(cy, r),
    topCandidatesForNode: (cy, r: Link[], o) => candidates(cy, r, o),
    topAdamicAdarCandidatesForNode: (cy, r: Link[], o) => candidates(cy, r, o),
    evaluateCommonNeighbors: (cy, r: Metrics, o) => evaluation(cy, r, o),
    evaluateAdamicAdar: (cy, r: Metrics, o) => evaluation(cy, r, o),
    compareAdamicAdarWithCommonNeighbors: (cy, r: { adamicAdar: Metrics; commonNeighbors: Metrics }, o) => {
        const k = drawEvaluation(cy, o);
        return `the same ${k} hidden links (dashed green) and non-links (dashed gray): Adamic-Adar ${metrics(r.adamicAdar)}; common neighbors ${metrics(r.commonNeighbors)}`;
    },
};

/** The condensed graph's arcs, as condensation returns them. */
interface CondensedSnapshot {
    edgeCount: number;
    edgeSource(e: number): number;
    edgeTarget(e: number): number;
}

/**
 * A matching: its edges and their ends in red.
 * @param cy - the core
 * @param r - the result
 * @returns the description
 */
function matching(cy: Core, r: AnyResult): string {
    const mate = (r.mate as (n: unknown) => NodeSingular | undefined).bind(r);
    let matched = 0;
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            const m = mate(n);
            if (m) {
                matched++;
                n.data("color", RED);
                n.edgesWith(m).data("color", RED);
            }
        });
    });
    return `a matching of ${plural(r.size ?? 0, "edge")} in red, no two sharing a node; ${plural(cy.nodes().length - matched, "node")} left unmatched`;
}

/**
 * An isomorphism: each node of the run's graph and its image share a color.
 * @param cy - the core
 * @param map - the mapping
 * @param o - the run's options (`other` is the graph mapped onto)
 */
function colorMapping(cy: Core, map: (n: unknown) => NodeSingular | undefined, o: Record<string, unknown>): void {
    const other = o.other as Collection;
    const from = cy.$(".first").nonempty() ? cy.$(".first").nodes() : other.nodes();
    cy.batch(() => {
        from.forEach((n, i) => {
            const color = PALETTE[i % PALETTE.length];
            n.data("color", color);
            map(n)?.data("color", color);
        });
    });
}

/**
 * One pair's score: both ends ringed, a dashed edge between them with the score, their shared neighbors in red.
 * @param cy - the core
 * @param r - the score
 * @param o - the run's options
 * @param verb - the words before the shared-neighbor count
 * @returns the description
 */
function pairScore(cy: Core, r: number, o: Record<string, unknown>, verb: string): string {
    const source = o.source as NodeSingular;
    const target = o.target as NodeSingular;
    const linked = source.edgesWith(target).nonempty();
    const shared = source.neighborhood().nodes().intersection(target.neighborhood().nodes());
    shared.data("color", RED);
    // the two-step paths through the shared neighbors
    source.edgesWith(shared).union(target.edgesWith(shared)).data("color", RED);
    mark(source.union(target));
    source.union(target).data("color", BLUE);
    propose(cy, source, target, { label: num(r), color: BLUE });
    return `the two blue nodes are ${linked ? "" : "not "}linked; ${verb} ${plural(shared.length, "neighbor")} (red): score ${num(r)}`;
}

/**
 * Scores of pairs from one node: the node ringed, a dashed edge to each other end, darker for a higher score.
 * @param cy - the core
 * @param r - the scores, one per pair
 * @param o - the run's options
 * @returns the description
 */
function pairScores(cy: Core, r: number[], o: Record<string, unknown>): string {
    const pairs = o.pairs as NodeSingular[][];
    const best = drawLinks(
        cy,
        pairs.map(([source, target], k) => ({ source, target, score: r[k] })),
    );
    mark(pairs[0][0]);
    pairs[0][0].data("color", BLUE);
    return `scores of the blue node paired with ${pairs.length} nodes it is not linked to: darker dashed line = higher score (best ${num(best)})`;
}

/**
 * Predicted links over the whole graph: the ten best dashed in red, the nodes in their planted communities.
 * @param cy - the core
 * @param r - the links, best first
 * @returns the description
 */
function predictions(cy: Core, r: Link[]): string {
    colorBy(cy, hasCommunities(cy) ? "community" : null);
    for (const l of r.slice(0, 10)) {
        propose(cy, l.source, l.target, { color: RED });
    }
    return `the 10 best of ${plural(r.length, "predicted link")}, dashed red (best score ${num(r[0]?.score ?? 0)})${hasCommunities(cy) ? "; nodes colored by community" : ""}`;
}

/**
 * One node's best candidates: the node ringed, a dashed edge to each, darker for a higher score.
 * @param cy - the core
 * @param r - the links, best first
 * @param o - the run's options
 * @returns the description
 */
function candidates(cy: Core, r: Link[], o: Record<string, unknown>): string {
    const root = o.root as Collection;
    mark(root);
    root.data("color", BLUE);
    const best = drawLinks(cy, r);
    return `the ${plural(r.length, "best new link")} for the blue node, dashed: darker = higher score (best ${num(best)})`;
}

/**
 * An evaluation against held-out links.
 * @param cy - the core
 * @param r - the metrics
 * @param o - the run's options
 * @returns the description
 */
function evaluation(cy: Core, r: Metrics, o: Record<string, unknown>): string {
    const k = drawEvaluation(cy, o);
    return `${k} links hidden from the run (dashed green) against ${k} non-links (dashed gray): ${metrics(r)}; an AUC of 0.5 is chance`;
}

/**
 * Colors the result on the graph by the shape of the result and describes it in one line.
 * @param cy - the core
 * @param r - the algorithm's result
 * @param algorithm - the name without "graphty"
 * @returns the description
 */
function paintByShape(cy: Core, r: unknown, algorithm = ""): string {
    const red = (c: { data(key: string, value: string): unknown }): void => {
        c.data("color", RED);
    };
    if (r === null) {
        return "no result (null)";
    }
    if (typeof r === "boolean" || typeof r === "number") {
        return `result: ${typeof r === "number" ? num(r) : r}`;
    }
    if (Array.isArray(r)) {
        const items = r as unknown[];
        if (items.length === 0) {
            return "an empty list";
        }
        if (typeof items[0] === "number") {
            return `per pair: ${brief(items.slice(0, 10))}`;
        }
        const parts = items as NodeCollection[];
        colorParts(cy, parts);
        const mod = (r as AnyResult).modularity;
        const noun = algorithm.endsWith("Components") ? "component" : "cluster";
        const sizes = parts.length <= 10 ? ` (${parts.map((p) => p.length).join(", ")} nodes)` : "";
        const each = parts.length > 1 ? ", one color each" : "";
        return `${plural(parts.length, noun)}${sizes}${each}${mod === undefined ? "" : `; modularity ${mod.toFixed(4)}`}`;
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
        return `the path from the first node to the last in red, length ${num(o.distance)}`;
    }
    if (typeof o.distance === "function") {
        const first = cy.nodes()[0];
        const dist = o.distance;
        colorByValue(cy, (id) => dist.call(o, first, cy.getElementById(id)));
        return "all pairs; shown: distance from the first node, darker red = farther";
    }
    if (o.partitionFirst && o.partitionSecond) {
        // the side holding the first node in blue, so two cuts of the same graph color alike
        const [a, b] = o.partitionSecond.contains(cy.nodes()[0])
            ? [o.partitionSecond, o.partitionFirst]
            : [o.partitionFirst, o.partitionSecond];
        a.data("color", PALETTE[0]);
        b.data("color", PALETTE[1]);
        if (o.cut) {
            red(o.cut);
            return `cut value ${num(o.value ?? 0)}: the two sides in blue and orange (${a.length} and ${b.length} nodes), the ${plural(o.cut.length, "cut edge")} in red`;
        }
        return `bipartite: ${o.bipartite}; the two sides in blue and orange`;
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
    if (options.directed === true) {
        cy.edges().addClass("directed");
    }
    // a cluster count or setting the demo chose, said beside the result so the picture is not read as the
    // algorithm's own
    const asked = ["k", "numClusters", "inflation", "distanceThreshold"]
        .filter((k) => typeof options[k] === "number")
        .map((k) => `${k}: ${String(options[k])}`);
    const painter = PAINTERS[algorithm];
    const painted = painter ? await painter(cy, r as never, options) : paintByShape(cy, r, algorithm);
    const note = painted + (asked.length > 0 ? ` (${asked.join(", ")})` : "");
    const b = (r as AnyResult | null)?.backend;
    if (!b) {
        return { ran: "cpu", detail: NO_GPU, note, ms };
    }
    return { ran: b.ran, detail: b.ran === "gpu" ? b.device : b.reason, note, ms };
}

// ---------------------------------------------------------------------------------------------------------------
// Graphs in and out

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
                const i = groups.get(v) ?? 0;
                // past the palette, hues a golden angle apart, so neighbouring groups never share a color
                n.data("color", i < PALETTE.length ? PALETTE[i] : `hsl(${Math.round((i * 137.5) % 360)}, 60%, 55%)`);
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

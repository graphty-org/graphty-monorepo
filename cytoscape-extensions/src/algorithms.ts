/**
 * Every @graphty/algorithms algorithm as a Cytoscape.js 3.x collection and core method, named "graphty<Name>".
 *
 * The conventions, which follow Cytoscape's built-in algorithms:
 * - scope is the calling collection (its nodes, and its edges whose two ends are in it); `cy.graphtyX(o)` is
 *   `cy.elements().graphtyX(o)`;
 * - synchronous, one options object;
 * - `directed` (default false) and `weight` (an edge data field, or a function of the edge) describe the graph;
 * - nodes are named by a selector or a collection (`root`, `goal`, `source`, `sink`, ...);
 * - results are keyed by element: accessor functions (`score(node)`, `distanceTo(node)`), collections, and arrays
 *   of collections, never index arrays;
 * - `field` writes the per-element value (what `score` or `cluster` returns) into `data(field)`, so a stylesheet
 *   can map it;
 * - every other option goes to the @graphty/algorithms function unchanged;
 * - errors throw, from the adapter (a selection that matches nothing, a weight given to an algorithm that ignores
 *   weights) and from the algorithm (an undirected graph given to one that needs a directed one).
 */

import {
    accelerated,
    type AcceleratedAlgorithms,
    adamicAdarForPairs,
    adamicAdarPrediction,
    adamicAdarScore,
    allPairsShortestPath,
    type ApspOptions,
    astar,
    bellmanFord,
    betweennessCentrality,
    type BetweennessOptions,
    bidirectionalDijkstra,
    type BipartiteOptions,
    breadthFirstSearch,
    type CandidateOptions,
    closenessCentrality,
    type ClosenessOptions,
    commonNeighborsForPairs,
    commonNeighborsPrediction,
    commonNeighborsScore,
    compareAdamicAdarWithCommonNeighbors,
    condensation,
    connectedComponents,
    degreeCentrality,
    type DegreeCentralityOptions,
    degrees,
    DeltaPageRank,
    type DeltaPageRankComputeOptions,
    depthFirstSearch,
    dijkstra,
    directionOptimizedBfs,
    type DirectionOptimizedBfsOptions,
    edgeBetweennessCentrality,
    eigenvectorCentrality,
    type EigenvectorOptions,
    evaluateAdamicAdar,
    evaluateCommonNeighbors,
    findAllIsomorphisms,
    getTopAdamicAdarCandidatesForNode,
    getTopCandidatesForNode,
    girvanNewman,
    type GirvanNewmanOptions,
    greedyBipartiteMatching,
    grsbm,
    type GrsbmOptions,
    hasCycle,
    hierarchicalClustering,
    type HierarchicalOptions,
    hits,
    type HitsOptions,
    isBipartite,
    isGraphIsomorphic,
    kargerMinCut,
    type KargerOptions,
    katzCentrality,
    type KatzOptions,
    kCoreDecomposition,
    kruskalMST,
    labelPropagation,
    type LabelPropagationOptions,
    labelPropagationSemiSupervised,
    labelPropagationSynchronous,
    leiden,
    type LeidenOptions,
    type LinkPredictionMetrics,
    type LinkPredictionOptions,
    type LinkPredictionResult,
    louvain,
    type LouvainOptions,
    markovClustering,
    type MarkovOptions,
    maxFlow,
    type MaxFlowOptions,
    maximumBipartiteMatching,
    type MinCutResult,
    minSTCut,
    modularity,
    type ModularityOptions,
    nodeClosenessCentrality,
    pageRank,
    type PageRankOptions,
    personalizedPageRank,
    primMST,
    PriorityDeltaPageRank,
    spectralClustering,
    type SpectralOptions,
    stoerWagner,
    stronglyConnectedComponents,
    syncClustering,
    type SyncClusteringOptions,
    teraHAC,
    type TeraHacOptions,
    topologicalSort,
    triangleCount,
    weaklyConnectedComponents,
} from "@graphty/algorithms";
import {
    type DerivedGraph,
    type F64,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskTest,
    type U32,
} from "@graphty/graph-format";
import type {
    Collection,
    CollectionArgument,
    CollectionReturnValue,
    Core,
    EdgeCollection,
    EdgeSingular,
    NodeCollection,
    NodeSingular,
} from "cytoscape";

import { type Backend, backendOf, gpuFor, type GpuMode, recording, warnIfFixable } from "./gpu.js";
import {
    coreOf,
    type CytoscapeSnapshot,
    indexOf,
    indicesOf,
    type NodeSelection,
    type SnapshotOptions,
    toSnapshot,
    writeData,
} from "./snapshot.js";

/** A node or edge as a result accessor takes it: the element, or a selector whose first match is used. */
export type ElementRef = string | Collection | NodeCollection | EdgeCollection;

/** Options every "graphty*" algorithm takes. */
export interface AlgorithmOptions {
    /** Read the edges as directed (source to target). Default false, except where an algorithm says otherwise. */
    readonly directed?: boolean;
    /** Edge data field holding the weight, or a function of the edge. Default: every edge weighs 1. */
    readonly weight?: SnapshotOptions["weight"];
    /** Write each element's value (what `score` or `cluster` returns) into `data(field)`. */
    readonly field?: string;
    /**
     * The `...Async` methods only: "auto" (default) runs on the GPU when the runtime has a usable WebGPU device,
     * "off" runs on the CPU, "require" throws instead of running on the CPU when no device is available. The synchronous methods always run on the CPU and reject "require".
     */
    readonly gpu?: GpuMode;
}

/** Per-element values, keyed by element. */
export interface ScoreResult {
    /** The value of an element of the collection; undefined for one outside it. */
    score(ele: ElementRef): number | undefined;
}

/** A partition: an array of node collections, one per cluster, plus each node's cluster number. */
export type Partition<T = object> = NodeCollection[] &
    T & {
        /** The cluster number (its position in the array) of a node; undefined for one outside the collection. */
        cluster(node: ElementRef): number | undefined;
    };

/** Paths from one root, in the shape of Cytoscape's `dijkstra`. */
export interface PathsResult {
    /** Distance from the root; Infinity when unreachable. */
    distanceTo(node: ElementRef): number;
    /** The path from the root, alternating node, edge, node; empty when unreachable. */
    pathTo(node: ElementRef): CollectionReturnValue;
}

/** A walk from one root, in the shape of Cytoscape's `bfs` / `dfs`. */
export interface SearchResult {
    /** The visited nodes in visit order, each after the tree edge that reached it. */
    readonly path: CollectionReturnValue;
    /** The `goal` node when it was reached, else empty. */
    readonly found: CollectionReturnValue;
    /** Hops from the root; undefined when not visited. */
    depth(node: ElementRef): number | undefined;
    /** The node this one was reached from; undefined for the root and unvisited nodes. */
    parent(node: ElementRef): NodeSingular | undefined;
}

/** One path between two nodes, in the shape of Cytoscape's `aStar`. */
export interface PointPathResult {
    readonly found: boolean;
    readonly distance: number;
    /** Alternating node, edge, node; empty when not found. */
    readonly path: CollectionReturnValue;
}

/** A cut, in the shape of Cytoscape's `kargerStein`. */
export interface CutResult {
    /** The total weight (capacity) of the cut edges. */
    readonly value: number;
    readonly cut: EdgeCollection;
    readonly partitionFirst: NodeCollection;
    readonly partitionSecond: NodeCollection;
}

/** A predicted link. */
export interface PredictedLink {
    readonly source: NodeSingular;
    readonly target: NodeSingular;
    readonly score: number;
}

/** A pair of nodes, each a selector or a collection. */
export type NodePair = readonly [NodeSelection, NodeSelection];

/** Held-out edges and non-edges for the link-prediction evaluations. */
interface EvaluateOptions extends AlgorithmOptions {
    /** Node pairs that are edges (held out of the graph), which a good score ranks high. */
    readonly edges: readonly NodePair[];
    /** Node pairs that are not edges, which a good score ranks low. */
    readonly nonEdges: readonly NodePair[];
}

/** What every algorithm implementation gets. */
interface Ctx {
    readonly name: string;
    readonly cy: Core;
    readonly cs: CytoscapeSnapshot;
    readonly s: GraphSnapshot;
    readonly field: string | undefined;
    /** `weighted` for the algorithms that read the snapshot's weights only when asked. */
    readonly weighted: boolean;
    /** The caller's options without the adapter's own, over this package's pinned defaults (see DEFAULTS). */
    readonly rest: Record<string, unknown>;
    /**
     * Runs one of the algorithms the GPU can answer: synchronously on the CPU for the plain methods, through the
     * dispatcher of `@graphty/algorithms` (GPU or CPU, a promise) for the `...Async` methods.
     */
    call<K extends GpuKey>(key: K, ...args: Parameters<Dispatch[K]>): Out<K> | Promise<Out<K>>;
}

/** The @graphty/algorithms dispatcher's methods: the ones an accelerator can answer, by the dispatcher's names. */
type Dispatch = Omit<AcceleratedAlgorithms, "accelerator">;
type Out<K extends keyof Dispatch> = Awaited<ReturnType<Dispatch[K]>>;

/**
 * The CPU functions behind the dispatcher methods the WebGPU accelerator implements (its `createAccelerator`
 * list), under the dispatcher's names. The plain methods call these directly, so they stay synchronous.
 */
const CPU = {
    breadthFirstSearch,
    sssp: dijkstra,
    bellmanFord,
    allPairsShortestPath,
    pageRank,
    personalizedPageRank,
    eigenvectorCentrality,
    katzCentrality,
    hits,
    closenessCentrality,
    betweennessCentrality,
    edgeBetweennessCentrality,
    connectedComponents,
    weaklyConnectedComponents,
    triangleCount,
    labelPropagation,
    labelPropagationSynchronous,
} satisfies Partial<{ [K in keyof Dispatch]: (...args: Parameters<Dispatch[K]>) => Out<K> }>;

type GpuKey = keyof typeof CPU;

/**
 * Applies a function to a value that is either plain (a CPU run) or a promise (a dispatcher run).
 * @param x - the value or its promise
 * @param f - the function
 * @returns f(x), or its promise
 */
function then<T, U>(x: T | Promise<T>, f: (t: T) => U): U | Promise<U> {
    return x instanceof Promise ? x.then(f) : f(x);
}

// Options the adapter consumes and converts; everything else passes through to the algorithm.
const ADAPTER_KEYS = new Set([
    "gpu",
    "directed",
    "weight",
    "field",
    "root",
    "goal",
    "target",
    "source",
    "sink",
    "heuristic",
    "personalization",
    "seeds",
    "left",
    "right",
    "clusters",
    "pairs",
    "edges",
    "nonEdges",
    "nodeMatch",
    "edgeMatch",
    "priority",
    "candidates",
    "sources",
    "alive",
    "startVector",
    "initialRanks",
]);

// Algorithms that read no weights: a `weight` option would be silently ignored, so it throws.
const UNWEIGHTED = new Set([
    "breadthFirstSearch",
    "directionOptimizedBfs",
    "depthFirstSearch",
    "hasCycle",
    "topologicalSort",
    "degreeCentrality",
    "degrees",
    "eigenvectorCentrality",
    "betweennessCentrality",
    "edgeBetweennessCentrality",
    "connectedComponents",
    "weaklyConnectedComponents",
    "stronglyConnectedComponents",
    "condensation",
    "kCoreDecomposition",
    "triangleCount",
    "isBipartite",
    "isGraphIsomorphic",
    "findAllIsomorphisms",
    "hierarchicalClustering",
    "teraHAC",
    "syncClustering",
    "maximumBipartiteMatching",
    "greedyBipartiteMatching",
    "commonNeighborsScore",
    "adamicAdarScore",
    "commonNeighborsPrediction",
    "adamicAdarPrediction",
    "commonNeighborsForPairs",
    "adamicAdarForPairs",
    "topCandidatesForNode",
    "topAdamicAdarCandidatesForNode",
    "evaluateCommonNeighbors",
    "evaluateAdamicAdar",
    "compareAdamicAdarWithCommonNeighbors",
]);

// This package's own defaults, passed explicitly to @graphty/algorithms (and through it to the GPU), so a change of
// a library default does not change what a Cytoscape user gets. The README's "Defaults" table lists them; a caller's
// option overrides them. `weighted` is pinned separately: it is true exactly when the caller passed `weight`.
const POWER = { maxIterations: 100, tolerance: 1e-6 } as const;
const PAGERANK = { ...POWER, dampingFactor: 0.85 } as const;
export const DEFAULTS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
    pageRank: PAGERANK,
    personalizedPageRank: PAGERANK,
    deltaPageRank: PAGERANK,
    eigenvectorCentrality: POWER,
    hits: POWER,
    katzCentrality: { ...POWER, alpha: 0.1, beta: 1 },
    labelPropagation: { maxIterations: 100 },
    labelPropagationSynchronous: { maxIterations: 100 },
    labelPropagationSemiSupervised: { maxIterations: 100 },
};

// Algorithms defined only for directed graphs: `directed` defaults to true.
export const DIRECTED: ReadonlySet<string> = new Set([
    "topologicalSort",
    "stronglyConnectedComponents",
    "condensation",
    "deltaPageRank",
]);

// ---------------------------------------------------------------------------------------------------------------
// Conversions between elements and indices

/**
 * A collection of elements, in the given order. Cytoscape accepts an element array at run time; its typings declare
 * only element definitions, hence the cast.
 * @param c - the context
 * @param eles - the elements
 * @returns the collection
 */
function collect(c: Ctx, eles: readonly (NodeSingular | EdgeSingular)[]): CollectionReturnValue {
    return c.cy.collection(eles as unknown as CollectionArgument);
}

/**
 * The index of a required node option.
 * @param c - the context
 * @param sel - the option value
 * @param what - the option name
 * @returns the node index
 */
function req(c: Ctx, sel: NodeSelection | undefined, what: string): number {
    const i = indexOf(c.cs, sel, `${c.name}: ${what}`);
    if (i === undefined) {
        throw new Error(`${c.name}: the ${what} option is required`);
    }
    return i;
}

/**
 * The index of a node or edge reference, or undefined when it is not in the snapshot.
 * @param c - the context
 * @param ref - an element or a selector
 * @param edges - look among the edges instead of the nodes
 * @returns the index
 */
function lookup(c: Ctx, ref: ElementRef, edges = false): number | undefined {
    const list = (edges ? c.cs.edges : c.cs.nodes) as unknown as Collection;
    const ele = typeof ref === "string" ? list.filter(ref)[0] : (ref as Collection)[0];
    if (ele === undefined) {
        return undefined;
    }
    if (!edges) {
        const i = c.s.ids.indexOf(ele.id());
        return i === INVALID_INDEX ? undefined : i;
    }
    // ponytail: linear scan per edge lookup; an id -> index map if edge accessors show up in a profile.
    const i = c.cs.edges.toArray().indexOf(ele as EdgeSingular);
    return i < 0 ? undefined : i;
}

/**
 * An accessor from element to value.
 * @param c - the context
 * @param values - one value per node (or edge) index
 * @param edges - the values are per edge
 * @returns the accessor
 */
function accessor(c: Ctx, values: ArrayLike<number>, edges = false): (ref: ElementRef) => number | undefined {
    return (ref) => {
        const i = lookup(c, ref, edges);
        return i === undefined ? undefined : values[i];
    };
}

/**
 * The nodes at some indices, as a collection in that order.
 * @param c - the context
 * @param idx - node indices
 * @returns the collection
 */
function nodesAt(c: Ctx, idx: ArrayLike<number>): NodeCollection {
    return collect(
        c,
        Array.from(idx, (i) => c.cs.nodes[i]),
    ) as unknown as NodeCollection;
}

/**
 * The edges at some indices, as a collection in that order.
 * @param c - the context
 * @param idx - edge indices
 * @returns the collection
 */
function edgesAt(c: Ctx, idx: ArrayLike<number>): EdgeCollection {
    return collect(
        c,
        Array.from(idx, (i) => c.cs.edges[i]),
    ) as unknown as EdgeCollection;
}

/**
 * A path as Cytoscape's path algorithms return it: node, edge, node, ...
 * @param c - the context
 * @param nodes - node indices along the path
 * @param edges - edge indices along the path, one fewer
 * @returns the collection
 */
function pathOf(c: Ctx, nodes: ArrayLike<number>, edges: ArrayLike<number>): CollectionReturnValue {
    const out: (NodeSingular | EdgeSingular)[] = [];
    for (let k = 0; k < nodes.length; k++) {
        if (k > 0) {
            out.push(c.cs.edges[edges[k - 1]]);
        }
        out.push(c.cs.nodes[nodes[k]]);
    }
    return collect(c, out);
}

/**
 * The node indices of each selection in a list.
 * @param c - the context
 * @param pairs - node pairs
 * @param what - the option name
 * @returns the sources and targets
 */
function pairsOf(
    c: Ctx,
    pairs: readonly NodePair[] | undefined,
    what: string,
): { sources: number[]; targets: number[] } {
    if (pairs === undefined) {
        throw new Error(`${c.name}: the ${what} option is required`);
    }
    return { sources: pairs.map((p) => req(c, p[0], what)), targets: pairs.map((p) => req(c, p[1], what)) };
}

/**
 * A node mask of a selection.
 * @param c - the context
 * @param sel - a selection, or undefined
 * @returns the mask, or undefined
 */
function maskOf(c: Ctx, sel: NodeSelection | undefined): U32 | undefined {
    if (sel === undefined) {
        return undefined;
    }
    const m = makeMask(c.s.nodeCount);
    for (const i of indicesOf(c.cs, sel)) {
        maskSet(m, i, true);
    }
    return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Result builders

/**
 * A score result: `score(ele)` plus extras; writes `field`.
 * @param c - the context
 * @param values - one value per node (or edge) index
 * @param extra - other fields of the result
 * @param edges - the values are per edge
 * @returns the result
 */
function scored<T extends object>(c: Ctx, values: ArrayLike<number>, extra: T, edges = false): ScoreResult & T {
    if (c.field !== undefined) {
        writeData(edges ? c.cs.edges : c.cs.nodes, values, c.field);
    }
    return { score: accessor(c, values, edges), ...extra };
}

/**
 * A partition: one node collection per label, with `cluster(node)` and extras; writes `field`.
 * @param c - the context
 * @param labels - the label of every node index, 0..count-1 (INVALID_INDEX: in no cluster)
 * @param extra - other fields of the result
 * @returns the partition
 */
function partition<T extends object>(c: Ctx, labels: ArrayLike<number>, extra: T): Partition<T> {
    const groups: number[][] = [];
    for (let i = 0; i < labels.length; i++) {
        const l = labels[i];
        if (l !== INVALID_INDEX) {
            (groups[l] ??= []).push(i);
        }
    }
    if (c.field !== undefined) {
        writeData(c.cs.nodes, labels, c.field);
    }
    const out = Array.from(groups, (g) => nodesAt(c, g ?? []));
    return Object.assign(out, extra, {
        cluster: (ref: ElementRef) => {
            const i = lookup(c, ref);
            return i === undefined || labels[i] === INVALID_INDEX ? undefined : labels[i];
        },
    });
}

/**
 * A walk result (BFS, DFS).
 * @param c - the context
 * @param r - the walk
 * @param r.order - visited node indices in visit order
 * @param r.parent - parent node index per node
 * @param r.depth - depth per node
 * @param r.visitedCount - number of visited nodes
 * @param target - the target index, if any
 * @returns the search result
 */
function search(
    c: Ctx,
    r: { order: Uint32Array; parent: Uint32Array; depth: Uint32Array; visitedCount: number },
    target: number | undefined,
): SearchResult {
    const out: (NodeSingular | EdgeSingular)[] = [];
    for (let k = 0; k < r.visitedCount; k++) {
        const v = r.order[k];
        const p = r.parent[v];
        if (p !== INVALID_INDEX) {
            // The walk records the parent node, not the arc, so the tree edge is looked up: the first edge of the
            // collection joining the two (CPU BFS/DFS results have no `predArc`, unlike Dijkstra's).
            const from = c.cs.nodes[p];
            const to = c.cs.nodes[v];
            const joining = c.s.directed ? from.edgesTo(to) : from.edgesWith(to);
            const e = joining.intersection(c.cs.edges)[0];
            if (e !== undefined) {
                out.push(e);
            }
        }
        out.push(c.cs.nodes[v]);
    }
    const reached = target !== undefined && r.depth[target] !== INVALID_INDEX;
    if (c.field !== undefined) {
        writeData(
            c.cs.nodes,
            Array.from(r.depth, (d) => (d === INVALID_INDEX ? NaN : d)),
            c.field,
        );
    }
    return {
        path: collect(c, out),
        found: collect(c, reached ? [c.cs.nodes[target]] : []),
        depth: (ref) => {
            const i = lookup(c, ref);
            return i === undefined || r.depth[i] === INVALID_INDEX ? undefined : r.depth[i];
        },
        parent: (ref) => {
            const i = lookup(c, ref);
            return i === undefined || r.parent[i] === INVALID_INDEX ? undefined : c.cs.nodes[r.parent[i]];
        },
    };
}

/**
 * A single-source shortest-path result.
 * @param c - the context
 * @param r - the result
 * @param r.dist - distance per node
 * @param r.pathTo - node path to a target
 * @param r.pathEdges - edge path to a target
 * @returns the accessors
 */
function paths(
    c: Ctx,
    r: { dist: ArrayLike<number>; pathTo(t: number): Uint32Array; pathEdges(t: number): Uint32Array },
): PathsResult {
    if (c.field !== undefined) {
        writeData(c.cs.nodes, r.dist, c.field);
    }
    return {
        distanceTo: (ref) => {
            const i = lookup(c, ref);
            return i === undefined ? Infinity : r.dist[i];
        },
        pathTo: (ref) => {
            const i = lookup(c, ref);
            return i === undefined ? c.cy.collection() : pathOf(c, r.pathTo(i), r.pathEdges(i));
        },
    };
}

/**
 * A cut result.
 * @param c - the context
 * @param side - the first side as a node mask
 * @param cutEdges - the cut edge indices
 * @param value - the cut's weight
 * @returns the cut
 */
function cutOf(c: Ctx, side: U32, cutEdges: ArrayLike<number>, value: number): CutResult {
    const first: number[] = [];
    const second: number[] = [];
    for (let i = 0; i < c.s.nodeCount; i++) {
        (maskTest(side, i) ? first : second).push(i);
    }
    if (c.field !== undefined) {
        writeData(
            c.cs.nodes,
            Array.from({ length: c.s.nodeCount }, (_, i) => (maskTest(side, i) ? 0 : 1)),
            c.field,
        );
    }
    return { value, cut: edgesAt(c, cutEdges), partitionFirst: nodesAt(c, first), partitionSecond: nodesAt(c, second) };
}

/**
 * A minimum cut result.
 * @param c - the context
 * @param r - the cut
 * @returns the cut
 */
function minCut(c: Ctx, r: MinCutResult): CutResult {
    return cutOf(c, r.side, r.cutEdges, r.cutValue);
}

/**
 * Predicted links with their nodes.
 * @param c - the context
 * @param r - the prediction
 * @returns one entry per predicted pair, best first
 */
function links(c: Ctx, r: LinkPredictionResult): PredictedLink[] {
    return Array.from(r.scores, (score, k) => ({
        source: c.cs.nodes[r.sources[k]],
        target: c.cs.nodes[r.targets[k]],
        score,
    }));
}

/**
 * A node-to-node mapping accessor.
 * @param c - the context
 * @param other - the image collection's snapshot
 * @param mapping - image index per node index
 * @returns the accessor
 */
function mapper(
    c: Ctx,
    other: CytoscapeSnapshot,
    mapping: Uint32Array,
): (node: ElementRef) => NodeSingular | undefined {
    return (ref) => {
        const i = lookup(c, ref);
        return i === undefined ? undefined : other.nodes[mapping[i]];
    };
}

/**
 * The two-snapshot isomorphism options, with element callbacks turned into index callbacks.
 * @param c - the context
 * @param other - the second graph
 * @param o - the options
 * @returns the options for @graphty/algorithms
 */
function isoOptions(c: Ctx, other: CytoscapeSnapshot, o: IsomorphismOptions): Record<string, unknown> {
    const { nodeMatch, edgeMatch } = o;
    return {
        ...c.rest,
        nodeMatch: nodeMatch && ((a: number, b: number) => nodeMatch(c.cs.nodes[a], other.nodes[b])),
        edgeMatch: edgeMatch && ((a: number, b: number) => edgeMatch(c.cs.edges[a], other.edges[b])),
    };
}

/**
 * The snapshot of the second graph of an isomorphism test, read like the first.
 * @param c - the context
 * @param o - the options naming it
 * @returns its snapshot
 */
function otherOf(c: Ctx, o: IsomorphismOptions): CytoscapeSnapshot {
    if (o.other === undefined) {
        throw new Error(`${c.name}: the other option (the collection to compare with) is required`);
    }
    return toSnapshot(o.other, { directed: c.s.directed });
}

/**
 * A per-node vector from a function of the node or a selection (1 for selected nodes, 0 for the rest).
 * @param c - the context
 * @param v - the function or selection
 * @param what - the option name
 * @returns the vector
 */
function vectorOf(c: Ctx, v: NodeSelection | ((node: NodeSingular) => number) | undefined, what: string): F64 {
    if (v === undefined) {
        throw new Error(`${c.name}: the ${what} option is required`);
    }
    if (typeof v === "function") {
        return Float64Array.from(c.cs.nodes.toArray(), (n) => v(n));
    }
    const out = new Float64Array(c.s.nodeCount);
    for (const i of indicesOf(c.cs, v)) {
        out[i] = 1;
    }
    return out;
}

/**
 * Labels per node from a list of clusters or a node data field.
 * @param c - the context
 * @param clusters - the clusters, or the data field holding each node's cluster
 * @returns label per node index (INVALID_INDEX: none)
 */
function labelsOf(c: Ctx, clusters: string | readonly NodeSelection[] | undefined): U32 {
    if (clusters === undefined) {
        throw new Error(`${c.name}: the clusters option is required`);
    }
    const labels = new Uint32Array(c.s.nodeCount).fill(INVALID_INDEX);
    if (typeof clusters === "string") {
        const ids = new Map<unknown, number>();
        c.cs.nodes.forEach((n, i) => {
            const v: unknown = n.data(clusters);
            if (v !== undefined) {
                labels[i] = ids.get(v) ?? ids.set(v, ids.size).size - 1;
            }
        });
    } else {
        clusters.forEach((sel, k) => {
            for (const i of indicesOf(c.cs, sel)) {
                labels[i] = k;
            }
        });
    }
    return labels;
}

/** The all-pairs result. */
interface ApspResult {
    distance(from: ElementRef, to: ElementRef): number;
    /** The path; throws when the run was made with `paths: false`. */
    path(from: ElementRef, to: ElementRef): CollectionReturnValue;
    readonly hasNegativeWeightCycle: boolean;
}

/**
 * The all-pairs accessors.
 * @param c - the context
 * @param r - the distance matrix, with the path walkers when it was run with `paths: true`
 * @returns the accessors
 */
function apsp(
    c: Ctx,
    r: Out<"allPairsShortestPath"> & {
        pathTo?: (i: number, j: number) => Uint32Array;
        pathEdges?: (i: number, j: number) => Uint32Array;
    },
): ApspResult {
    const pair = (a: ElementRef, b: ElementRef): [number, number] | undefined => {
        const i = lookup(c, a);
        const j = lookup(c, b);
        return i === undefined || j === undefined ? undefined : [i, j];
    };
    return {
        hasNegativeWeightCycle: r.hasNegativeCycle,
        distance: (a, b) => {
            const p = pair(a, b);
            return p === undefined ? Infinity : r.dist[p[0] * r.n + p[1]];
        },
        path: (a, b) => {
            const { pathTo, pathEdges } = r;
            if (pathTo === undefined || pathEdges === undefined) {
                throw new Error(`${c.name}: path() needs the paths: true option (the default)`);
            }
            const p = pair(a, b);
            return p === undefined ? c.cy.collection() : pathOf(c, pathTo(p[0], p[1]), pathEdges(p[0], p[1]));
        },
    };
}

/** A PageRank result. */
type RankResult = ScoreResult & { rank(node: ElementRef): number | undefined; iterations: number; converged: boolean };

/**
 * A PageRank result from scores.
 * @param c - the context
 * @param r - the run
 * @returns the result
 */
function ranked(c: Ctx, r: Out<"pageRank">): RankResult {
    return scored(c, r.scores, { rank: accessor(c, r.scores), iterations: r.iterations, converged: r.converged });
}

/**
 * A label-propagation partition. The GPU result has no `iterations` / `converged` (the WebGPU label propagation
 * does not report them), so both are undefined when the GPU ran.
 * @param c - the context
 * @param r - the run
 * @returns the partition
 */
function propagated(
    c: Ctx,
    r: Out<"labelPropagation"> & { iterations?: number; converged?: boolean },
): Partition<LpaReport> {
    return partition(c, r.labels, { iterations: r.iterations, converged: r.converged });
}

/** What label propagation reports beside the partition; undefined when the GPU ran. */
interface LpaReport {
    iterations: number | undefined;
    converged: boolean | undefined;
}

/** A result that is plain from a plain method and a promise from an `...Async` method. */
type MaybeAsync<T> = T | Promise<T>;

// ---------------------------------------------------------------------------------------------------------------
// Option types

interface Rooted extends AlgorithmOptions {
    /** The start node: a selector or a collection (its first node). */
    readonly root: NodeSelection;
}

interface PointToPoint extends Rooted {
    /** The node to reach. */
    readonly goal: NodeSelection;
}

interface WalkOptions extends Rooted {
    /** Stop when this node is reached; it is then `found`. */
    readonly goal?: NodeSelection;
    /** Stop expanding at this many hops from the root; unbounded when absent. */
    readonly maxDepth?: number;
}

interface FlowOptions extends AlgorithmOptions, Omit<MaxFlowOptions, "weights"> {
    /** The node the flow leaves. */
    readonly source: NodeSelection;
    /** The node the flow arrives at. */
    readonly sink: NodeSelection;
}

interface IsomorphismOptions extends AlgorithmOptions {
    /** The collection to compare with, read with the same `directed`. */
    readonly other?: Collection;
    /** Two nodes may be paired only when this returns true; by default any two may. */
    readonly nodeMatch?: (a: NodeSingular, b: NodeSingular) => boolean;
    /** Two edges may be paired only when this returns true; by default any two may. */
    readonly edgeMatch?: (a: EdgeSingular, b: EdgeSingular) => boolean;
}

interface MatchingOptions extends AlgorithmOptions {
    /** One side of the bipartite graph; inferred when absent. */
    readonly left?: NodeSelection;
    /** The other side; inferred when absent. */
    readonly right?: NodeSelection;
    /** With `directed`: "both" (default) ignores direction; "out" joins a left node only to its out-neighbours. */
    readonly arcs?: "both" | "out";
}

/** A cap on path length. */
interface Cutoff {
    /** Stop relaxing beyond this distance; a node farther away reads as unreachable. Unbounded when absent. */
    readonly cutoff?: number;
}

/** Sampled centrality. */
interface Sampled {
    /** Sampled: the nodes to run from, a selector or a collection; default every node. */
    readonly sources?: NodeSelection;
}

/** One node pair. */
interface PairOptions {
    /** One node of the pair. */
    readonly source: NodeSelection;
    /** The other node of the pair. */
    readonly target: NodeSelection;
}

/** Several node pairs. */
interface PairsOptions {
    /** The node pairs to score, each `[a, b]` of selectors or collections. */
    readonly pairs: readonly NodePair[];
}

/** The nodes link prediction may propose. */
interface Candidates {
    /** The nodes to consider linking to `root`; default every node. */
    readonly candidates?: NodeSelection;
}

interface MatchingResult {
    readonly size: number;
    /** The node matched with this one, either side. */
    mate(node: ElementRef): NodeSingular | undefined;
}

type WeightedFlag<T> = AlgorithmOptions & Omit<T, "weighted" | "weights">;

/**
 * A matching result.
 * @param c - the context
 * @param r - the matching
 * @param r.matching - partner per node index
 * @param r.size - matched pairs
 * @returns mate accessor and size
 */
function matched(c: Ctx, r: { matching: Uint32Array; size: number }): MatchingResult {
    const mate = new Uint32Array(c.s.nodeCount).fill(INVALID_INDEX);
    r.matching.forEach((m, i) => {
        if (m !== INVALID_INDEX) {
            mate[i] = m;
            mate[m] = i;
        }
    });
    return {
        size: r.size,
        mate: (ref) => {
            const i = lookup(c, ref);
            return i === undefined || mate[i] === INVALID_INDEX ? undefined : c.cs.nodes[mate[i]];
        },
    };
}

/**
 * The best level of a Girvan-Newman run.
 * @param modularities - modularity per level
 * @returns the level index with the highest modularity
 */
function bestLevel(modularities: ArrayLike<number>): number {
    let best = 0;
    for (let k = 1; k < modularities.length; k++) {
        if (modularities[k] > modularities[best]) {
            best = k;
        }
    }
    return best;
}

// ---------------------------------------------------------------------------------------------------------------
// The algorithms. Key = the @graphty/algorithms name; registered as "graphty" + the key with a capital.

const IMPLS = {
    // Traversal and paths
    breadthFirstSearch: (c: Ctx, o: WalkOptions): MaybeAsync<SearchResult> => {
        const target = indexOf(c.cs, o.goal, `${c.name}: goal`);
        return then(c.call("breadthFirstSearch", c.s, req(c, o.root, "root"), { ...c.rest, target }), (r) =>
            search(c, r, target),
        );
    },
    directionOptimizedBfs: (c: Ctx, o: Rooted & DirectionOptimizedBfsOptions): SearchResult =>
        search(c, directionOptimizedBfs(c.s, req(c, o.root, "root"), c.rest), undefined),
    depthFirstSearch: (
        c: Ctx,
        o: Omit<WalkOptions, "maxDepth"> & {
            /** "pre" (default) lists a node when it is first reached, "post" when everything below it is finished. */
            readonly order?: "pre" | "post";
        },
    ): SearchResult => {
        const target = indexOf(c.cs, o.goal, `${c.name}: goal`);
        return search(c, depthFirstSearch(c.s, req(c, o.root, "root"), { ...c.rest, target }), target);
    },
    hasCycle: (c: Ctx, _o: AlgorithmOptions = {}): boolean => hasCycle(c.s),
    topologicalSort: (c: Ctx, _o: AlgorithmOptions = {}): NodeCollection | null => {
        const order = topologicalSort(c.s);
        return order === null ? null : nodesAt(c, order);
    },
    dijkstra: (c: Ctx, o: Rooted & Cutoff): PathsResult | Promise<PathsResult> =>
        then(c.call("sssp", c.s, req(c, o.root, "root"), c.rest), (r) => paths(c, r)),
    bellmanFord: (c: Ctx, o: Rooted & Cutoff): MaybeAsync<PathsResult & { readonly hasNegativeWeightCycle: boolean }> =>
        then(c.call("bellmanFord", c.s, req(c, o.root, "root"), c.rest), (r) => ({
            ...paths(c, r),
            hasNegativeWeightCycle: r.hasNegativeCycle,
        })),
    bidirectionalDijkstra: (c: Ctx, o: PointToPoint): PointPathResult => {
        const r = bidirectionalDijkstra(c.s, req(c, o.root, "root"), req(c, o.goal, "goal"), c.rest);
        return { found: r.path.length > 0, distance: r.distance, path: pathOf(c, r.path, r.edges) };
    },
    aStar: (
        c: Ctx,
        o: PointToPoint & {
            /** An estimate of the distance left from a node to `goal`, never more than the real one. Default 0. */
            readonly heuristic?: (node: NodeSingular) => number;
        },
    ): PointPathResult => {
        const h = o.heuristic;
        const r = astar(
            c.s,
            req(c, o.root, "root"),
            req(c, o.goal, "goal"),
            h === undefined ? () => 0 : (u) => h(c.cs.nodes[u]),
            c.rest,
        );
        return { found: r.path.length > 0, distance: r.distance, path: pathOf(c, r.path, r.edges) };
    },
    allPairsShortestPath: (
        c: Ctx,
        _o: AlgorithmOptions & Omit<ApspOptions, "weights" | "weighted"> = {},
    ): MaybeAsync<ApspResult> =>
        then(c.call("allPairsShortestPath", c.s, { paths: true, ...c.rest }), (r) => apsp(c, r)),

    // Centrality
    degreeCentrality: (
        c: Ctx,
        _o: AlgorithmOptions & DegreeCentralityOptions = {},
    ): ScoreResult & { degree(node: ElementRef): number | undefined } => {
        const v = degreeCentrality(c.s, c.rest);
        return scored(c, v, { degree: accessor(c, v) });
    },
    degrees: (
        c: Ctx,
        _o: AlgorithmOptions = {},
    ): { indegree(node: ElementRef): number | undefined; outdegree(node: ElementRef): number | undefined } => {
        const r = degrees(c.s);
        return { indegree: accessor(c, r.inDegree), outdegree: accessor(c, r.outDegree) };
    },
    pageRank: (
        c: Ctx,
        o: WeightedFlag<Omit<PageRankOptions, "initialRanks">> & {
            /** Starting rank of each node. */
            readonly initialRanks?: (node: NodeSingular) => number;
        } = {},
    ): MaybeAsync<RankResult> => {
        const initialRanks = o.initialRanks && vectorOf(c, o.initialRanks, "initialRanks");
        return then(c.call("pageRank", c.s, { ...c.rest, initialRanks, weighted: c.weighted }), (r) => ranked(c, r));
    },
    personalizedPageRank: (
        c: Ctx,
        o: WeightedFlag<Omit<PageRankOptions, "initialRanks">> & {
            /** The teleport set: a selection (uniform over it) or a weight per node. */
            readonly personalization: NodeSelection | ((node: NodeSingular) => number);
            /** Starting rank of each node. */
            readonly initialRanks?: (node: NodeSingular) => number;
        },
    ): MaybeAsync<RankResult> => {
        const p = vectorOf(c, o.personalization, "personalization");
        const initialRanks = o.initialRanks && vectorOf(c, o.initialRanks, "initialRanks");
        return then(c.call("personalizedPageRank", c.s, p, { ...c.rest, initialRanks, weighted: c.weighted }), (r) =>
            ranked(c, r),
        );
    },
    deltaPageRank: (
        c: Ctx,
        o: WeightedFlag<Omit<DeltaPageRankComputeOptions, "personalization">> & {
            /** Process the largest pending delta first (`PriorityDeltaPageRank`, which ignores `personalization`). */
            readonly priority?: boolean;
            /** The teleport set: a selection (uniform over it) or a weight per node. */
            readonly personalization?: NodeSelection | ((node: NodeSingular) => number);
        } = {},
    ): ScoreResult & { rank(node: ElementRef): number | undefined } => {
        // The engines keep state for `update()` over the same frozen snapshot; a changed Cytoscape graph is a new
        // snapshot, so only the one-shot computation is offered.
        const personalization =
            o.personalization === undefined ? undefined : vectorOf(c, o.personalization, "personalization");
        const opts = { ...c.rest, personalization, weighted: c.weighted };
        const v =
            o.priority === true
                ? new PriorityDeltaPageRank(c.s).computeWithPriority(opts)
                : new DeltaPageRank(c.s).compute(opts);
        return scored(c, v, { rank: accessor(c, v) });
    },
    eigenvectorCentrality: (
        c: Ctx,
        o: AlgorithmOptions &
            Omit<EigenvectorOptions, "startVector"> & {
                /** Starting value of each node; default uniform. */
                readonly startVector?: (node: NodeSingular) => number;
            } = {},
    ): MaybeAsync<ScoreResult & { iterations: number; converged: boolean }> => {
        const startVector = o.startVector && vectorOf(c, o.startVector, "startVector");
        return then(c.call("eigenvectorCentrality", c.s, { ...c.rest, startVector }), (r) =>
            scored(c, r.scores, { iterations: r.iterations, converged: r.converged }),
        );
    },
    katzCentrality: (
        c: Ctx,
        _o: WeightedFlag<KatzOptions> = {},
    ): MaybeAsync<ScoreResult & { iterations: number; converged: boolean }> =>
        then(c.call("katzCentrality", c.s, { ...c.rest, weighted: c.weighted }), (r) =>
            scored(c, r.scores, { iterations: r.iterations, converged: r.converged }),
        ),
    hits: (
        c: Ctx,
        _o: WeightedFlag<HitsOptions> = {},
    ): MaybeAsync<
        ScoreResult & {
            hub(node: ElementRef): number | undefined;
            authority(node: ElementRef): number | undefined;
            iterations: number;
            converged: boolean;
        }
    > =>
        then(c.call("hits", c.s, { ...c.rest, weighted: c.weighted }), (r) =>
            scored(c, r.authorities, {
                hub: accessor(c, r.hubs),
                authority: accessor(c, r.authorities),
                iterations: r.iterations,
                converged: r.converged,
            }),
        ),
    closenessCentrality: (
        c: Ctx,
        o: WeightedFlag<Omit<ClosenessOptions, "sources">> & Sampled = {},
    ): MaybeAsync<ScoreResult & { closeness(node: ElementRef): number | undefined }> => {
        const sources = o.sources === undefined ? undefined : indicesOf(c.cs, o.sources);
        return then(c.call("closenessCentrality", c.s, { ...c.rest, sources, weighted: c.weighted }), (r) =>
            scored(c, r.scores, { closeness: accessor(c, r.scores) }),
        );
    },
    nodeClosenessCentrality: (
        c: Ctx,
        o: Rooted & Omit<ClosenessOptions, "sources" | "k" | "weights" | "weighted">,
    ): number => nodeClosenessCentrality(c.s, req(c, o.root, "root"), { ...c.rest, weighted: c.weighted }),
    betweennessCentrality: (
        c: Ctx,
        o: AlgorithmOptions & Omit<BetweennessOptions, "sources"> & Sampled = {},
    ): MaybeAsync<
        ScoreResult & {
            betweenness(node: ElementRef): number | undefined;
            betweennessNormalized(node: ElementRef): number | undefined;
        }
    > => {
        const sources = o.sources === undefined ? undefined : indicesOf(c.cs, o.sources);
        return then(c.call("betweennessCentrality", c.s, { ...c.rest, sources }), (r) => {
            // Cytoscape's `betweenness` counts ordered pairs, so on an undirected graph it is twice the NetworkX
            // convention `score` follows. The result does not say which scale it is in, so the factor is rebuilt here
            // from the rules in @graphty/algorithms' BetweennessOptions.normalized.
            const n = c.s.nodeCount;
            const pairs = o.endpoints === true ? n * (n - 1) : (n - 1) * (n - 2);
            const unordered = c.s.directed ? 1 : 2;
            const toOrderedPairs = o.normalized === true && pairs > 0 ? pairs : unordered;
            const raw = Float64Array.from(r.scores, (x) => x * toOrderedPairs);
            const max = raw.reduce((m, x) => Math.max(m, x), 0);
            return scored(c, r.scores, {
                betweenness: accessor(c, raw),
                betweennessNormalized: accessor(
                    c,
                    raw.map((x) => (max === 0 ? 0 : x / max)),
                ),
            });
        });
    },
    edgeBetweennessCentrality: (
        c: Ctx,
        o: AlgorithmOptions &
            Sampled & {
                /** Divide by `(n - 1)(n - 2)` on a directed graph, half that on an undirected one. Default false. */
                readonly normalized?: boolean;
                /** Sampled: how many source nodes to draw (the same count draws the same nodes every time). */
                readonly k?: number;
            } = {},
    ): MaybeAsync<ScoreResult> => {
        const sources = o.sources === undefined ? undefined : indicesOf(c.cs, o.sources);
        return then(c.call("edgeBetweennessCentrality", c.s, { ...c.rest, sources }), (r) =>
            scored(c, r.scores, {}, true),
        );
    },

    // Components and structure
    connectedComponents: (c: Ctx, _o: AlgorithmOptions = {}): MaybeAsync<Partition> =>
        then(c.call("connectedComponents", c.s), (r) => partition(c, r.labels, {})),
    weaklyConnectedComponents: (c: Ctx, _o: AlgorithmOptions = {}): MaybeAsync<Partition> =>
        then(c.call("weaklyConnectedComponents", c.s), (r) => partition(c, r.labels, {})),
    stronglyConnectedComponents: (c: Ctx, _o: AlgorithmOptions = {}): Partition =>
        partition(c, stronglyConnectedComponents(c.s).labels, {}),
    condensation: (c: Ctx, _o: AlgorithmOptions = {}): Partition<{ condensed: DerivedGraph }> => {
        const r = condensation(c.s);
        return partition(c, r.components.labels, { condensed: r.condensed });
    },
    kCoreDecomposition: (
        c: Ctx,
        _o: AlgorithmOptions = {},
    ): ScoreResult & { maxCore: number; core(k: number): NodeCollection } => {
        const r = kCoreDecomposition(c.s);
        const core = (k: number): NodeCollection =>
            nodesAt(
                c,
                Array.from(r.coreness.keys()).filter((i) => r.coreness[i] >= k),
            );
        return scored(c, r.coreness, { maxCore: r.maxCore, core });
    },
    triangleCount: (
        c: Ctx,
        _o: AlgorithmOptions = {},
    ): MaybeAsync<
        ScoreResult & { coefficient(node: ElementRef): number | undefined; total: number; transitivity: number }
    > =>
        then(c.call("triangleCount", c.s), (r) =>
            scored(c, r.perNode, {
                coefficient: accessor(c, r.coefficient),
                total: r.total,
                transitivity: r.transitivity,
            }),
        ),
    isBipartite: (
        c: Ctx,
        _o: AlgorithmOptions & BipartiteOptions = {},
    ): { bipartite: boolean; partitionFirst: NodeCollection; partitionSecond: NodeCollection } => {
        const r = isBipartite(c.s, c.rest);
        if (r.sides === null) {
            const empty = c.cy.collection() as unknown as NodeCollection;
            return { bipartite: false, partitionFirst: empty, partitionSecond: empty };
        }
        const { partitionFirst, partitionSecond } = cutOf(c, r.sides, [], 0);
        return { bipartite: true, partitionFirst, partitionSecond };
    },
    isGraphIsomorphic: (
        c: Ctx,
        o: IsomorphismOptions,
    ): { isomorphic: boolean; mapping(node: ElementRef): NodeSingular | undefined } => {
        const other = otherOf(c, o);
        const r = isGraphIsomorphic(c.s, other.snapshot, isoOptions(c, other, o));
        const m = r.mapping;
        return { isomorphic: r.isomorphic, mapping: m === null ? () => undefined : mapper(c, other, m) };
    },
    findAllIsomorphisms: (c: Ctx, o: IsomorphismOptions): ((node: ElementRef) => NodeSingular | undefined)[] => {
        const other = otherOf(c, o);
        return findAllIsomorphisms(c.s, other.snapshot, isoOptions(c, other, o)).map((m) => mapper(c, other, m));
    },
    modularity: (
        c: Ctx,
        o: AlgorithmOptions &
            Omit<ModularityOptions, "weights"> & {
                /** The clusters (a partition result, or selections), or the node data field holding each node's cluster. */
                readonly clusters: string | readonly NodeSelection[];
            },
    ): number => modularity(c.s, labelsOf(c, o.clusters), c.rest),

    // Community detection and clustering
    louvain: (
        c: Ctx,
        _o: AlgorithmOptions & LouvainOptions = {},
    ): Partition<{ modularity: number; iterations: number }> => {
        const r = louvain(c.s, c.rest);
        return partition(c, r.labels, { modularity: r.modularity, iterations: r.iterations });
    },
    leiden: (
        c: Ctx,
        _o: AlgorithmOptions & LeidenOptions = {},
    ): Partition<{ modularity: number; iterations: number }> => {
        const r = leiden(c.s, c.rest);
        return partition(c, r.labels, { modularity: r.modularity, iterations: r.iterations });
    },
    labelPropagation: (c: Ctx, _o: WeightedFlag<LabelPropagationOptions> = {}): MaybeAsync<Partition<LpaReport>> =>
        then(c.call("labelPropagation", c.s, { ...c.rest, weighted: c.weighted }), (r) => propagated(c, r)),
    labelPropagationSynchronous: (
        c: Ctx,
        _o: AlgorithmOptions & {
            /** Iteration cap. */
            readonly maxIterations?: number;
        } = {},
    ): MaybeAsync<Partition<LpaReport>> =>
        then(c.call("labelPropagationSynchronous", c.s, { ...c.rest, weighted: c.weighted }), (r) => propagated(c, r)),
    labelPropagationSemiSupervised: (
        c: Ctx,
        o: WeightedFlag<LabelPropagationOptions> & {
            /** Seed labels: the node data field holding them (nodes without it are free), or one selection per label. */
            readonly seeds: string | readonly NodeSelection[];
        },
    ): Partition<{ iterations: number; converged: boolean }> => {
        const r = labelPropagationSemiSupervised(c.s, labelsOf(c, o.seeds), { ...c.rest, weighted: c.weighted });
        return partition(c, r.labels, { iterations: r.iterations, converged: r.converged });
    },
    girvanNewman: (
        c: Ctx,
        _o: AlgorithmOptions & GirvanNewmanOptions = {},
    ): Partition<{
        modularity: number;
        levels: number;
        level(k: number): NodeCollection[];
        modularities: number[];
    }> => {
        const r = girvanNewman(c.s, c.rest);
        const quiet: Ctx = { ...c, field: undefined };
        const level = (k: number): NodeCollection[] => [...partition(quiet, r.levels[k] ?? [], {})];
        const best = bestLevel(r.modularity);
        return partition(c, r.levels[best] ?? [], {
            modularity: r.modularity[best] ?? NaN,
            levels: r.levels.length,
            level,
            modularities: Array.from(r.modularity),
        });
    },
    markovClustering: (
        c: Ctx,
        _o: AlgorithmOptions & Omit<MarkovOptions, "weights"> = {},
    ): Partition<{ iterations: number; converged: boolean }> => {
        const r = markovClustering(c.s, c.rest);
        return partition(c, r.labels, { iterations: r.iterations, converged: r.converged });
    },
    spectralClustering: (
        c: Ctx,
        _o: AlgorithmOptions & Omit<SpectralOptions, "weights">,
    ): Partition<{ converged: boolean; eigenvalues: Float64Array }> => {
        const r = spectralClustering(c.s, c.rest as unknown as SpectralOptions);
        return partition(c, r.labels, { converged: r.converged, eigenvalues: r.eigenvalues });
    },
    hierarchicalClustering: (
        c: Ctx,
        _o: AlgorithmOptions & HierarchicalOptions = {},
    ): { cut(height: number): NodeCollection[]; readonly merges: number } => {
        const r = hierarchicalClustering(c.s, c.rest);
        return { merges: r.left.length, cut: (h) => r.cut(h).map((g) => nodesAt(c, g)) };
    },
    teraHAC: (c: Ctx, _o: AlgorithmOptions & TeraHacOptions = {}): Partition<{ merges: number }> => {
        const r = teraHAC(c.s, c.rest);
        return partition(c, r.labels, { merges: r.merges });
    },
    grsbm: (c: Ctx, _o: WeightedFlag<GrsbmOptions> = {}): Partition =>
        partition(c, grsbm(c.s, { ...c.rest, weighted: c.weighted }).labels, {}),
    syncClustering: (
        c: Ctx,
        _o: AlgorithmOptions & SyncClusteringOptions,
    ): Partition<{ loss: number; iterations: number; converged: boolean }> => {
        const r = syncClustering(c.s, c.rest as unknown as SyncClusteringOptions);
        return partition(c, r.labels, { loss: r.loss, iterations: r.iterations, converged: r.converged });
    },

    // Spanning trees, flow, cuts, matching
    kruskalMST: (c: Ctx, _o: AlgorithmOptions = {}): CollectionReturnValue & { totalWeight: number } => {
        const r = kruskalMST(c.s);
        return Object.assign(c.cs.nodes.union(edgesAt(c, r.edges)), { totalWeight: r.totalWeight });
    },
    primMST: (
        c: Ctx,
        o: AlgorithmOptions & {
            /** The node the tree grows from; default the first node. */
            readonly root?: NodeSelection;
            /** Grow a tree in every component instead of throwing on a disconnected graph. Default false. */
            readonly forest?: boolean;
        } = {},
    ): CollectionReturnValue & { totalWeight: number } => {
        const start = indexOf(c.cs, o.root, `${c.name}: root`);
        const r = primMST(c.s, { ...c.rest, start });
        const tree = nodesAt(c, Array.from(r.edges, (e) => [c.s.edgeSource(e), c.s.edgeTarget(e)]).flat());
        const nodes = r.edges.length === 0 && start !== undefined ? nodesAt(c, [start]) : tree;
        return Object.assign(nodes.union(edgesAt(c, r.edges)), { totalWeight: r.totalWeight });
    },
    maxFlow: (c: Ctx, o: FlowOptions): CutResult & { flow(edge: ElementRef): number | undefined } => {
        const r = maxFlow(c.s, req(c, o.source, "source"), req(c, o.sink, "sink"), c.rest);
        return { ...cutOf(c, r.sourceSide, r.cutEdges, r.maxFlow), flow: accessor(c, r.flow, true) };
    },
    minSTCut: (c: Ctx, o: FlowOptions): CutResult =>
        minCut(c, minSTCut(c.s, req(c, o.source, "source"), req(c, o.sink, "sink"), c.rest)),
    stoerWagner: (c: Ctx, _o: AlgorithmOptions = {}): CutResult => minCut(c, stoerWagner(c.s)),
    kargerMinCut: (c: Ctx, _o: AlgorithmOptions & Omit<KargerOptions, "weights"> = {}): CutResult =>
        minCut(c, kargerMinCut(c.s, c.rest)),
    maximumBipartiteMatching: (c: Ctx, o: MatchingOptions = {}): MatchingResult =>
        matched(c, maximumBipartiteMatching(c.s, { ...c.rest, left: maskOf(c, o.left), right: maskOf(c, o.right) })),
    greedyBipartiteMatching: (c: Ctx, o: MatchingOptions = {}): MatchingResult =>
        matched(c, greedyBipartiteMatching(c.s, { ...c.rest, left: maskOf(c, o.left), right: maskOf(c, o.right) })),

    // Link prediction. `directed` also selects the directed score (out-neighbours of u against in-neighbours of v).
    commonNeighborsScore: (c: Ctx, o: AlgorithmOptions & PairOptions): number =>
        commonNeighborsScore(c.s, req(c, o.source, "source"), req(c, o.target, "target"), { directed: c.s.directed }),
    adamicAdarScore: (c: Ctx, o: AlgorithmOptions & PairOptions): number =>
        adamicAdarScore(c.s, req(c, o.source, "source"), req(c, o.target, "target"), { directed: c.s.directed }),
    commonNeighborsPrediction: (
        c: Ctx,
        _o: AlgorithmOptions & Omit<LinkPredictionOptions, "directed"> = {},
    ): PredictedLink[] => links(c, commonNeighborsPrediction(c.s, { ...c.rest, directed: c.s.directed })),
    adamicAdarPrediction: (
        c: Ctx,
        _o: AlgorithmOptions & Omit<LinkPredictionOptions, "directed"> = {},
    ): PredictedLink[] => links(c, adamicAdarPrediction(c.s, { ...c.rest, directed: c.s.directed })),
    commonNeighborsForPairs: (c: Ctx, o: AlgorithmOptions & PairsOptions): number[] =>
        Array.from(commonNeighborsForPairs(c.s, pairsOf(c, o.pairs, "pairs"), { directed: c.s.directed })),
    adamicAdarForPairs: (c: Ctx, o: AlgorithmOptions & PairsOptions): number[] =>
        Array.from(adamicAdarForPairs(c.s, pairsOf(c, o.pairs, "pairs"), { directed: c.s.directed })),
    topCandidatesForNode: (
        c: Ctx,
        o: Rooted & Omit<CandidateOptions, "directed" | "candidates"> & Candidates,
    ): PredictedLink[] => {
        const candidates = o.candidates === undefined ? undefined : indicesOf(c.cs, o.candidates);
        return links(
            c,
            getTopCandidatesForNode(c.s, req(c, o.root, "root"), { ...c.rest, candidates, directed: c.s.directed }),
        );
    },
    topAdamicAdarCandidatesForNode: (
        c: Ctx,
        o: Rooted & Omit<CandidateOptions, "directed" | "candidates"> & Candidates,
    ): PredictedLink[] => {
        const candidates = o.candidates === undefined ? undefined : indicesOf(c.cs, o.candidates);
        return links(
            c,
            getTopAdamicAdarCandidatesForNode(c.s, req(c, o.root, "root"), {
                ...c.rest,
                candidates,
                directed: c.s.directed,
            }),
        );
    },
    evaluateCommonNeighbors: (c: Ctx, o: EvaluateOptions): LinkPredictionMetrics =>
        evaluateCommonNeighbors(c.s, pairsOf(c, o.edges, "edges"), pairsOf(c, o.nonEdges, "nonEdges"), {
            directed: c.s.directed,
        }),
    evaluateAdamicAdar: (c: Ctx, o: EvaluateOptions): LinkPredictionMetrics =>
        evaluateAdamicAdar(c.s, pairsOf(c, o.edges, "edges"), pairsOf(c, o.nonEdges, "nonEdges"), {
            directed: c.s.directed,
        }),
    compareAdamicAdarWithCommonNeighbors: (
        c: Ctx,
        o: EvaluateOptions,
    ): { adamicAdar: LinkPredictionMetrics; commonNeighbors: LinkPredictionMetrics } =>
        compareAdamicAdarWithCommonNeighbors(c.s, pairsOf(c, o.edges, "edges"), pairsOf(c, o.nonEdges, "nonEdges"), {
            directed: c.s.directed,
        }),
};

// ---------------------------------------------------------------------------------------------------------------
// Registration

type Impls = typeof IMPLS;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : never;

/** The methods `cytoscape.use(graphtyCytoscape)` adds to every collection and to the core. */
export type GraphtyAlgorithms = {
    [K in keyof Impls as `graphty${Capitalize<K>}`]: (
        ...options: Tail<Parameters<Impls[K]>>
    ) => Awaited<ReturnType<Impls[K]>>;
} & {
    [K in AsyncKey as `graphty${Capitalize<K>}Async`]: (
        ...options: Tail<Parameters<Impls[K]>>
    ) => Promise<Awaited<ReturnType<Impls[K]>> & { readonly backend: Backend }>;
};

// Module augmentation is how a Cytoscape extension types its methods. The interfaces are empty because the members
// come from the merged-in supertype, which is what the lint rule cannot see.
declare module "cytoscape" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging, see above
    interface CollectionAlgorithms extends GraphtyAlgorithms {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging, see above
    interface Core extends GraphtyAlgorithms {}
}

/**
 * The method name of an algorithm.
 * @param key - the @graphty/algorithms name
 * @returns "graphty" + the name with a capital
 */
function methodName(key: string): string {
    return `graphty${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/** Every synchronous method name `cytoscape.use(graphtyCytoscape)` registers on collections and the core. */
export const ALGORITHM_NAMES: readonly string[] = Object.keys(IMPLS).map(methodName);

// The algorithms whose implementation goes through `c.call`, i.e. those the dispatcher can send to the GPU.
const ASYNC_KEYS = [
    "breadthFirstSearch",
    "dijkstra",
    "bellmanFord",
    "allPairsShortestPath",
    "pageRank",
    "personalizedPageRank",
    "eigenvectorCentrality",
    "katzCentrality",
    "hits",
    "closenessCentrality",
    "betweennessCentrality",
    "edgeBetweennessCentrality",
    "connectedComponents",
    "weaklyConnectedComponents",
    "triangleCount",
    "labelPropagation",
    "labelPropagationSynchronous",
] as const satisfies readonly (keyof Impls)[];

/** The algorithms with an `...Async` method: those the WebGPU accelerator can run. */
type AsyncKey = (typeof ASYNC_KEYS)[number];

/** Every `...Async` method name: the algorithms the WebGPU accelerator can run. */
export const ASYNC_ALGORITHM_NAMES: readonly string[] = ASYNC_KEYS.map((k) => `${methodName(k)}Async`);

/** The algorithm table a run calls through: the CPU functions, or the dispatcher. */
type Algos = Record<GpuKey, (...args: never[]) => unknown>;

/**
 * Runs one algorithm over a collection.
 * @param eles - the collection
 * @param key - the algorithm
 * @param options - the caller's options
 * @param algos - the CPU functions (a synchronous run) or the dispatcher (an asynchronous one)
 * @returns the algorithm's result (a promise through the dispatcher) and the snapshot it ran on
 */
function run(
    eles: Collection,
    key: keyof Impls,
    options: AlgorithmOptions,
    algos: Algos,
): { result: unknown; snapshot: GraphSnapshot } {
    const name = methodName(key);
    if (options.weight !== undefined && UNWEIGHTED.has(key)) {
        throw new Error(`${name}: this algorithm reads no edge weights; remove the weight option`);
    }
    const cs = toSnapshot(eles, { directed: options.directed ?? DIRECTED.has(key), weight: options.weight });
    const rest = {
        ...DEFAULTS[key],
        ...Object.fromEntries(Object.entries(options).filter(([k, v]) => !ADAPTER_KEYS.has(k) && v !== undefined)),
    };
    const c: Ctx = {
        name,
        cy: coreOf(eles),
        cs,
        s: cs.snapshot,
        field: options.field,
        weighted: options.weight !== undefined,
        rest,
        call: (k, ...args) => (algos[k] as (...a: unknown[]) => never)(...args),
    };
    return { result: (IMPLS[key] as (c: Ctx, o: AlgorithmOptions) => unknown)(c, options), snapshot: cs.snapshot };
}

/**
 * Runs an algorithm synchronously on the CPU.
 * @param eles - the collection
 * @param key - the algorithm
 * @param options - the caller's options
 * @returns the result
 */
function runSync(eles: Collection, key: keyof Impls, options: AlgorithmOptions = {}): unknown {
    if (options.gpu === "require") {
        throw new Error(`${methodName(key)}: runs on the CPU; call ${methodName(key)}Async for the GPU`);
    }
    return run(eles, key, options, CPU as unknown as Algos).result;
}

/**
 * Runs an algorithm through the @graphty/algorithms dispatcher, on the core's GPU when it has one, and reports
 * which implementation answered. A GPU failure after the run started is thrown, never finished on the CPU.
 * @param eles - the collection
 * @param key - the algorithm
 * @param options - the caller's options
 * @returns the result with `backend`
 */
async function runAsync(eles: Collection, key: keyof Impls, options: AlgorithmOptions = {}): Promise<unknown> {
    const d = await gpuFor(coreOf(eles), options.gpu);
    const rec = d.gpu === null ? null : recording(d.gpu.accelerator);
    warnIfFixable(d, eles.nodes().length);
    const { result, snapshot } = run(eles, key, options, accelerated(rec?.accelerator ?? null) as unknown as Algos);
    let value: object;
    try {
        value = (await result) as object;
    } finally {
        if (d.gpu !== null && typeof options.weight === "function") {
            // a weight function bypasses the snapshot cache, so nothing else would release this upload
            d.gpu.accelerator.release(snapshot);
        }
    }
    const backend = backendOf(
        d,
        rec?.used() ?? false,
        "the options or the graph need the CPU implementation (the @graphty/algorithms dispatcher does not say which)",
    );
    return Object.assign(value, { backend });
}

/** The registration function Cytoscape's `use()` calls. */
type Register = (type: string, name: string, registrant: unknown) => void;

/**
 * Registers every algorithm as a collection method and a core method named "graphty<Name>".
 * @param cytoscape - the cytoscape function
 */
export function registerAlgorithms(cytoscape: Register): void {
    for (const key of Object.keys(IMPLS) as (keyof Impls)[]) {
        const name = methodName(key);
        cytoscape("collection", name, function (this: Collection, options?: AlgorithmOptions) {
            return runSync(this, key, options);
        });
        cytoscape("core", name, function (this: Core, options?: AlgorithmOptions) {
            return runSync(this.elements(), key, options);
        });
    }
    for (const key of ASYNC_KEYS) {
        const name = `${methodName(key)}Async`;
        cytoscape("collection", name, function (this: Collection, options?: AlgorithmOptions) {
            return runAsync(this, key, options);
        });
        cytoscape("core", name, function (this: Core, options?: AlgorithmOptions) {
            return runAsync(this.elements(), key, options);
        });
    }
}

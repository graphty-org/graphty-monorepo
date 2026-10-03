/**
 * The machine-readable catalog of this package's algorithms: what each one is called, how to call it, what graph
 * it accepts, whether it reads edge weights, what else it needs, what it returns and whether an accelerator can
 * run it. An integration (a host library's plug-in, a UI that lists algorithms) registers from `ALGORITHMS`
 * instead of keeping its own tables, so a new algorithm or a changed rule reaches it on upgrade.
 *
 * Every function here is called as `fn(graph, ...inputs, options)`: the graph first, one argument per entry of
 * `inputs` in order, and the options object last. The incremental engines `DeltaPageRank` and
 * `PriorityDeltaPageRank` are classes, not functions of that shape, and are not listed.
 * @module
 */

import type { AcceleratedAlgorithms, AlgorithmAccelerator } from "./indexed/accelerator.js";
import {
    adamicAdarForPairs,
    adamicAdarPrediction,
    adamicAdarScore,
    allPairsShortestPath,
    astar,
    bellmanFord,
    betweennessCentrality,
    bidirectionalDijkstra,
    breadthFirstSearch,
    closenessCentrality,
    commonNeighborsForPairs,
    commonNeighborsPrediction,
    commonNeighborsScore,
    compareAdamicAdarWithCommonNeighbors,
    condensation,
    connectedComponents,
    degreeCentrality,
    degrees,
    depthFirstSearch,
    dijkstra,
    directionOptimizedBfs,
    edgeBetweennessCentrality,
    eigenvectorCentrality,
    evaluateAdamicAdar,
    evaluateCommonNeighbors,
    findAllIsomorphisms,
    getTopAdamicAdarCandidatesForNode,
    getTopCandidatesForNode,
    girvanNewman,
    greedyBipartiteMatching,
    grsbm,
    hasCycle,
    hierarchicalClustering,
    hits,
    isBipartite,
    isGraphIsomorphic,
    kargerMinCut,
    katzCentrality,
    kCoreDecomposition,
    kruskalMST,
    labelPropagation,
    labelPropagationSemiSupervised,
    labelPropagationSynchronous,
    leiden,
    louvain,
    markovClustering,
    maxFlow,
    maximumBipartiteMatching,
    minSTCut,
    modularity,
    nodeClosenessCentrality,
    pageRank,
    personalizedPageRank,
    primMST,
    spectralClustering,
    stoerWagner,
    stronglyConnectedComponents,
    syncClustering,
    teraHAC,
    topologicalSort,
    triangleCount,
    weaklyConnectedComponents,
} from "./indexed/index.js";

/** What an algorithm is for. */
export type AlgorithmCategory =
    | "centrality"
    | "community"
    | "components"
    | "flow"
    | "link-prediction"
    | "matching"
    | "shortest-path"
    | "spanning-tree"
    | "structure"
    | "traversal";

/**
 * The graphs an algorithm accepts. "any": directed and undirected snapshots. "directed" / "undirected": it throws
 * on the other kind (for an undirected-only algorithm, pass `snapshot.toUndirected().snapshot`).
 */
export type GraphDirection = "any" | "directed" | "undirected";

/**
 * Whether an algorithm reads the snapshot's edge weights (its `weights` column; an unweighted snapshot reads as
 * every weight 1). Every algorithm follows one rule:
 * - "by-default": it reads them when the snapshot has them, unless the options say `weighted: false`.
 * - "never": weights make no difference, and an options object with `weighted: true` is refused with a
 *   `RangeError` whose code is `E_BAD_OPTION`, so a caller who asked for a weighted answer is told.
 */
export type WeightUse = "never" | "by-default";

/**
 * A positional argument between the graph and the options.
 * - "node": a node index.
 * - "node-values": one number per node, a `Float64Array` (or `Float32Array`) `nodeCount` long.
 * - "node-labels": one label per node, a `Uint32Array` `nodeCount` long (a partition).
 * - "seed-labels": a `Uint32Array` `nodeCount` long holding a node's fixed label, or `INVALID_INDEX` for a free node.
 * - "node-pairs": `{ sources, targets }`, two equally long arrays of node indices.
 * - "heuristic": a function `(node, target) => number`, an estimate of the remaining distance.
 * - "graph": a second `GraphSnapshot`.
 */
export type AlgorithmInputKind =
    | "node"
    | "node-values"
    | "node-labels"
    | "seed-labels"
    | "node-pairs"
    | "heuristic"
    | "graph";

/** One positional argument: its parameter name and what it holds. */
export interface AlgorithmInput {
    readonly name: string;
    readonly kind: AlgorithmInputKind;
}

/**
 * What an algorithm returns.
 * - "node-scores": numbers per node. "edge-scores": numbers per edge, in edge index order.
 * - "partition": a label per node (`labels`) and the number of labels (`count`).
 * - "hierarchy": a dendrogram or a sequence of partitions.
 * - "traversal": a visit order with per-node `depth` and `parent`.
 * - "shortest-paths": per-node distances (`dist`) and predecessor arcs (`predArc`) from one source.
 * - "all-pairs": an `n * n` distance matrix. "path": one path between two nodes.
 * - "spanning-tree": the tree's edges. "cut": a node side and the edges crossing it. "flow": a flow per edge.
 * - "matching": a partner per node. "order": node indices in order, or null. "bipartition": a yes/no and the
 *   two sides. "isomorphism": a yes/no and a node mapping. "isomorphisms": every node mapping.
 * - "link-predictions": ranked node pairs with scores. "pair-scores": a score per given pair.
 *   "metrics": precision, recall, F1 and AUC.
 * - "boolean", "number": the value itself.
 */
export type AlgorithmResultKind =
    | "node-scores"
    | "edge-scores"
    | "partition"
    | "hierarchy"
    | "traversal"
    | "shortest-paths"
    | "all-pairs"
    | "path"
    | "spanning-tree"
    | "cut"
    | "flow"
    | "matching"
    | "order"
    | "bipartition"
    | "isomorphism"
    | "isomorphisms"
    | "link-predictions"
    | "pair-scores"
    | "metrics"
    | "boolean"
    | "number";

/** The algorithm methods of `AlgorithmAccelerator` (an accelerator implements any subset of them). */
export type AcceleratorMethod = Exclude<keyof AlgorithmAccelerator, "kind" | "release" | "dispose">;

/** The methods of the `accelerated(acc)` dispatcher. */
export type DispatcherMethod = Exclude<keyof AcceleratedAlgorithms, "accelerator">;

/** One algorithm of the catalog. */
export interface AlgorithmEntry {
    /** The export name, and the key of this entry in `ALGORITHMS`. */
    readonly name: string;
    /** The function, called as `fn(graph, ...inputs, options)`. */
    readonly fn: (...args: never[]) => unknown;
    readonly category: AlgorithmCategory;
    readonly direction: GraphDirection;
    readonly weights: WeightUse;
    /** The positional arguments between the graph and the options, in order. */
    readonly inputs: readonly AlgorithmInput[];
    /** Options that have no default and must be given. */
    readonly requiredOptions: readonly string[];
    readonly result: AlgorithmResultKind;
    /**
     * The result's per-element arrays (one entry per node, or per edge for edge results), as property paths
     * ("scores", "components.labels"); "" names the return value itself. Empty when there are none.
     */
    readonly values: readonly string[];
    /** The `accelerated(acc)` method that runs this algorithm, on an accelerator when it can; null when there is none. */
    readonly dispatch: DispatcherMethod | null;
    /**
     * The `AlgorithmAccelerator` method that can take this algorithm over, or null when it always runs on the CPU.
     * None of the algorithms needs an accelerator: each has a CPU implementation.
     */
    readonly accelerator: AcceleratorMethod | null;
}

const NODE = (name: string): AlgorithmInput => ({ name, kind: "node" });
const PAIRS = (name: string): AlgorithmInput => ({ name, kind: "node-pairs" });

/**
 * Every algorithm of `@graphty/algorithms`, keyed by its export name.
 * @example
 * ```ts
 * import { ALGORITHMS } from "@graphty/algorithms";
 *
 * for (const a of Object.values(ALGORITHMS)) {
 *     if (a.direction !== "directed" && a.inputs.length === 0 && a.result === "node-scores") {
 *         console.log(a.name, a.weights);
 *     }
 * }
 * ```
 */
export const ALGORITHMS = {
    // Traversal
    breadthFirstSearch: {
        name: "breadthFirstSearch",
        fn: breadthFirstSearch,
        category: "traversal",
        direction: "any",
        weights: "never",
        inputs: [NODE("start")],
        requiredOptions: [],
        result: "traversal",
        values: ["depth", "parent"],
        dispatch: "breadthFirstSearch",
        accelerator: "breadthFirstSearch",
    },
    directionOptimizedBfs: {
        name: "directionOptimizedBfs",
        fn: directionOptimizedBfs,
        category: "traversal",
        direction: "any",
        weights: "never",
        inputs: [NODE("source")],
        requiredOptions: [],
        result: "traversal",
        values: ["depth", "parent"],
        dispatch: null,
        accelerator: null,
    },
    depthFirstSearch: {
        name: "depthFirstSearch",
        fn: depthFirstSearch,
        category: "traversal",
        direction: "any",
        weights: "never",
        inputs: [NODE("start")],
        requiredOptions: [],
        result: "traversal",
        values: ["depth", "parent"],
        dispatch: "depthFirstSearch",
        accelerator: null,
    },

    // Shortest paths
    dijkstra: {
        name: "dijkstra",
        fn: dijkstra,
        category: "shortest-path",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source")],
        requiredOptions: [],
        result: "shortest-paths",
        values: ["dist", "predArc"],
        dispatch: "sssp",
        accelerator: "sssp",
    },
    bellmanFord: {
        name: "bellmanFord",
        fn: bellmanFord,
        category: "shortest-path",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source")],
        requiredOptions: [],
        result: "shortest-paths",
        values: ["dist", "predArc"],
        dispatch: "bellmanFord",
        accelerator: "bellmanFord",
    },
    bidirectionalDijkstra: {
        name: "bidirectionalDijkstra",
        fn: bidirectionalDijkstra,
        category: "shortest-path",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source"), NODE("target")],
        requiredOptions: [],
        result: "path",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    astar: {
        name: "astar",
        fn: astar,
        category: "shortest-path",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source"), NODE("target"), { name: "heuristic", kind: "heuristic" }],
        requiredOptions: [],
        result: "path",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    allPairsShortestPath: {
        name: "allPairsShortestPath",
        fn: allPairsShortestPath,
        category: "shortest-path",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "all-pairs",
        values: [],
        dispatch: "allPairsShortestPath",
        accelerator: "allPairsShortestPath",
    },

    // Centrality
    pageRank: {
        name: "pageRank",
        fn: pageRank,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "pageRank",
        accelerator: "pageRank",
    },
    personalizedPageRank: {
        name: "personalizedPageRank",
        fn: personalizedPageRank,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [{ name: "personalization", kind: "node-values" }],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "personalizedPageRank",
        accelerator: "personalizedPageRank",
    },
    eigenvectorCentrality: {
        name: "eigenvectorCentrality",
        fn: eigenvectorCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "eigenvectorCentrality",
        accelerator: "eigenvectorCentrality",
    },
    katzCentrality: {
        name: "katzCentrality",
        fn: katzCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "katzCentrality",
        accelerator: "katzCentrality",
    },
    hits: {
        name: "hits",
        fn: hits,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["hubs", "authorities"],
        dispatch: "hits",
        accelerator: "hits",
    },
    betweennessCentrality: {
        name: "betweennessCentrality",
        fn: betweennessCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "betweennessCentrality",
        accelerator: "betweennessCentrality",
    },
    edgeBetweennessCentrality: {
        name: "edgeBetweennessCentrality",
        fn: edgeBetweennessCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "edge-scores",
        values: ["scores"],
        dispatch: "edgeBetweennessCentrality",
        accelerator: "edgeBetweennessCentrality",
    },
    closenessCentrality: {
        name: "closenessCentrality",
        fn: closenessCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["scores"],
        dispatch: "closenessCentrality",
        accelerator: "closenessCentrality",
    },
    nodeClosenessCentrality: {
        name: "nodeClosenessCentrality",
        fn: nodeClosenessCentrality,
        category: "centrality",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("node")],
        requiredOptions: [],
        result: "number",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    degreeCentrality: {
        name: "degreeCentrality",
        fn: degreeCentrality,
        category: "centrality",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: [""],
        dispatch: null,
        accelerator: null,
    },
    degrees: {
        name: "degrees",
        fn: degrees,
        category: "centrality",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["inDegree", "outDegree"],
        dispatch: "degrees",
        accelerator: null,
    },

    // Components
    connectedComponents: {
        name: "connectedComponents",
        fn: connectedComponents,
        category: "components",
        direction: "undirected",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "connectedComponents",
        accelerator: "connectedComponents",
    },
    weaklyConnectedComponents: {
        name: "weaklyConnectedComponents",
        fn: weaklyConnectedComponents,
        category: "components",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "weaklyConnectedComponents",
        accelerator: "weaklyConnectedComponents",
    },
    stronglyConnectedComponents: {
        name: "stronglyConnectedComponents",
        fn: stronglyConnectedComponents,
        category: "components",
        direction: "directed",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "stronglyConnectedComponents",
        accelerator: null,
    },
    condensation: {
        name: "condensation",
        fn: condensation,
        category: "components",
        direction: "directed",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["components.labels"],
        dispatch: null,
        accelerator: null,
    },
    kCoreDecomposition: {
        name: "kCoreDecomposition",
        fn: kCoreDecomposition,
        category: "components",
        direction: "undirected",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["coreness"],
        dispatch: "kCoreDecomposition",
        accelerator: "kCoreDecomposition",
    },

    // Structure
    triangleCount: {
        name: "triangleCount",
        fn: triangleCount,
        category: "structure",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "node-scores",
        values: ["perNode", "coefficient"],
        dispatch: "triangleCount",
        accelerator: "triangleCount",
    },
    hasCycle: {
        name: "hasCycle",
        fn: hasCycle,
        category: "structure",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "boolean",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    topologicalSort: {
        name: "topologicalSort",
        fn: topologicalSort,
        category: "structure",
        direction: "directed",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "order",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    isBipartite: {
        name: "isBipartite",
        fn: isBipartite,
        category: "structure",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "bipartition",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    isGraphIsomorphic: {
        name: "isGraphIsomorphic",
        fn: isGraphIsomorphic,
        category: "structure",
        direction: "any",
        weights: "never",
        inputs: [{ name: "other", kind: "graph" }],
        requiredOptions: [],
        result: "isomorphism",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    findAllIsomorphisms: {
        name: "findAllIsomorphisms",
        fn: findAllIsomorphisms,
        category: "structure",
        direction: "any",
        weights: "never",
        inputs: [{ name: "other", kind: "graph" }],
        requiredOptions: [],
        result: "isomorphisms",
        values: [],
        dispatch: null,
        accelerator: null,
    },

    // Community
    louvain: {
        name: "louvain",
        fn: louvain,
        category: "community",
        direction: "undirected",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "louvain",
        accelerator: "louvain",
    },
    leiden: {
        name: "leiden",
        fn: leiden,
        category: "community",
        direction: "undirected",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "leiden",
        accelerator: null,
    },
    girvanNewman: {
        name: "girvanNewman",
        fn: girvanNewman,
        category: "community",
        direction: "undirected",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "hierarchy",
        values: [],
        dispatch: "girvanNewman",
        accelerator: null,
    },
    labelPropagation: {
        name: "labelPropagation",
        fn: labelPropagation,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "labelPropagation",
        accelerator: "labelPropagation",
    },
    labelPropagationSynchronous: {
        name: "labelPropagationSynchronous",
        fn: labelPropagationSynchronous,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: "labelPropagationSynchronous",
        accelerator: "labelPropagation",
    },
    labelPropagationSemiSupervised: {
        name: "labelPropagationSemiSupervised",
        fn: labelPropagationSemiSupervised,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [{ name: "seeds", kind: "seed-labels" }],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    markovClustering: {
        name: "markovClustering",
        fn: markovClustering,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    spectralClustering: {
        name: "spectralClustering",
        fn: spectralClustering,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: ["k"],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    syncClustering: {
        name: "syncClustering",
        fn: syncClustering,
        category: "community",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: ["numClusters"],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    grsbm: {
        name: "grsbm",
        fn: grsbm,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    teraHAC: {
        name: "teraHAC",
        fn: teraHAC,
        category: "community",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "partition",
        values: ["labels"],
        dispatch: null,
        accelerator: null,
    },
    hierarchicalClustering: {
        name: "hierarchicalClustering",
        fn: hierarchicalClustering,
        category: "community",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "hierarchy",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    modularity: {
        name: "modularity",
        fn: modularity,
        category: "community",
        direction: "any",
        weights: "by-default",
        inputs: [{ name: "labels", kind: "node-labels" }],
        requiredOptions: [],
        result: "number",
        values: [],
        dispatch: null,
        accelerator: null,
    },

    // Spanning trees
    kruskalMST: {
        name: "kruskalMST",
        fn: kruskalMST,
        category: "spanning-tree",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "spanning-tree",
        values: [],
        dispatch: "minimumSpanningTree",
        accelerator: "minimumSpanningTree",
    },
    primMST: {
        name: "primMST",
        fn: primMST,
        category: "spanning-tree",
        direction: "undirected",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "spanning-tree",
        values: ["predArc"],
        dispatch: "primMST",
        accelerator: null,
    },

    // Flow and cuts
    maxFlow: {
        name: "maxFlow",
        fn: maxFlow,
        category: "flow",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source"), NODE("sink")],
        requiredOptions: [],
        result: "flow",
        values: ["flow"],
        dispatch: "maxFlow",
        accelerator: null,
    },
    minSTCut: {
        name: "minSTCut",
        fn: minSTCut,
        category: "flow",
        direction: "any",
        weights: "by-default",
        inputs: [NODE("source"), NODE("sink")],
        requiredOptions: [],
        result: "cut",
        values: [],
        dispatch: "minSTCut",
        accelerator: null,
    },
    stoerWagner: {
        name: "stoerWagner",
        fn: stoerWagner,
        category: "flow",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "cut",
        values: [],
        dispatch: "stoerWagner",
        accelerator: null,
    },
    kargerMinCut: {
        name: "kargerMinCut",
        fn: kargerMinCut,
        category: "flow",
        direction: "any",
        weights: "by-default",
        inputs: [],
        requiredOptions: [],
        result: "cut",
        values: [],
        dispatch: "kargerMinCut",
        accelerator: null,
    },

    // Matching
    maximumBipartiteMatching: {
        name: "maximumBipartiteMatching",
        fn: maximumBipartiteMatching,
        category: "matching",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "matching",
        values: ["matching"],
        dispatch: "maximumBipartiteMatching",
        accelerator: null,
    },
    greedyBipartiteMatching: {
        name: "greedyBipartiteMatching",
        fn: greedyBipartiteMatching,
        category: "matching",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "matching",
        values: ["matching"],
        dispatch: null,
        accelerator: null,
    },

    // Link prediction
    commonNeighborsScore: {
        name: "commonNeighborsScore",
        fn: commonNeighborsScore,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [NODE("u"), NODE("v")],
        requiredOptions: [],
        result: "number",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    adamicAdarScore: {
        name: "adamicAdarScore",
        fn: adamicAdarScore,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [NODE("u"), NODE("v")],
        requiredOptions: [],
        result: "number",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    commonNeighborsPrediction: {
        name: "commonNeighborsPrediction",
        fn: commonNeighborsPrediction,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "link-predictions",
        values: [],
        dispatch: "commonNeighborsPrediction",
        accelerator: null,
    },
    adamicAdarPrediction: {
        name: "adamicAdarPrediction",
        fn: adamicAdarPrediction,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [],
        requiredOptions: [],
        result: "link-predictions",
        values: [],
        dispatch: "adamicAdarPrediction",
        accelerator: null,
    },
    getTopCandidatesForNode: {
        name: "getTopCandidatesForNode",
        fn: getTopCandidatesForNode,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [NODE("u")],
        requiredOptions: [],
        result: "link-predictions",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    getTopAdamicAdarCandidatesForNode: {
        name: "getTopAdamicAdarCandidatesForNode",
        fn: getTopAdamicAdarCandidatesForNode,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [NODE("u")],
        requiredOptions: [],
        result: "link-predictions",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    commonNeighborsForPairs: {
        name: "commonNeighborsForPairs",
        fn: commonNeighborsForPairs,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [PAIRS("pairs")],
        requiredOptions: [],
        result: "pair-scores",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    adamicAdarForPairs: {
        name: "adamicAdarForPairs",
        fn: adamicAdarForPairs,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [PAIRS("pairs")],
        requiredOptions: [],
        result: "pair-scores",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    evaluateCommonNeighbors: {
        name: "evaluateCommonNeighbors",
        fn: evaluateCommonNeighbors,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [PAIRS("edges"), PAIRS("nonEdges")],
        requiredOptions: [],
        result: "metrics",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    evaluateAdamicAdar: {
        name: "evaluateAdamicAdar",
        fn: evaluateAdamicAdar,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [PAIRS("edges"), PAIRS("nonEdges")],
        requiredOptions: [],
        result: "metrics",
        values: [],
        dispatch: null,
        accelerator: null,
    },
    compareAdamicAdarWithCommonNeighbors: {
        name: "compareAdamicAdarWithCommonNeighbors",
        fn: compareAdamicAdarWithCommonNeighbors,
        category: "link-prediction",
        direction: "any",
        weights: "never",
        inputs: [PAIRS("edges"), PAIRS("nonEdges")],
        requiredOptions: [],
        result: "metrics",
        values: [],
        dispatch: null,
        accelerator: null,
    },
} as const satisfies Readonly<Record<string, AlgorithmEntry>>;

/** The name of an algorithm in `ALGORITHMS`. */
export type AlgorithmName = keyof typeof ALGORITHMS;

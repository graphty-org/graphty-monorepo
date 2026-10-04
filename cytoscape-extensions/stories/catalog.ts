/**
 * What the demo offers: every layout, every algorithm (grouped as the stories group them), and a preset for every
 * generator. Data only, so test/demo-catalog.test.ts can check that nothing the extension registers is missing.
 */

import type { ExportFormat, GeneratorName, GeneratorOptions } from "../src/index.js";

/** The force simulations: the layouts that run on the GPU. */
export const SIMULATION_LAYOUTS = ["forceatlas2", "fruchterman-reingold", "spring-electrical"] as const;

/** The one-shot layouts: CPU only. */
export const STATIC_LAYOUTS = [
    "random",
    "circular",
    "spiral",
    "grid",
    "shell",
    "bipartite",
    "multipartite",
    "bfs",
    "radial",
    "planar",
    "spectral",
    "kamada-kawai",
    "arf",
] as const;

/** The generated networks the layout and algorithm stories run on. */
export const NETWORKS = [
    "barabasi-albert",
    "planted-partition",
    "erdos-renyi",
    "watts-strogatz",
    "grid",
    "random-tree",
] as const;
export type Network = (typeof NETWORKS)[number];

/** A group of algorithms, with the network and direction that make a readable picture of all of them. */
interface AlgorithmGroup {
    readonly network: Network;
    readonly directed: boolean;
    /** Names without the "graphty" prefix, as @graphty/algorithms spells them. */
    readonly algorithms: readonly string[];
}

export const ALGORITHM_GROUPS = {
    Centrality: {
        network: "barabasi-albert",
        directed: false,
        algorithms: [
            "pageRank",
            "personalizedPageRank",
            "deltaPageRank",
            "eigenvectorCentrality",
            "katzCentrality",
            "hits",
            "closenessCentrality",
            "nodeClosenessCentrality",
            "betweennessCentrality",
            "edgeBetweennessCentrality",
            "degreeCentrality",
            "degrees",
            "kCoreDecomposition",
            "triangleCount",
        ],
    },
    Communities: {
        network: "planted-partition",
        directed: false,
        algorithms: [
            "louvain",
            "leiden",
            "labelPropagation",
            "labelPropagationSynchronous",
            "labelPropagationSemiSupervised",
            "girvanNewman",
            "markovClustering",
            "spectralClustering",
            "hierarchicalClustering",
            "teraHAC",
            "grsbm",
            "syncClustering",
            "modularity",
            "connectedComponents",
        ],
    },
    PathsAndTrees: {
        network: "barabasi-albert",
        directed: false,
        algorithms: [
            "dijkstra",
            "bellmanFord",
            "bidirectionalDijkstra",
            "aStar",
            "allPairsShortestPath",
            "breadthFirstSearch",
            "directionOptimizedBfs",
            "depthFirstSearch",
            "kruskalMST",
            "primMST",
        ],
    },
    // a random tree with its edges directed: a DAG and bipartite (connectedComponents, undirected only, is under Communities)
    Structure: {
        network: "random-tree",
        directed: true,
        algorithms: [
            "weaklyConnectedComponents",
            "stronglyConnectedComponents",
            "condensation",
            "hasCycle",
            "topologicalSort",
            "isBipartite",
            "maximumBipartiteMatching",
            "greedyBipartiteMatching",
            "isGraphIsomorphic",
            "findAllIsomorphisms",
        ],
    },
    FlowsAndCuts: {
        network: "watts-strogatz",
        directed: false,
        algorithms: ["maxFlow", "minSTCut", "stoerWagner", "kargerMinCut"],
    },
    LinkPrediction: {
        network: "planted-partition",
        directed: false,
        algorithms: [
            "commonNeighborsScore",
            "adamicAdarScore",
            "commonNeighborsForPairs",
            "adamicAdarForPairs",
            "commonNeighborsPrediction",
            "adamicAdarPrediction",
            "topCandidatesForNode",
            "topAdamicAdarCandidatesForNode",
            "evaluateCommonNeighbors",
            "evaluateAdamicAdar",
            "compareAdamicAdarWithCommonNeighbors",
        ],
    },
} as const satisfies Record<string, AlgorithmGroup>;
export type AlgorithmGroupName = keyof typeof ALGORITHM_GROUPS;

/** Every generator with options that make a readable picture of at most a few hundred nodes. */
export const GENERATOR_PRESETS: { [N in GeneratorName]: GeneratorOptions<N> } = {
    ak: { k: 4 },
    "balanced-tree": { branching: 3, height: 4 },
    "barabasi-albert": { n: 300, m: 2 },
    barbell: { cliqueSize: 8, pathLength: 6 },
    "bianconi-barabasi": { n: 200, m: 2 },
    "bipartite-configuration-model": { leftDegrees: Array(40).fill(3), rightDegrees: Array(60).fill(2) },
    caveman: { cliques: 6, size: 6 },
    "chung-lu": { expectedDegrees: Array.from({ length: 200 }, (_, i) => 2 + 40 / (i + 1)) },
    "circular-ladder": { n: 20 },
    complete: { n: 12 },
    "complete-bipartite": { a: 6, b: 8 },
    "complete-multipartite": { sizes: [3, 4, 5] },
    "configuration-model": { degrees: Array(100).fill(3) },
    "connected-caveman": { cliques: 8, size: 6 },
    cycle: { n: 30 },
    "degree-corrected-sbm": { sizes: [50, 50, 50], expectedDegrees: Array(150).fill(5), mixing: 0.1 },
    "directed-configuration-model": { outDegrees: Array(100).fill(2), inDegrees: Array(100).fill(2) },
    "duplication-divergence": { n: 200, retention: 0.4 },
    empty: { n: 20 },
    "erdos-renyi": { n: 200, p: 0.02 },
    "erdos-renyi-gnm": { n: 200, m: 400 },
    "forest-fire": { n: 200, forward: 0.35, backward: 0.3 },
    genrmf: { a: 3, b: 4, c1: 1, c2: 100 },
    grid: { rows: 15, cols: 15 },
    "grid-3d": { rows: 6, cols: 6, layers: 4 },
    "grid-flow-network": { rows: 8, cols: 8 },
    "hexagonal-lattice": { rows: 6, cols: 8 },
    hyperbolic: { n: 300, averageDegree: 6, exponent: 2.5 },
    hypercube: { dimension: 6 },
    knn: { n: 200, k: 4 },
    kronecker: {
        initiator: [
            [0.9, 0.5],
            [0.5, 0.1],
        ],
        power: 7,
    },
    ladder: { n: 20 },
    "layered-flow-network": { layers: [1, 6, 8, 6, 1], p: 0.5 },
    lfr: {
        n: 250,
        minDegree: 4,
        maxDegree: 30,
        degreeExponent: 2.5,
        minCommunity: 20,
        maxCommunity: 60,
        communityExponent: 1.5,
        mixing: 0.1,
    },
    lollipop: { cliqueSize: 8, pathLength: 10 },
    "mobius-ladder": { n: 20 },
    named: { name: "frucht" },
    "newman-watts": { n: 200, k: 4, p: 0.1 },
    path: { n: 30 },
    petersen: {},
    "planted-partition": { groups: 5, groupSize: 40, pIn: 0.15, pOut: 0.004 },
    price: { n: 200, citations: 3 },
    "random-apollonian": { n: 150 },
    "random-bipartite": { n1: 40, n2: 60, p: 0.05 },
    "random-dag": { layers: [10, 20, 30, 20, 10], p: 0.1 },
    "random-geometric": { n: 300, radius: 0.1 },
    "random-order-dag": { n: 100, p: 0.05 },
    "random-recursive-tree": { n: 200 },
    "random-regular": { n: 100, d: 3 },
    "random-tree": { n: 200 },
    "ring-of-cliques": { cliques: 8, size: 5 },
    rmat: { scale: 8, edgeFactor: 4 },
    star: { n: 20 },
    "stochastic-block-model": {
        sizes: [60, 60, 60],
        probabilities: [
            [0.1, 0.005, 0.005],
            [0.005, 0.1, 0.005],
            [0.005, 0.005, 0.1],
        ],
    },
    "triangular-lattice": { rows: 8, cols: 10 },
    "watts-strogatz": { n: 200, k: 4, beta: 0.1 },
    waxman: { n: 200, alpha: 0.4, beta: 0.1 },
    wheel: { n: 20 },
    "wilson-maze": { rows: 12, cols: 12 },
};

/** Every format graphtyExport writes and graphtyImport reads; the record makes a format added to ExportFormat a type error here. */
export const FORMATS = Object.keys({
    graphml: 0,
    gexf: 0,
    gml: 0,
    dot: 0,
    pajek: 0,
    csv: 0,
    json: 0,
    neo4j: 0,
    xgmml: 0,
    cx2: 0,
} satisfies Record<ExportFormat, 0>) as ExportFormat[];

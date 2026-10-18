/**
 * What the demo offers: every layout, every algorithm (grouped as the stories group them), a preset for every
 * generator, the small datasets and the formats, and the gallery pages built from them. Data only, so test/demo-catalog.test.ts can check that nothing the extension registers is missing.
 */

import { DATASETS } from "@graphty/graph-samples";

import { GENERATOR_OPTION_NAMES } from "../src/algorithm-options.js";
import type { ExportFormat, GeneratorName, GeneratorOptions, ImportFormat } from "../src/index.js";

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
type AlgorithmGroupName = keyof typeof ALGORITHM_GROUPS;

/**
 * A generator's preset with the seed added when the generator takes one: the deterministic ones (ak, petersen, ...)
 * refuse an option they do not take.
 * @param name - the generator
 * @param seed - the seed
 * @returns the options to pass to cy.graphtyGenerate
 */
export function presetWithSeed(name: GeneratorName, seed: number): Record<string, unknown> {
    const preset = GENERATOR_PRESETS[name] as Record<string, unknown>;
    return GENERATOR_OPTION_NAMES[name]?.includes("seed") === true ? { ...preset, seed } : { ...preset };
}

/** Every generator with options that make a readable picture of at most a few hundred nodes. */
export const GENERATOR_PRESETS: { [N in GeneratorName]: GeneratorOptions<N> } = {
    ak: { k: 4 },
    "balanced-tree": { branching: 3, height: 4 },
    "barabasi-albert": { n: 150, m: 2 },
    barbell: { cliqueSize: 8, pathLength: 6 },
    "bianconi-barabasi": { n: 150, m: 2 },
    "bipartite-configuration-model": { leftDegrees: Array(20).fill(3), rightDegrees: Array(30).fill(2) },
    caveman: { cliques: 6, size: 6 },
    "chung-lu": { expectedDegrees: Array.from({ length: 150 }, (_, i) => 2 + 40 / (i + 1)) },
    "circular-ladder": { n: 20 },
    complete: { n: 12 },
    "complete-bipartite": { a: 6, b: 8 },
    "complete-multipartite": { sizes: [3, 4, 5] },
    "configuration-model": { degrees: Array(60).fill(3) },
    "connected-caveman": { cliques: 8, size: 6 },
    cycle: { n: 30 },
    "degree-corrected-sbm": {
        sizes: [40, 40, 40],
        expectedDegrees: Array.from({ length: 120 }, (_, i) => 3 + (i % 5) * 2),
        mixing: 0.05,
    },
    "directed-configuration-model": { outDegrees: Array(60).fill(2), inDegrees: Array(60).fill(2) },
    "duplication-divergence": { n: 100, retention: 0.4 },
    empty: { n: 20 },
    "erdos-renyi": { n: 100, p: 0.04 },
    "erdos-renyi-gnm": { n: 100, m: 200 },
    "forest-fire": { n: 100, forward: 0.35, backward: 0.3 },
    genrmf: { a: 3, b: 4, c1: 1, c2: 100 },
    grid: { rows: 15, cols: 15, positions: true },
    "grid-3d": { rows: 6, cols: 6, layers: 4 },
    "grid-flow-network": { rows: 8, cols: 8 },
    "hexagonal-lattice": { rows: 6, cols: 8, positions: true },
    hyperbolic: { n: 150, averageDegree: 4, exponent: 2.5 },
    hypercube: { dimension: 4 },
    knn: { n: 150, k: 3, directed: false },
    kronecker: {
        initiator: [
            [0.9, 0.5],
            [0.5, 0.1],
        ],
        power: 7,
        selfLoops: "erase",
        multiEdges: "erase",
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
    "newman-watts": { n: 60, k: 4, p: 0.1 },
    path: { n: 30 },
    petersen: {},
    "planted-partition": { groups: 4, groupSize: 30, pIn: 0.2, pOut: 0.005 },
    price: { n: 150, citations: 2 },
    "random-apollonian": { n: 40 },
    "random-bipartite": { n1: 15, n2: 20, p: 0.15 },
    "random-dag": { layers: [5, 8, 10, 8, 5], p: 0.25 },
    "random-geometric": { n: 200, radius: 0.1 },
    "random-order-dag": { n: 50, p: 0.08 },
    "random-recursive-tree": { n: 100 },
    "random-regular": { n: 60, d: 3 },
    "random-tree": { n: 100 },
    "ring-of-cliques": { cliques: 8, size: 5 },
    rmat: { scale: 7, edgeFactor: 4, selfLoops: "erase", multiEdges: "erase" },
    star: { n: 20 },
    "stochastic-block-model": {
        sizes: [40, 40, 40],
        probabilities: [
            [0.1, 0.005, 0.005],
            [0.005, 0.1, 0.005],
            [0.005, 0.005, 0.1],
        ],
    },
    "triangular-lattice": { rows: 8, cols: 10, positions: true },
    "watts-strogatz": { n: 60, k: 4, beta: 0.1 },
    waxman: { n: 200, alpha: 0.05, beta: 1 },
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

/** Every format graphtyImport reads; the record makes a format added to ImportFormat a type error here. */
const IMPORT_FORMATS = Object.keys({
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
    cx: 0,
    obo: 0,
    cys: 0,
} satisfies Record<Exclude<ImportFormat, "auto">, 0>) as Exclude<ImportFormat, "auto">[];

/**
 * The small datasets (under 5,000 nodes), smallest first: the ones the package used to bundle. The large ones are
 * big downloads and stay out of the snapshots.
 */
const SMALL_DATASETS = DATASETS.filter((d) => d.nodes < 5000)
    .sort((a, b) => a.nodes - b.nodes)
    .map((d) => d.name);

/**
 * One gallery page per algorithm group.
 * @returns the algorithms of each group
 */
function algorithmPages(): Record<AlgorithmGroupName, readonly string[]> {
    const pages = {} as Record<AlgorithmGroupName, readonly string[]>;
    for (const [group, g] of Object.entries(ALGORITHM_GROUPS)) {
        pages[group as AlgorithmGroupName] = g.algorithms;
    }
    return pages;
}

/**
 * The gallery pages, each with its tiles. Every page is a Storybook component holding a "Side by side" story with
 * every tile and one story per tile; test/demo-catalog.test.ts writes those story files from this list.
 */
export const GALLERY_PAGES = {
    Layouts: [...SIMULATION_LAYOUTS, ...STATIC_LAYOUTS],
    ...algorithmPages(),
    Generators: Object.keys(GENERATOR_PRESETS) as GeneratorName[],
    Datasets: SMALL_DATASETS,
    // a file read in each format, one read with no format named ("auto"), and karate written in every format
    Formats: [...IMPORT_FORMATS, "auto", "export"],
} satisfies Record<string, readonly string[]>;
export type GalleryPage = keyof typeof GALLERY_PAGES;

/**
 * Where each page sits in the sidebar. The pages were first published under one "Gallery" root; each story file
 * keeps that first title's component id as its meta `id`, so every story id (and every approved screenshot and deep
 * link) stays the same.
 */
export const PAGE_TITLES: Record<GalleryPage, string> = {
    Layouts: "Layouts/All layouts",
    Centrality: "Algorithms/Centrality",
    Communities: "Algorithms/Communities",
    PathsAndTrees: "Algorithms/Paths and trees",
    Structure: "Algorithms/Structure",
    FlowsAndCuts: "Algorithms/Flows and cuts",
    LinkPrediction: "Algorithms/Link prediction",
    Generators: "Data/Generators/Side by side",
    Datasets: "Data/Datasets",
    Formats: "Data/Formats",
};

/**
 * The component id a page's stories were first published under: "PathsAndTrees" is "gallery-paths-and-trees".
 * @param page - the page
 * @returns the meta id
 */
export function pageId(page: GalleryPage): string {
    return `gallery-${page.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

/**
 * The section name of a page, as a heading reads it: "Paths and trees".
 * @param page - the page
 * @returns the name
 */
export function pageLabel(page: GalleryPage): string {
    return PAGE_TITLES[page].split("/").pop() ?? page;
}

/**
 * The generators by family, in sidebar order: each family is one folder under Data/Generators. Every generator is in
 * exactly one family (test/demo-catalog.test.ts checks it).
 */
export const GENERATOR_FAMILIES: Record<string, readonly GeneratorName[]> = {
    "Classic shapes": [
        "path",
        "cycle",
        "star",
        "wheel",
        "complete",
        "complete-bipartite",
        "complete-multipartite",
        "empty",
        "hypercube",
        "ladder",
        "circular-ladder",
        "mobius-ladder",
        "barbell",
        "lollipop",
        "balanced-tree",
        "petersen",
        "named",
    ],
    Lattices: ["grid", "grid-3d", "triangular-lattice", "hexagonal-lattice"],
    "Random graphs": ["erdos-renyi", "erdos-renyi-gnm", "random-bipartite", "random-regular"],
    "Small world": ["watts-strogatz", "newman-watts"],
    "Scale-free and growth": [
        "barabasi-albert",
        "bianconi-barabasi",
        "price",
        "forest-fire",
        "duplication-divergence",
        "random-apollonian",
        "kronecker",
        "rmat",
    ],
    "Degree sequences": [
        "configuration-model",
        "directed-configuration-model",
        "bipartite-configuration-model",
        "chung-lu",
    ],
    Communities: [
        "caveman",
        "connected-caveman",
        "ring-of-cliques",
        "planted-partition",
        "stochastic-block-model",
        "degree-corrected-sbm",
        "lfr",
    ],
    Geometric: ["random-geometric", "waxman", "knn", "hyperbolic"],
    "Trees and DAGs": ["random-tree", "random-recursive-tree", "random-dag", "random-order-dag", "wilson-maze"],
    "Flow networks": ["grid-flow-network", "layered-flow-network", "genrmf", "ak"],
};

/** Story names that the spelling rules of tileExportName would get wrong. */
const TILE_NAMES: Partial<Record<string, string>> = {
    forceatlas2: "ForceAtlas2",
    bfs: "BFS",
    arf: "ARF",
    hits: "HITS",
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The name a tile's story was first published under; its export name, and so its story id, comes from it. Never
 * change it: the readable name is tileLabel.
 * @param page - the page
 * @param key - the tile: a layout, algorithm, generator, dataset or format name
 * @returns the name
 */
export function tileExportName(page: GalleryPage, key: string): string {
    const name = TILE_NAMES[key];
    if (name !== undefined) {
        return name;
    }
    if (page === "Layouts") {
        return key.split("-").map(capitalize).join("-");
    }
    return page in ALGORITHM_GROUPS ? capitalize(key) : key;
}

/** The readable names of the algorithms; the call under each picture names the method. */
const ALGORITHM_LABELS: Record<string, string> = {
    pageRank: "PageRank",
    personalizedPageRank: "Personalized PageRank",
    deltaPageRank: "Delta PageRank",
    eigenvectorCentrality: "Eigenvector centrality",
    katzCentrality: "Katz centrality",
    hits: "HITS (hubs and authorities)",
    closenessCentrality: "Closeness centrality",
    nodeClosenessCentrality: "Closeness of one node",
    betweennessCentrality: "Betweenness centrality",
    edgeBetweennessCentrality: "Edge betweenness centrality",
    degreeCentrality: "Degree centrality",
    degrees: "Degrees",
    kCoreDecomposition: "K-core decomposition",
    triangleCount: "Triangle count",
    louvain: "Louvain",
    leiden: "Leiden",
    labelPropagation: "Label propagation",
    labelPropagationSynchronous: "Synchronous label propagation",
    labelPropagationSemiSupervised: "Semi-supervised label propagation",
    girvanNewman: "Girvan-Newman",
    markovClustering: "Markov clustering",
    spectralClustering: "Spectral clustering",
    hierarchicalClustering: "Hierarchical clustering",
    teraHAC: "TeraHAC",
    grsbm: "GRSBM",
    syncClustering: "Sync clustering",
    modularity: "Modularity",
    connectedComponents: "Connected components",
    dijkstra: "Dijkstra",
    bellmanFord: "Bellman-Ford",
    bidirectionalDijkstra: "Bidirectional Dijkstra",
    aStar: "A* search",
    allPairsShortestPath: "All-pairs shortest paths",
    breadthFirstSearch: "Breadth-first search",
    directionOptimizedBfs: "Direction-optimized BFS",
    depthFirstSearch: "Depth-first search",
    kruskalMST: "Kruskal minimum spanning tree",
    primMST: "Prim minimum spanning tree",
    weaklyConnectedComponents: "Weakly connected components",
    stronglyConnectedComponents: "Strongly connected components",
    condensation: "Condensation",
    hasCycle: "Cycle check",
    topologicalSort: "Topological sort",
    isBipartite: "Bipartite check",
    maximumBipartiteMatching: "Maximum bipartite matching",
    greedyBipartiteMatching: "Greedy bipartite matching",
    isGraphIsomorphic: "Isomorphism check",
    findAllIsomorphisms: "All isomorphisms",
    maxFlow: "Maximum flow",
    minSTCut: "Minimum s-t cut",
    stoerWagner: "Stoer-Wagner minimum cut",
    kargerMinCut: "Karger minimum cut",
    commonNeighborsScore: "Common neighbors score",
    adamicAdarScore: "Adamic-Adar score",
    commonNeighborsForPairs: "Common neighbors for pairs",
    adamicAdarForPairs: "Adamic-Adar for pairs",
    commonNeighborsPrediction: "Common neighbors prediction",
    adamicAdarPrediction: "Adamic-Adar prediction",
    topCandidatesForNode: "Top candidates for a node",
    topAdamicAdarCandidatesForNode: "Top Adamic-Adar candidates for a node",
    evaluateCommonNeighbors: "Evaluating common neighbors",
    evaluateAdamicAdar: "Evaluating Adamic-Adar",
    compareAdamicAdarWithCommonNeighbors: "Adamic-Adar against common neighbors",
};

/** The readable names of the generators; the call under each picture names the generator as the extension takes it. */
const GENERATOR_LABELS: Record<GeneratorName, string> = {
    ak: "AK flow network",
    "balanced-tree": "Balanced tree",
    "barabasi-albert": "Barabasi-Albert",
    barbell: "Barbell",
    "bianconi-barabasi": "Bianconi-Barabasi",
    "bipartite-configuration-model": "Bipartite configuration model",
    caveman: "Caveman",
    "chung-lu": "Chung-Lu",
    "circular-ladder": "Circular ladder",
    complete: "Complete",
    "complete-bipartite": "Complete bipartite",
    "complete-multipartite": "Complete multipartite",
    "configuration-model": "Configuration model",
    "connected-caveman": "Connected caveman",
    cycle: "Cycle",
    "degree-corrected-sbm": "Degree-corrected block model",
    "directed-configuration-model": "Directed configuration model",
    "duplication-divergence": "Duplication-divergence",
    empty: "Empty",
    "erdos-renyi": "Erdos-Renyi by edge probability",
    "erdos-renyi-gnm": "Erdos-Renyi by edge count",
    "forest-fire": "Forest fire",
    genrmf: "GENRMF flow network",
    grid: "Grid",
    "grid-3d": "Grid in three dimensions",
    "grid-flow-network": "Grid flow network",
    "hexagonal-lattice": "Hexagonal lattice",
    hyperbolic: "Hyperbolic",
    hypercube: "Hypercube",
    knn: "Nearest neighbors",
    kronecker: "Kronecker",
    ladder: "Ladder",
    "layered-flow-network": "Layered flow network",
    lfr: "LFR benchmark",
    lollipop: "Lollipop",
    "mobius-ladder": "Mobius ladder",
    named: "Named graphs",
    "newman-watts": "Newman-Watts",
    path: "Path",
    petersen: "Petersen",
    "planted-partition": "Planted partition",
    price: "Price citation model",
    "random-apollonian": "Random Apollonian",
    "random-bipartite": "Random bipartite",
    "random-dag": "Random layered DAG",
    "random-geometric": "Random geometric",
    "random-order-dag": "Random DAG by node order",
    "random-recursive-tree": "Random recursive tree",
    "random-regular": "Random regular",
    "random-tree": "Random tree",
    "ring-of-cliques": "Ring of cliques",
    rmat: "R-MAT",
    star: "Star",
    "stochastic-block-model": "Stochastic block model",
    "triangular-lattice": "Triangular lattice",
    "watts-strogatz": "Watts-Strogatz",
    waxman: "Waxman",
    wheel: "Wheel",
    "wilson-maze": "Wilson maze",
};

/** The readable names of the formats and of the two tiles that are not one format. */
const FORMAT_LABELS: Record<string, string> = {
    graphml: "GraphML",
    gexf: "GEXF",
    gml: "GML",
    dot: "DOT (Graphviz)",
    pajek: "Pajek",
    csv: "CSV",
    json: "JSON",
    neo4j: "Neo4j CSV",
    xgmml: "XGMML",
    cx2: "CX2",
    cx: "CX",
    obo: "OBO",
    cys: "Cytoscape session (.cys)",
    auto: "Detecting the format",
    export: "Writing every format",
};

/**
 * The name a reader sees in the sidebar: a layout as a word ("Kamada-Kawai"), an algorithm, generator or format by
 * its readable name ("Personalized PageRank", "Barabasi-Albert", "Neo4j CSV"), a dataset by its title.
 * @param page - the page
 * @param key - the tile
 * @returns the name
 */
export function tileLabel(page: GalleryPage, key: string): string {
    if (page === "Generators") {
        return GENERATOR_LABELS[key as GeneratorName];
    }
    if (page === "Datasets") {
        return DATASETS.find((d) => d.name === key)?.title ?? key;
    }
    if (page === "Formats") {
        return FORMAT_LABELS[key] ?? key;
    }
    if (key === "spring-electrical") {
        return "Spring-electrical";
    }
    return ALGORITHM_LABELS[key] ?? tileExportName(page, key);
}

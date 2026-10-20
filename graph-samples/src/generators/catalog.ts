/**
 * The generator catalogue: every generator as plain data -- its name, a default plain name, one
 * line saying what it builds, and its main parameters with defaults that make a readable graph of
 * at most a few hundred nodes. `generateGraph(name, params)` from `@graphty/graph-samples/generators`
 * runs one. Nothing here is code, so the catalogue survives `JSON.stringify` and loads without the
 * generators themselves.
 */

import { NAMED_GRAPH_NAMES } from "./named.js";

/** One parameter of a generator in the catalogue. */
export interface GeneratorParamDescriptor {
    /** The key `generateGraph` takes it under. */
    readonly name: string;
    /** A default name for it. */
    readonly plainName: string;
    /** "integer" and "number" take a number, "boolean" true or false, "choice" one of `choices`. */
    readonly type: "integer" | "number" | "boolean" | "choice";
    /** The value used when the parameter is not given. */
    readonly default: number | boolean | string;
    /** The smallest value allowed, for a number. */
    readonly min?: number;
    /** The largest value allowed, for a number. */
    readonly max?: number;
    /** The values allowed, for a choice. */
    readonly choices?: readonly string[];
}

/** One generator in the catalogue. */
export interface GeneratorDescriptor {
    /** The name `generateGraph` takes: the generator function's name in kebab case, without "Graph". */
    readonly name: string;
    /** A default name for it. */
    readonly plainName: string;
    /** One sentence saying what it builds. */
    readonly description: string;
    /** Its main parameters; a random generator's last one is `seed`. */
    readonly params: readonly GeneratorParamDescriptor[];
    /**
     * A small picture of what it builds with its default parameters (a 480 x 300 WebP with a
     * transparent background, drawn by graphty-element): its file name beside the datasets' files,
     * so its address is the dataset base URL (`DEFAULT_DATASET_BASE_URL`) plus this name. Absent
     * when it has none.
     */
    readonly thumbnail?: string;
}

/**
 * An integer parameter.
 * @param name - the key
 * @param plainName - the default name
 * @param value - the default value
 * @param min - the smallest value
 * @param max - the largest value, when there is one
 * @returns the descriptor
 */
function int(name: string, plainName: string, value: number, min: number, max?: number): GeneratorParamDescriptor {
    return { name, plainName, type: "integer", default: value, min, ...(max === undefined ? {} : { max }) };
}

/**
 * A real-number parameter.
 * @param name - the key
 * @param plainName - the default name
 * @param value - the default value
 * @param min - the smallest value
 * @param max - the largest value, when there is one
 * @returns the descriptor
 */
function num(name: string, plainName: string, value: number, min: number, max?: number): GeneratorParamDescriptor {
    return { name, plainName, type: "number", default: value, min, ...(max === undefined ? {} : { max }) };
}

/**
 * A probability parameter, in [0, 1].
 * @param name - the key
 * @param plainName - the default name
 * @param value - the default value
 * @returns the descriptor
 */
function prob(name: string, plainName: string, value: number): GeneratorParamDescriptor {
    return num(name, plainName, value, 0, 1);
}

/**
 * A yes-or-no parameter.
 * @param name - the key
 * @param plainName - the default name
 * @param value - the default value
 * @returns the descriptor
 */
function bool(name: string, plainName: string, value: boolean): GeneratorParamDescriptor {
    return { name, plainName, type: "boolean", default: value };
}

/** The seed every random generator takes last. */
const SEED = int("seed", "Seed", 0, 0, Number.MAX_SAFE_INTEGER);

/**
 * The node-count parameter.
 * @param value - the default
 * @param min - the smallest count the generator takes
 * @returns the descriptor
 */
function nodes(value: number, min = 1): GeneratorParamDescriptor {
    return int("n", "Nodes", value, min);
}

/**
 * A generator.
 * @param name - the key
 * @param plainName - the default name
 * @param description - one sentence
 * @param params - the parameters
 * @returns the descriptor
 */
function gen(
    name: string,
    plainName: string,
    description: string,
    params: readonly GeneratorParamDescriptor[],
): GeneratorDescriptor {
    // drawn by tools/render-sample-thumbnails.mjs into thumbnails/, published beside the datasets
    return { name, plainName, description, params, thumbnail: `generator-${name}.webp` };
}

/** Every generator, in alphabetical order of name. */
export const GENERATOR_CATALOG: readonly GeneratorDescriptor[] = Object.freeze([
    gen(
        "ak",
        "AK flow network",
        "A hard maximum-flow instance of 4k + 6 nodes, built to defeat augmenting-path methods.",
        [int("k", "Size", 4, 1, 499_998)],
    ),
    gen("balanced-tree", "Balanced tree", "A rooted tree in which every inner node has the same number of children.", [
        int("branching", "Children per node", 3, 1),
        int("height", "Height", 4, 0),
    ]),
    gen(
        "barabasi-albert",
        "Barabasi-Albert",
        "A scale-free network grown by preferential attachment: new nodes link to well-connected ones.",
        [nodes(150, 2), int("m", "Edges per new node", 2, 1), prob("triadProbability", "Triangle closing", 0), SEED],
    ),
    gen("barbell", "Barbell", "Two complete graphs joined by a path.", [
        int("cliqueSize", "Clique size", 8, 2),
        int("pathLength", "Path length", 6, 0),
    ]),
    gen(
        "bianconi-barabasi",
        "Bianconi-Barabasi",
        "Preferential attachment weighted by a random fitness per node, so a late node can still become a hub.",
        [nodes(150, 2), int("m", "Edges per new node", 2, 1), SEED],
    ),
    gen(
        "bipartite-configuration-model",
        "Bipartite configuration model",
        "A random two-sided network with a set degree on every left node.",
        [
            int("left", "Left nodes", 20, 1),
            int("right", "Right nodes", 30, 1),
            int("degree", "Left degree", 3, 0),
            SEED,
        ],
    ),
    gen("caveman", "Caveman", "Separate complete graphs: the extreme of community structure.", [
        int("cliques", "Cliques", 6, 1),
        int("size", "Clique size", 6, 1),
    ]),
    gen("chung-lu", "Chung-Lu", "A random network whose node degrees follow a power law in expectation.", [
        nodes(150),
        int("minDegree", "Smallest degree", 2, 1),
        int("maxDegree", "Largest degree", 40, 1),
        num("exponent", "Degree exponent", 2.5, 0),
        SEED,
    ]),
    gen("circular-ladder", "Circular ladder", "Two cycles with every pair of matching nodes joined: a prism.", [
        nodes(20, 3),
    ]),
    gen("complete", "Complete graph", "Every node joined to every other node.", [nodes(12)]),
    gen(
        "complete-bipartite",
        "Complete bipartite",
        "Two groups with every node of one joined to every node of the other.",
        [int("a", "First group", 6, 0), int("b", "Second group", 8, 0)],
    ),
    gen(
        "complete-multipartite",
        "Complete multipartite",
        "Several equal groups with every pair of nodes in different groups joined.",
        [int("parts", "Groups", 3, 1), int("partSize", "Group size", 4, 1)],
    ),
    gen(
        "configuration-model",
        "Configuration model",
        "A random network with a power-law degree sequence, wired by pairing edge ends at random.",
        [
            nodes(150),
            int("minDegree", "Smallest degree", 2, 1),
            int("maxDegree", "Largest degree", 20, 1),
            num("exponent", "Degree exponent", 2.5, 0),
            SEED,
        ],
    ),
    gen(
        "connected-caveman",
        "Connected caveman",
        "A ring of near-complete groups, each with one edge rewired to its neighbor group.",
        [int("cliques", "Cliques", 8, 2), int("size", "Clique size", 6, 2)],
    ),
    gen("cycle", "Cycle", "Nodes joined in a single ring.", [nodes(30)]),
    gen(
        "degree-corrected-sbm",
        "Degree-corrected block model",
        "Communities with power-law degrees inside them: a stochastic block model with hubs.",
        [
            int("blocks", "Communities", 3, 1),
            int("blockSize", "Community size", 40, 1),
            int("minDegree", "Smallest degree", 3, 1),
            int("maxDegree", "Largest degree", 15, 1),
            num("exponent", "Degree exponent", 2.5, 0),
            prob("mixing", "Mixing", 0.05),
            SEED,
        ],
    ),
    gen(
        "directed-configuration-model",
        "Directed configuration model",
        "A random directed network in which every node has the same in-degree and out-degree.",
        [nodes(60), int("degree", "Degree", 2, 0), SEED],
    ),
    gen(
        "duplication-divergence",
        "Duplication-divergence",
        "A network grown by copying nodes and losing some copied edges, a model of protein interactions.",
        [nodes(100, 2), num("retention", "Edge retention", 0.4, 0, 1), SEED],
    ),
    gen("empty", "Empty graph", "Nodes with no edges at all.", [nodes(20, 0)]),
    gen(
        "erdos-renyi",
        "Erdos-Renyi",
        "A random network in which every pair of nodes is joined with the same probability.",
        [nodes(100, 0), prob("p", "Edge probability", 0.04), bool("directed", "Directed", false), SEED],
    ),
    gen(
        "erdos-renyi-gnm",
        "Erdos-Renyi (fixed edges)",
        "A random network with an exact number of edges placed uniformly at random.",
        [nodes(100, 0), int("m", "Edges", 200, 0), SEED],
    ),
    gen(
        "forest-fire",
        "Forest fire",
        "A directed network grown by new nodes burning through their neighbors' links, as citation networks grow.",
        [
            nodes(100),
            num("forward", "Forward burning", 0.35, 0, 0.999),
            num("backward", "Backward burning", 0.3, 0),
            SEED,
        ],
    ),
    gen(
        "genrmf",
        "GENRMF flow network",
        "A stack of grid frames joined by random arcs, a standard maximum-flow benchmark.",
        [
            int("a", "Frame side", 3, 1),
            int("b", "Frames", 4, 1),
            int("c1", "Smallest capacity", 1, 0),
            int("c2", "Largest capacity", 100, 0),
            SEED,
        ],
    ),
    gen("grid", "Grid", "A two-dimensional square lattice.", [
        int("rows", "Rows", 15, 1),
        int("cols", "Columns", 15, 1),
        bool("periodic", "Wrap around", false),
        bool("diagonals", "Diagonals", false),
    ]),
    gen("grid-3d", "3D grid", "A three-dimensional cubic lattice.", [
        int("rows", "Rows", 6, 1),
        int("cols", "Columns", 6, 1),
        int("layers", "Layers", 4, 1),
        bool("periodic", "Wrap around", false),
        bool("diagonals", "Diagonals", false),
    ]),
    gen(
        "grid-flow-network",
        "Grid flow network",
        "A grid of arcs with random capacities between a source on the left and a sink on the right.",
        [
            int("rows", "Rows", 8, 1),
            int("cols", "Columns", 8, 2),
            int("minCapacity", "Smallest capacity", 1, 0),
            int("maxCapacity", "Largest capacity", 10, 0),
            SEED,
        ],
    ),
    gen("hexagonal-lattice", "Hexagonal lattice", "A honeycomb of hexagons.", [
        int("rows", "Rows", 6, 1),
        int("cols", "Columns", 8, 1),
    ]),
    gen(
        "hyperbolic",
        "Hyperbolic random graph",
        "Points in the hyperbolic plane joined when close, giving hubs, clustering and short paths at once.",
        [
            nodes(150, 0),
            num("averageDegree", "Average degree", 4, 0.01),
            num("exponent", "Degree exponent", 2.5, 2.01),
            num("temperature", "Temperature", 0, 0, 0.99),
            SEED,
        ],
    ),
    gen("hypercube", "Hypercube", "The corners of a cube in any number of dimensions, joined along its edges.", [
        int("dimension", "Dimensions", 4, 0, 20),
    ]),
    gen("knn", "Nearest neighbors", "Random points, each joined to the points closest to it.", [
        nodes(150, 0),
        int("k", "Neighbors per node", 3, 0),
        bool("directed", "Directed", false),
        SEED,
    ]),
    gen(
        "kronecker",
        "Kronecker graph",
        "A self-similar directed network made by repeatedly multiplying a small core-periphery pattern.",
        [int("power", "Power", 7, 1, 20), SEED],
    ),
    gen("ladder", "Ladder", "Two paths with every pair of matching nodes joined.", [nodes(20)]),
    gen(
        "layered-flow-network",
        "Layered flow network",
        "Layers of nodes between a source and a sink, with random arcs from each layer to the next.",
        [
            int("layers", "Layers", 3, 1),
            int("width", "Layer width", 6, 1),
            prob("p", "Arc probability", 0.5),
            int("minCapacity", "Smallest capacity", 1, 0),
            int("maxCapacity", "Largest capacity", 10, 0),
            SEED,
        ],
    ),
    gen(
        "lfr",
        "LFR benchmark",
        "A benchmark network with planted communities and power-law degrees, for testing community detection.",
        [
            nodes(250),
            int("minDegree", "Smallest degree", 4, 1),
            int("maxDegree", "Largest degree", 30, 1),
            num("degreeExponent", "Degree exponent", 2.5, 0),
            int("minCommunity", "Smallest community", 20, 1),
            int("maxCommunity", "Largest community", 60, 1),
            num("communityExponent", "Community size exponent", 1.5, 0),
            prob("mixing", "Mixing", 0.1),
            SEED,
        ],
    ),
    gen("lollipop", "Lollipop", "A complete graph with a path hanging from it.", [
        int("cliqueSize", "Clique size", 8, 1),
        int("pathLength", "Path length", 10, 0),
    ]),
    gen("mobius-ladder", "Mobius ladder", "A ladder bent into a ring with a half twist.", [nodes(20, 4)]),
    gen("named", "Named graph", "A famous small graph from graph theory, chosen by name.", [
        { name: "name", plainName: "Graph", type: "choice", default: "frucht", choices: NAMED_GRAPH_NAMES },
    ]),
    gen("newman-watts", "Newman-Watts", "A ring lattice with random shortcuts added: a small world.", [
        nodes(60, 3),
        int("k", "Ring neighbors", 4, 2),
        prob("p", "Shortcut probability", 0.1),
        SEED,
    ]),
    gen("path", "Path", "Nodes joined in a single line.", [nodes(30)]),
    gen("petersen", "Petersen graph", "The ten-node graph that is the counterexample to many conjectures.", []),
    gen(
        "planted-partition",
        "Planted partition",
        "Equal groups with dense links inside each group and sparse links between them.",
        [
            int("groups", "Groups", 4, 1),
            int("groupSize", "Group size", 30, 1),
            prob("pIn", "Inside probability", 0.2),
            prob("pOut", "Between probability", 0.005),
            SEED,
        ],
    ),
    gen(
        "price",
        "Price citation model",
        "A directed citation network in which well-cited papers attract more citations.",
        [
            nodes(150),
            int("citations", "Citations per paper", 2, 1),
            num("attractiveness", "Attractiveness", 1, 0.001),
            SEED,
        ],
    ),
    gen(
        "random-apollonian",
        "Random Apollonian network",
        "A planar network grown by repeatedly splitting a random triangle in three.",
        [nodes(40, 3), SEED],
    ),
    gen(
        "random-bipartite",
        "Random bipartite",
        "Two groups with every pair across them joined with the same probability.",
        [int("n1", "First group", 15, 0), int("n2", "Second group", 20, 0), prob("p", "Edge probability", 0.15), SEED],
    ),
    gen("random-dag", "Random layered DAG", "Layers of nodes with random arcs from each layer to the next.", [
        int("layers", "Layers", 5, 1),
        int("width", "Layer width", 8, 1),
        prob("p", "Arc probability", 0.25),
        SEED,
    ]),
    gen(
        "random-geometric",
        "Random geometric",
        "Random points in a square, joined when they are closer than a set distance.",
        [nodes(200, 0), num("radius", "Radius", 0.1, 0), bool("periodic", "Wrap around", false), SEED],
    ),
    gen(
        "random-order-dag",
        "Random ordered DAG",
        "Nodes in a fixed order with each forward arc present at the same probability.",
        [nodes(50, 0), prob("p", "Arc probability", 0.08), SEED],
    ),
    gen(
        "random-recursive-tree",
        "Random recursive tree",
        "A tree grown by attaching each new node to a uniformly random earlier one.",
        [nodes(100), SEED],
    ),
    gen("random-regular", "Random regular", "A random network in which every node has the same degree.", [
        nodes(60, 0),
        int("d", "Degree", 3, 0),
        SEED,
    ]),
    gen("random-tree", "Random tree", "A tree drawn uniformly from all labeled trees on its nodes.", [
        nodes(100),
        SEED,
    ]),
    gen("ring-of-cliques", "Ring of cliques", "Complete graphs joined one to the next in a ring.", [
        int("cliques", "Cliques", 8, 2),
        int("size", "Clique size", 5, 2),
    ]),
    gen("rmat", "R-MAT", "A skewed, scale-free directed network made by recursive quadrant choice, as in Graph500.", [
        int("scale", "Scale (log2 of nodes)", 7, 0, 31),
        int("edgeFactor", "Edges per node", 4, 0),
        SEED,
    ]),
    gen("star", "Star", "One hub joined to every other node.", [nodes(20)]),
    gen(
        "stochastic-block-model",
        "Stochastic block model",
        "Blocks of nodes whose link probability depends only on the two blocks.",
        [
            int("blocks", "Blocks", 3, 1),
            int("blockSize", "Block size", 40, 1),
            prob("pIn", "Inside probability", 0.1),
            prob("pOut", "Between probability", 0.005),
            SEED,
        ],
    ),
    gen("triangular-lattice", "Triangular lattice", "A plane tiled with triangles.", [
        int("rows", "Rows", 8, 1),
        int("cols", "Columns", 10, 1),
    ]),
    gen(
        "watts-strogatz",
        "Watts-Strogatz",
        "A ring lattice with some edges rewired at random: the classic small world.",
        [nodes(60, 3), int("k", "Ring neighbors", 4, 2), prob("beta", "Rewiring probability", 0.1), SEED],
    ),
    gen(
        "waxman",
        "Waxman",
        "Random points joined with a probability that falls with their distance, a model of the Internet.",
        [nodes(200, 0), num("alpha", "Distance scale", 0.05, 0.0001), prob("beta", "Density", 1), SEED],
    ),
    gen("wheel", "Wheel", "A cycle with a hub joined to every node of it.", [nodes(20)]),
    gen("wilson-maze", "Maze", "A random spanning tree of a grid: a perfect maze.", [
        int("rows", "Rows", 12, 1),
        int("cols", "Columns", 12, 1),
        SEED,
    ]),
]);

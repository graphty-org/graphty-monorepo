/**
 * Named small graphs with well-known invariants: the teaching graphs and the platonic solids.
 * The edge lists (node order and edge order) are those of networkx 3.1's `small.py`
 * (A. Hagberg, D. Schult, P. Swart, "Exploring network structure, dynamics, and function using
 * NetworkX", SciPy 2008; BSD-3-Clause), which in turn follow the literature (Krackhardt 1990,
 * Frucht 1939, Tutte 1946, Hoffman and Singleton 1960, Sedgewick 1990). They are mathematical facts;
 * the ordering is frozen like any other generator's. The Petersen graph is `petersenGraph()`.
 */

import { type SampleGraph } from "../types.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** The name of every graph {@link namedGraph} knows. */
export const NAMED_GRAPH_NAMES = [
    "bull",
    "chvatal",
    "cubical",
    "desargues",
    "diamond",
    "dodecahedral",
    "frucht",
    "heawood",
    "hoffman-singleton",
    "house",
    "house-x",
    "icosahedral",
    "krackhardt-kite",
    "moebius-kantor",
    "octahedral",
    "pappus",
    "sedgewick-maze",
    "tetrahedral",
    "truncated-cube",
    "truncated-tetrahedron",
    "tutte",
] as const;

/** A name {@link namedGraph} accepts. */
export type NamedGraphName = (typeof NAMED_GRAPH_NAMES)[number];

/** Node count and flat edge list [u0, v0, u1, v1, ...] of every named graph. */
const GRAPHS: Readonly<Record<NamedGraphName, readonly [number, readonly number[]]>> = {
    // a triangle with two pendant horns; 5 nodes, 5 edges
    bull: [5, [0, 1, 0, 2, 1, 2, 1, 3, 2, 4]],
    // the smallest triangle-free 4-regular 4-chromatic graph; 12 nodes, 24 edges
    chvatal: [
        12,
        [
            0, 1, 0, 4, 0, 6, 0, 9, 1, 2, 1, 5, 1, 7, 2, 3, 2, 6, 2, 8, 3, 4, 3, 7, 3, 9, 4, 5, 4, 8, 5, 10, 5, 11, 6,
            10, 6, 11, 7, 8, 7, 11, 8, 10, 9, 10, 9, 11,
        ],
    ],
    // the cube's skeleton (Q_3); 8 nodes, 12 edges, planar
    cubical: [8, [0, 1, 0, 3, 0, 4, 1, 2, 1, 7, 2, 3, 2, 6, 3, 5, 4, 5, 4, 7, 5, 6, 6, 7]],
    // the Desargues graph, 3-regular, distance-transitive; 20 nodes, 30 edges
    desargues: [
        20,
        [
            0, 1, 0, 19, 0, 5, 1, 2, 1, 16, 2, 3, 2, 11, 3, 4, 3, 14, 4, 5, 4, 9, 5, 6, 6, 7, 6, 15, 7, 8, 7, 18, 8, 9,
            8, 13, 9, 10, 10, 11, 10, 19, 11, 12, 12, 13, 12, 17, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19,
        ],
    ],
    // K_4 minus one edge; 4 nodes, 5 edges
    diamond: [4, [0, 1, 0, 2, 1, 2, 1, 3, 2, 3]],
    // the dodecahedron's skeleton; 20 nodes, 30 edges, planar, 3-regular
    dodecahedral: [
        20,
        [
            0, 1, 0, 19, 0, 10, 1, 2, 1, 8, 2, 3, 2, 6, 3, 4, 3, 19, 4, 5, 4, 17, 5, 6, 5, 15, 6, 7, 7, 8, 7, 14, 8, 9,
            9, 10, 9, 13, 10, 11, 11, 12, 11, 18, 12, 13, 12, 16, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19,
        ],
    ],
    // 3-regular with no non-trivial automorphism; 12 nodes, 18 edges
    frucht: [
        12,
        [
            0, 1, 0, 6, 0, 7, 1, 2, 1, 7, 2, 3, 2, 8, 3, 4, 3, 9, 4, 5, 4, 9, 5, 6, 5, 10, 6, 10, 7, 11, 8, 11, 8, 9,
            10, 11,
        ],
    ],
    // the (3,6)-cage, the Fano plane's incidence graph; 14 nodes, 21 edges
    heawood: [
        14,
        [
            0, 1, 0, 13, 0, 5, 1, 2, 1, 10, 2, 3, 2, 7, 3, 4, 3, 12, 4, 5, 4, 9, 5, 6, 6, 7, 6, 11, 7, 8, 8, 9, 8, 13,
            9, 10, 10, 11, 11, 12, 12, 13,
        ],
    ],
    // the (7,5)-cage, a Moore graph; 50 nodes, 175 edges
    "hoffman-singleton": [
        50,
        [
            0, 1, 0, 2, 0, 3, 0, 6, 0, 7, 0, 8, 0, 9, 1, 17, 1, 12, 1, 26, 1, 27, 1, 28, 1, 29, 2, 10, 2, 11, 2, 13, 2,
            14, 2, 15, 2, 16, 3, 4, 3, 5, 3, 30, 3, 35, 3, 40, 3, 45, 4, 11, 4, 17, 4, 34, 4, 39, 4, 44, 4, 49, 5, 12,
            5, 10, 5, 33, 5, 38, 5, 43, 5, 48, 6, 22, 6, 18, 6, 31, 6, 39, 6, 43, 6, 47, 7, 34, 7, 23, 7, 19, 7, 37, 7,
            41, 7, 48, 8, 33, 8, 36, 8, 24, 8, 20, 8, 42, 8, 49, 9, 32, 9, 38, 9, 44, 9, 25, 9, 21, 9, 46, 10, 17, 10,
            18, 10, 19, 10, 20, 10, 21, 11, 12, 11, 32, 11, 37, 11, 42, 11, 47, 12, 31, 12, 36, 12, 41, 12, 46, 13, 30,
            13, 26, 13, 22, 13, 36, 13, 44, 13, 48, 14, 31, 14, 27, 14, 23, 14, 38, 14, 40, 14, 49, 15, 34, 15, 35, 15,
            28, 15, 24, 15, 43, 15, 46, 16, 33, 16, 39, 16, 41, 16, 45, 16, 29, 16, 25, 17, 22, 17, 23, 17, 24, 17, 25,
            18, 32, 18, 26, 18, 35, 18, 41, 18, 49, 19, 30, 19, 27, 19, 39, 19, 42, 19, 46, 20, 31, 20, 37, 20, 28, 20,
            44, 20, 45, 21, 34, 21, 36, 21, 40, 21, 47, 21, 29, 22, 33, 22, 37, 22, 40, 22, 46, 23, 32, 23, 36, 23, 43,
            23, 45, 24, 30, 24, 38, 24, 41, 24, 47, 25, 31, 25, 35, 25, 42, 25, 48, 26, 34, 26, 38, 26, 42, 26, 45, 27,
            33, 27, 35, 27, 44, 27, 47, 28, 32, 28, 39, 28, 40, 28, 48, 29, 30, 29, 37, 29, 43, 29, 49, 30, 31, 30, 32,
            31, 34, 32, 33, 33, 34, 35, 36, 35, 37, 36, 39, 37, 38, 38, 39, 40, 41, 40, 42, 41, 44, 42, 43, 43, 44, 45,
            46, 45, 47, 46, 49, 47, 48, 48, 49,
        ],
    ],
    // a square with a triangular roof; 5 nodes, 6 edges
    house: [5, [0, 1, 0, 2, 1, 3, 2, 3, 2, 4, 3, 4]],
    // the house with both diagonals of the square; 5 nodes, 8 edges
    "house-x": [5, [0, 1, 0, 2, 0, 3, 1, 3, 1, 2, 2, 3, 2, 4, 3, 4]],
    // the icosahedron's skeleton; 12 nodes, 30 edges, planar, 5-regular
    icosahedral: [
        12,
        [
            0, 1, 0, 5, 0, 7, 0, 8, 0, 11, 1, 2, 1, 5, 1, 6, 1, 8, 2, 3, 2, 6, 2, 8, 2, 9, 3, 4, 3, 6, 3, 9, 3, 10, 4,
            5, 4, 6, 4, 10, 4, 11, 5, 6, 5, 11, 7, 8, 7, 9, 7, 10, 7, 11, 8, 9, 9, 10, 10, 11,
        ],
    ],
    // Krackhardt's kite: degree, betweenness and closeness each crown a different node; 10 nodes, 18 edges
    "krackhardt-kite": [
        10,
        [0, 1, 0, 2, 0, 3, 0, 5, 1, 3, 1, 4, 1, 6, 2, 3, 2, 5, 3, 4, 3, 5, 3, 6, 4, 6, 5, 6, 5, 7, 6, 7, 7, 8, 8, 9],
    ],
    // the Moebius-Kantor graph, the generalized Petersen graph GP(8, 3); 16 nodes, 24 edges
    "moebius-kantor": [
        16,
        [
            0, 1, 0, 15, 0, 5, 1, 2, 1, 12, 2, 3, 2, 7, 3, 4, 3, 14, 4, 5, 4, 9, 5, 6, 6, 7, 6, 11, 7, 8, 8, 9, 8, 13,
            9, 10, 10, 11, 10, 15, 11, 12, 12, 13, 13, 14, 14, 15,
        ],
    ],
    // the octahedron's skeleton, K_{2,2,2}; 6 nodes, 12 edges
    octahedral: [6, [0, 1, 0, 2, 0, 3, 0, 4, 1, 2, 1, 3, 1, 5, 2, 4, 2, 5, 3, 4, 3, 5, 4, 5]],
    // the Pappus graph, 3-regular, bipartite, distance-regular; 18 nodes, 27 edges
    pappus: [
        18,
        [
            0, 1, 0, 17, 0, 5, 1, 2, 1, 8, 2, 3, 2, 13, 3, 4, 3, 10, 4, 5, 4, 15, 5, 6, 6, 7, 6, 11, 7, 8, 7, 14, 8, 9,
            9, 10, 9, 16, 10, 11, 11, 12, 12, 13, 12, 17, 13, 14, 14, 15, 15, 16, 16, 17,
        ],
    ],
    // the small maze of Sedgewick's Algorithms in C (DFS teaching); 8 nodes, 10 edges
    "sedgewick-maze": [8, [0, 2, 0, 7, 0, 5, 1, 7, 2, 6, 3, 4, 3, 5, 4, 5, 4, 7, 4, 6]],
    // the tetrahedron's skeleton, K_4; 4 nodes, 6 edges
    tetrahedral: [4, [0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3]],
    // the truncated cube's skeleton; 24 nodes, 36 edges, planar
    "truncated-cube": [
        24,
        [
            0, 1, 0, 2, 0, 4, 1, 11, 1, 14, 2, 3, 2, 4, 3, 6, 3, 8, 4, 5, 5, 16, 5, 18, 6, 7, 6, 8, 7, 10, 7, 12, 8, 9,
            9, 17, 9, 20, 10, 11, 10, 12, 11, 14, 12, 13, 13, 21, 13, 22, 14, 15, 15, 19, 15, 23, 16, 17, 16, 18, 17,
            20, 18, 19, 19, 23, 20, 21, 21, 22, 22, 23,
        ],
    ],
    // the truncated tetrahedron's skeleton; 12 nodes, 18 edges, planar
    "truncated-tetrahedron": [
        12,
        [
            0, 1, 0, 2, 0, 9, 1, 2, 1, 6, 2, 3, 3, 4, 3, 11, 4, 5, 4, 11, 5, 6, 5, 7, 6, 7, 7, 8, 8, 9, 8, 10, 9, 10,
            10, 11,
        ],
    ],
    // Tutte's graph: 3-regular, 3-connected, planar and not Hamiltonian; 46 nodes, 69 edges
    tutte: [
        46,
        [
            0, 1, 0, 2, 0, 3, 1, 4, 1, 26, 2, 10, 2, 11, 3, 18, 3, 19, 4, 5, 4, 33, 5, 6, 5, 29, 6, 7, 6, 27, 7, 8, 7,
            14, 8, 9, 8, 38, 9, 10, 9, 37, 10, 39, 11, 12, 11, 39, 12, 13, 12, 35, 13, 14, 13, 15, 14, 34, 15, 16, 15,
            22, 16, 17, 16, 44, 17, 18, 17, 43, 18, 45, 19, 20, 19, 45, 20, 21, 20, 41, 21, 22, 21, 23, 22, 40, 23, 24,
            23, 27, 24, 25, 24, 32, 25, 26, 25, 31, 26, 33, 27, 28, 28, 29, 28, 32, 29, 30, 30, 31, 30, 33, 31, 32, 34,
            35, 34, 38, 35, 36, 36, 37, 36, 39, 37, 38, 40, 41, 40, 44, 41, 42, 42, 43, 42, 45, 43, 44,
        ],
    ],
};

/**
 * A named small graph (see {@link NAMED_GRAPH_NAMES}): an undirected simple graph with networkx's
 * node and edge order.
 * @param name - the graph's name
 * @param options - the common weight options
 * @returns the graph
 */
export function namedGraph(name: NamedGraphName, options: WeightOptions = {}): SampleGraph {
    const entry = Object.prototype.hasOwnProperty.call(GRAPHS, name) ? GRAPHS[name] : undefined;
    if (entry === undefined) {
        throw new RangeError(`unknown named graph "${name}"; see NAMED_GRAPH_NAMES`);
    }
    const [nodeCount, flat] = entry;
    const m = flat.length / 2;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        src[e] = flat[2 * e];
        dst[e] = flat[2 * e + 1];
    }
    return applyWeights({ directed: false, nodeCount, src, dst }, options);
}

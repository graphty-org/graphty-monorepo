/**
 * The graphs the planar characterization test pins: planar ones of every shape the shift method meets (tiny,
 * disconnected, triangulated, thinned, trees, lattices) and non-planar ones it must refuse.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import {
    completeGraph,
    gridGraph,
    hexagonalLatticeGraph,
    ladderGraph,
    petersenGraph,
    randomApollonianGraph,
    randomTreeGraph,
    triangularLatticeGraph,
    wheelGraph,
} from "@graphty/graph-samples/generators";

type Edges = readonly (readonly [number, number])[];

const graph = (n: number, edges: Edges = []): GraphSnapshot =>
    fromEdgeArrays({
        directed: false,
        nodeCount: n,
        src: Uint32Array.from(edges.map(([u]) => u)),
        dst: Uint32Array.from(edges.map(([, v]) => v)),
    });

const pathEdges = (n: number): [number, number][] => Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);

/** A maximal planar graph with every `k`th edge removed: planar, with faces of every size. */
function thinned(n: number, seed: number, k: number): GraphSnapshot {
    const g = randomApollonianGraph({ n, seed });
    const kept: [number, number][] = [];
    for (let e = 0; e < g.src.length; e++) {
        if (e % k !== 0) {
            kept.push([g.src[e], g.dst[e]]);
        }
    }
    return graph(g.nodeCount, kept);
}

const K5: Edges = [0, 1, 2, 3, 4].flatMap((u) => [0, 1, 2, 3, 4].filter((v) => v > u).map((v) => [u, v] as const));
const K33: Edges = [0, 1, 2].flatMap((u) => [3, 4, 5].map((v) => [u, v] as const));

/**
 * Planar graphs, by name.
 * @returns name and snapshot pairs
 */
export function planarCases(): [string, GraphSnapshot][] {
    const cases: [string, GraphSnapshot][] = [
        ["empty", graph(0)],
        ["one node", graph(1)],
        ["two nodes", graph(2, [[0, 1]])],
        ["three isolated", graph(3)],
        [
            "triangle",
            graph(3, [
                [0, 1],
                [1, 2],
                [2, 0],
            ]),
        ],
        ["path 4", graph(4, pathEdges(4))],
        ["four isolated", graph(4)],
        [
            "star 6",
            graph(
                7,
                [1, 2, 3, 4, 5, 6].map((v) => [0, v] as const),
            ),
        ],
        ["cycle 9", graph(9, [...pathEdges(9), [8, 0]])],
        ["K4", fromEdgeArrays(completeGraph({ n: 4 }))],
        [
            "K2,5",
            graph(
                7,
                [0, 1].flatMap((u) => [2, 3, 4, 5, 6].map((v) => [u, v] as const)),
            ),
        ],
        ["path 30", graph(30, pathEdges(30))],
        [
            "triangle and isolated nodes",
            graph(8, [
                [0, 1],
                [1, 2],
                [2, 0],
            ]),
        ],
        [
            "two triangles and a path",
            graph(9, [
                [0, 1],
                [1, 2],
                [2, 0],
                [3, 4],
                [4, 5],
                [5, 3],
                [6, 7],
                [7, 8],
            ]),
        ],
        ["grid 3x4", fromEdgeArrays(gridGraph({ rows: 3, cols: 4 }))],
        ["grid 6x6", fromEdgeArrays(gridGraph({ rows: 6, cols: 6 }))],
        ["wheel 7", fromEdgeArrays(wheelGraph({ n: 7 }))],
        ["wheel 12", fromEdgeArrays(wheelGraph({ n: 12 }))],
        ["triangular lattice", fromEdgeArrays(triangularLatticeGraph({ rows: 5, cols: 6 }))],
        ["hexagonal lattice", fromEdgeArrays(hexagonalLatticeGraph({ rows: 3, cols: 4 }))],
        ["ladder", fromEdgeArrays(ladderGraph({ n: 8 }))],
        ["random apollonian 300", fromEdgeArrays(randomApollonianGraph({ n: 300, seed: 7 }))],
        ["thinned apollonian 200", thinned(200, 11, 2)],
    ];
    for (let seed = 1; seed <= 4; seed++) {
        cases.push(
            [`random tree ${seed}`, fromEdgeArrays(randomTreeGraph({ n: 40, seed }))],
            [`random apollonian ${seed}`, fromEdgeArrays(randomApollonianGraph({ n: 40, seed }))],
            [`thinned apollonian ${seed}`, thinned(50, seed + 100, 3)],
        );
    }
    return cases;
}

/**
 * Non-planar graphs, by name.
 * @returns name and snapshot pairs
 */
export function nonPlanarCases(): [string, GraphSnapshot][] {
    return [
        ["K5", graph(5, K5)],
        ["K3,3", graph(6, K33)],
        ["K7", fromEdgeArrays(completeGraph({ n: 7 }))],
        ["Petersen", fromEdgeArrays(petersenGraph())],
    ];
}

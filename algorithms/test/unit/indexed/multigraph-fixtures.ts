/**
 * Multigraph fixtures for the ports that give a multigraph simple-graph semantics (betweenness, closeness,
 * degree): the snapshot keeps every parallel edge and self-loop, and its legacy twin is the same edge list
 * added to a `Graph` with `allowParallelEdges`, which keeps one edge per pair -- the graph those ports must
 * agree with.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import { Graph } from "../../../src/core/graph.js";

interface MultigraphFixture {
    readonly name: string;
    readonly snapshot: GraphSnapshot;
    readonly legacy: Graph;
}

type EdgeSpec = readonly [string | number, string | number];

function build(directed: boolean, edges: readonly EdgeSpec[]): { snapshot: GraphSnapshot; legacy: Graph } {
    const b = new GraphBuilder({ directed });
    const legacy = new Graph({ directed, allowParallelEdges: true });
    for (const [u, v] of edges) {
        b.addEdge(u, v);
        legacy.addEdge(u, v);
    }
    return { snapshot: b.freeze({ checksum: true }), legacy };
}

// a to d runs through b or through c; the a-b side is tripled, which must not make it three paths
const UNDIRECTED: readonly EdgeSpec[] = [
    ["a", "b"],
    ["a", "b"],
    ["b", "a"],
    ["b", "d"],
    ["a", "c"],
    ["c", "d"],
    ["c", "c"],
    ["d", "e"],
    ["e", "f"],
    ["e", "f"],
];

const DIRECTED: readonly EdgeSpec[] = [
    ["a", "b"],
    ["a", "b"],
    ["b", "a"],
    ["b", "d"],
    ["a", "c"],
    ["c", "d"],
    ["c", "c"],
    ["d", "a"],
    ["d", "a"],
    ["d", "e"],
];

/**
 * An undirected and a directed multigraph, each with parallel edges on one side of two equally short
 * routes, a reciprocal pair and a self-loop.
 */
export function multigraphFixtures(): MultigraphFixture[] {
    return [
        { name: "undirected multigraph with a self-loop", ...build(false, UNDIRECTED) },
        { name: "directed multigraph with a self-loop", ...build(true, DIRECTED) },
    ];
}

/** Numeric ids starting at 0, the ids a truthiness check on a node id used to drop. */
export function numericIdsFromZero(): Graph {
    const g = new Graph({ directed: false });
    for (const [u, v] of [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 4],
        [4, 3],
    ]) {
        g.addEdge(u, v);
    }
    return g;
}

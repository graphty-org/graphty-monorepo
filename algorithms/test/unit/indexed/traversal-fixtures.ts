/**
 * The fixtures the traversal ports are compared against their legacy counterparts on, and the two
 * rewrites of a fixture the comparison needs: a multigraph with every edge doubled, and the same
 * graph renumbered in the node order the legacy `CSRGraph` uses.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import { Graph } from "../../../src/core/graph.js";
import type { NodeId } from "../../../src/types/index.js";
import type { FacadeFixture } from "../../helpers/facade-differential.js";
import { directedFixtures, gnm, undirectedFixtures } from "./port-fixtures.js";

/** A seeded directed acyclic graph whose topological order is NOT the node-insertion order. */
function randomDag(nodeCount: number, edgeCount: number, seed: number): Graph {
    // Nodes are inserted in a scrambled rank order and every edge points from lower rank to higher.
    const g = new Graph({ directed: true });
    const rank: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
        rank.push((i * 7919 + seed) % nodeCount);
    }
    for (let i = 0; i < nodeCount; i++) {
        g.addNode(`r${rank[i]}`);
    }
    const random = gnm(nodeCount, edgeCount, false, seed);
    for (const edge of random.edges()) {
        const a = Number(String(edge.source).slice(1));
        const b = Number(String(edge.target).slice(1));
        g.addEdge(`r${Math.min(a, b)}`, `r${Math.max(a, b)}`);
    }
    return g;
}

function evenCycleWithTail(): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < 6; i++) {
        g.addEdge(`c${i}`, `c${(i + 1) % 6}`);
    }
    g.addEdge("c3", "t0");
    g.addEdge("t0", "t1");
    g.addNode("alone");
    g.addEdge("x", "y");
    return g;
}

function randomBipartite(left: number, right: number, edges: number, seed: number): Graph {
    const g = new Graph({ directed: false });
    const random = gnm(left + right, edges * 4, false, seed);
    let added = 0;
    for (const edge of random.edges()) {
        const a = Number(String(edge.source).slice(1));
        const b = Number(String(edge.target).slice(1));
        if (added < edges && a < left !== b < left && !g.hasEdge(`n${a}`, `n${b}`)) {
            g.addEdge(`n${a}`, `n${b}`);
            added++;
        }
    }
    return g;
}

/** Numeric ids (legacy keeps them numbers) and a self-loop on a directed cycle. */
function numericDirectedWithLoop(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge(3, 1);
    g.addEdge(1, 2);
    g.addEdge(2, 3);
    g.addEdge(2, 2);
    g.addEdge(4, 5);
    g.addNode(0);
    return g;
}

function withSelfLoops(graph: Graph, every: number): Graph {
    const g = graph.clone();
    let i = 0;
    for (const node of [...g.nodes()]) {
        if (i++ % every === 0) {
            g.addEdge(node.id, node.id);
        }
    }
    return g;
}

/** Every undirected fixture, with bipartite ones and self-loops added to the shared list. */
export function undirectedTraversalFixtures(): FacadeFixture[] {
    return [
        ...undirectedFixtures(),
        { name: "even cycle with a tail, a lone edge and an isolated node", graph: evenCycleWithTail() },
        { name: "random bipartite 12 + 15 nodes, 40 edges", graph: randomBipartite(12, 15, 40, 424242) },
        { name: "random 30 nodes, 60 edges, self-loops", graph: withSelfLoops(gnm(30, 60, false, 97), 7) },
        { name: "empty", graph: new Graph({ directed: false }) },
    ];
}

/** Every directed fixture, with DAGs and self-loops added to the shared list. */
export function directedTraversalFixtures(): FacadeFixture[] {
    return [
        ...directedFixtures(),
        { name: "random DAG 30 nodes, 70 edges", graph: randomDag(30, 70, 5) },
        { name: "random DAG 60 nodes, 200 edges", graph: randomDag(60, 200, 11) },
        { name: "numeric ids, a cycle with a self-loop", graph: numericDirectedWithLoop() },
        { name: "random directed 30 nodes, 45 edges, self-loops", graph: withSelfLoops(gnm(30, 45, true, 31), 5) },
        { name: "empty directed", graph: new Graph({ directed: true }) },
    ];
}

/**
 * The same graph with every adjacency Map in node-index order: nodes re-added in their original
 * order (or sorted by `nodeOrder`), then edges sorted by (lower index, higher index) -- (source,
 * target) when directed -- so each node meets its neighbours in ascending index order, which is how
 * a snapshot row and a legacy `CSRGraph` row are sorted.
 * @param graph - A legacy fixture
 * @param nodeOrder - Re-add the nodes sorted by this comparator instead of in their original order
 * @returns A new legacy graph with the same nodes and edges
 */
export function inIndexOrder(graph: Graph, nodeOrder?: (a: NodeId, b: NodeId) => number): Graph {
    const out = new Graph({ directed: graph.isDirected });
    const index = new Map<NodeId, number>();
    const nodes = [...graph.nodes()];
    if (nodeOrder !== undefined) {
        nodes.sort((a, b) => nodeOrder(a.id, b.id));
    }
    for (const node of nodes) {
        index.set(node.id, index.size);
        out.addNode(node.id);
    }
    const key = (u: NodeId, v: NodeId): [number, number] => {
        const a = index.get(u) ?? 0;
        const b = index.get(v) ?? 0;
        return graph.isDirected || a <= b ? [a, b] : [b, a];
    };
    const edges = [...graph.edges()].sort((e, f) => {
        const [a, b] = key(e.source, e.target);
        const [c, d] = key(f.source, f.target);
        return a - c || b - d;
    });
    for (const edge of edges) {
        out.addEdge(edge.source, edge.target, edge.weight);
    }
    return out;
}

/**
 * A MULTIGRAPH snapshot of a legacy fixture: the same nodes in the same order, every edge added
 * twice (a legacy `Graph` cannot hold a parallel pair) and a self-loop kept once. A simple-graph
 * traversal over it must give the legacy answer for the fixture, since a parallel arc only ever
 * leads to a node the first arc already reached.
 * @param graph - A legacy fixture
 * @returns A checksummed multigraph snapshot with the fixture's index space
 */
export function doubledSnapshot(graph: Graph): GraphSnapshot {
    const b = new GraphBuilder({ directed: graph.isDirected });
    for (const node of graph.nodes()) {
        b.addNode(node.id);
    }
    for (const edge of graph.edges()) {
        b.addEdge(edge.source, edge.target, edge.weight);
        if (edge.source !== edge.target) {
            b.addEdge(edge.source, edge.target, edge.weight);
        }
    }
    return b.freeze({ checksum: true });
}

/**
 * The order the legacy `CSRGraph` numbers nodes in (`src/optimized/csr-graph.ts`, `buildCSR`):
 * numbers numerically, anything else by `localeCompare`. Pass it to `inIndexOrder` to give a
 * snapshot the index space the legacy direction-optimised BFS works in.
 * @param a - A node id
 * @param b - A node id
 * @returns The comparison
 */
export function legacyCsrOrder(a: NodeId, b: NodeId): number {
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }
    return String(a).localeCompare(String(b));
}

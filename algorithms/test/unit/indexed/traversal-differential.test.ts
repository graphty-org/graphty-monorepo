/**
 * The traversal ports against their legacy counterparts. Order-dependent results (visit orders, DFS
 * trees, topological orders, Tarjan's completion-order labels, the condensation numbering, BFS
 * parents) are compared on each fixture rebuilt in index order, where legacy and the snapshot try
 * neighbours in the same order; order-free results are compared on the fixture as built as well.
 * Each is also run on a multigraph with every edge doubled and must still give the legacy answer.
 * Every port call is followed by `validate({ checksum: true })`.
 */

import { type GraphSnapshot, INVALID_INDEX, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    condensationGraph,
    stronglyConnectedComponents as legacyScc,
} from "../../../src/algorithms/components/connected.js";
import { bipartitePartition } from "../../../src/algorithms/matching/bipartite.js";
import {
    breadthFirstSearch as legacyBfs,
    isBipartite as legacyIsBipartite,
} from "../../../src/algorithms/traversal/bfs-unified.js";
import {
    depthFirstSearch as legacyDfs,
    findStronglyConnectedComponents,
    hasCycleDFS,
    topologicalSort as legacyTopologicalSort,
} from "../../../src/algorithms/traversal/dfs.js";
import type { Graph } from "../../../src/core/graph.js";
import { breadthFirstSearch, directionOptimizedBfs } from "../../../src/indexed/bfs.js";
import { isBipartite } from "../../../src/indexed/bipartite.js";
import { depthFirstSearch, hasCycle, topologicalSort } from "../../../src/indexed/dfs.js";
import { condensation, stronglyConnectedComponents } from "../../../src/indexed/scc.js";
import { directionOptimizedBFS } from "../../../src/optimized/direction-optimized-bfs.js";
import { toCSRGraph } from "../../../src/optimized/graph-adapter.js";
import type { NodeId } from "../../../src/types/index.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import {
    directedTraversalFixtures,
    doubledSnapshot,
    inIndexOrder,
    legacyCsrOrder,
    undirectedTraversalFixtures,
} from "./traversal-fixtures.js";

interface Case {
    readonly name: string;
    readonly graph: Graph;
    readonly s: GraphSnapshot;
}

/** Each fixture in index order, paired with its simple snapshot and its doubled multigraph. */
function cases(fixtures: { name: string; graph: Graph }[], nodeOrder?: (a: NodeId, b: NodeId) => number): Case[] {
    const out: Case[] = [];
    for (const f of fixtures) {
        const graph = inIndexOrder(f.graph, nodeOrder);
        out.push({ name: f.name, graph, s: checksummedSnapshot(graph) });
        out.push({ name: `${f.name} (every edge doubled)`, graph, s: doubledSnapshot(graph) });
    }
    return out;
}

/** The fixtures as built, where only order-free results are expected to agree. */
function asBuilt(fixtures: { name: string; graph: Graph }[]): Case[] {
    return fixtures.map((f) => ({ name: f.name, graph: f.graph, s: checksummedSnapshot(f.graph) }));
}

const undirected = undirectedTraversalFixtures();
const directed = directedTraversalFixtures();
const all = [...undirected, ...directed];

function ids(s: GraphSnapshot, indices: ArrayLike<number>): NodeId[] {
    return Array.from(indices, (i) => s.ids.idOf(i) as NodeId);
}

function parentMap(s: GraphSnapshot, order: ArrayLike<number>, parent: ArrayLike<number>): Map<NodeId, NodeId | null> {
    const tree = new Map<NodeId, NodeId | null>();
    for (const i of Array.from(order)) {
        tree.set(s.ids.idOf(i) as NodeId, parent[i] === INVALID_INDEX ? null : (s.ids.idOf(parent[i]) as NodeId));
    }
    return tree;
}

/** Start nodes: the first, one in the middle and the last node of the fixture. */
function starts(s: GraphSnapshot): number[] {
    return s.nodeCount === 0 ? [] : [...new Set([0, s.nodeCount >> 1, s.nodeCount - 1])];
}

function sortedStrings(values: Iterable<NodeId>): string[] {
    return [...values].map(String).sort();
}

describe("indexed.depthFirstSearch against legacy depthFirstSearch", () => {
    it("gives the pre-order, the tree and the depths on every fixture", () => {
        for (const { name, graph, s } of cases(all)) {
            for (const start of starts(s)) {
                const at = `${name} from ${String(s.ids.idOf(start))}`;
                const legacyDepths = new Map<NodeId, number>();
                const legacy = legacyDfs(graph, s.ids.idOf(start) as NodeId, {
                    visitCallback: (node, depth) => legacyDepths.set(node, depth),
                });
                const port = depthFirstSearch(s, start);
                s.validate({ checksum: true });
                expect(ids(s, port.order), at).toEqual(legacy.order);
                expect(port.visitedCount, at).toBe(legacy.visited.size);
                expect([...parentMap(s, port.order, port.parent)], at).toEqual([...legacy.tree]);
                expect(
                    Array.from(port.order, (i) => port.depth[i]),
                    at,
                ).toEqual(legacy.order.map((id) => legacyDepths.get(id)));
            }
        }
    });

    it("gives the post-order on every fixture", () => {
        for (const { name, graph, s } of cases(all)) {
            for (const start of starts(s)) {
                const legacy = legacyDfs(graph, s.ids.idOf(start) as NodeId, { preOrder: false });
                const port = depthFirstSearch(s, start, { order: "post" });
                s.validate({ checksum: true });
                expect(ids(s, port.order), name).toEqual(legacy.order);
                expect([...parentMap(s, port.order, port.parent)].sort(), name).toEqual([...legacy.tree].sort());
            }
        }
    });

    it("stops at the target where legacy does", () => {
        for (const { name, graph, s } of cases(all)) {
            if (s.nodeCount < 3) {
                continue;
            }
            const full = depthFirstSearch(s, 0);
            const target = full.order[full.visitedCount >> 1];
            const legacy = legacyDfs(graph, s.ids.idOf(0) as NodeId, { targetNode: s.ids.idOf(target) as NodeId });
            const port = depthFirstSearch(s, 0, { target });
            s.validate({ checksum: true });
            expect(ids(s, port.order), name).toEqual(legacy.order);
            expect([...parentMap(s, port.order, port.parent)], name).toEqual([...legacy.tree]);
        }
    });
});

describe("indexed.hasCycle against legacy hasCycleDFS", () => {
    it("agrees on every fixture, as built and in index order", () => {
        for (const { name, graph, s } of [...asBuilt(all), ...cases(all)]) {
            const port = hasCycle(s);
            s.validate({ checksum: true });
            expect(port, name).toBe(hasCycleDFS(graph));
        }
    });
});

describe("indexed.topologicalSort against legacy topologicalSort", () => {
    it("gives the same order, or null, on every directed fixture", () => {
        let sorted = 0;
        for (const { name, graph, s } of cases(directed)) {
            const legacy = legacyTopologicalSort(graph);
            const port = topologicalSort(s);
            s.validate({ checksum: true });
            expect(port === null ? null : ids(s, port), name).toEqual(legacy);
            sorted += legacy === null ? 0 : 1;
        }
        // The DAGs, the empty graph and the hub-and-leaves graph, each simple and doubled.
        expect(sorted).toBe(8);
    });
});

describe("indexed.isBipartite against legacy isBipartite and bipartitePartition", () => {
    it("gives the same answer and the same two sides on every fixture, as built and in index order", () => {
        let bipartite = 0;
        for (const { name, graph, s } of [...asBuilt(all), ...cases(all)]) {
            const port = isBipartite(s);
            s.validate({ checksum: true });
            if (!graph.isDirected) {
                expect(port.bipartite, name).toBe(legacyIsBipartite(graph));
            }
            const partition = bipartitePartition(graph);
            expect(port.bipartite, name).toBe(partition !== null);
            if (partition === null) {
                expect(port.sides, name).toBeNull();
                continue;
            }
            bipartite++;
            const { sides } = port;
            expect(sides, name).not.toBeNull();
            const left: NodeId[] = [];
            const right: NodeId[] = [];
            for (let i = 0; i < s.nodeCount; i++) {
                (sides !== null && maskTest(sides, i) ? right : left).push(s.ids.idOf(i) as NodeId);
            }
            expect(sortedStrings(left), name).toEqual(sortedStrings(partition.left));
            expect(sortedStrings(right), name).toEqual(sortedStrings(partition.right));
        }
        expect(bipartite).toBeGreaterThan(10);
    });
});

describe("indexed.stronglyConnectedComponents against legacy Tarjan and Kosaraju", () => {
    it("labels every node with its legacy component index", () => {
        for (const { name, graph, s } of cases(directed)) {
            const port = stronglyConnectedComponents(s);
            s.validate({ checksum: true });
            const legacy = legacyScc(graph);
            expect(port.count, name).toBe(legacy.length);
            const expected = new Map<NodeId, number>();
            legacy.forEach((members, label) => {
                for (const id of members) {
                    expected.set(id, label);
                }
            });
            expect(
                Array.from(port.labels, (_, i) => expected.get(s.ids.idOf(i) as NodeId)),
                name,
            ).toEqual(Array.from(port.labels));
        }
    });

    it("gives the same partition as both legacy functions on the fixtures as built", () => {
        const partition = (groups: Iterable<Iterable<NodeId>>): string[] =>
            [...groups].map((g) => sortedStrings(g).join(",")).sort();
        for (const { name, graph, s } of asBuilt(directed)) {
            const port = stronglyConnectedComponents(s);
            s.validate({ checksum: true });
            const groups = port.groups().map((g) => ids(s, g));
            expect(partition(groups), name).toEqual(partition(legacyScc(graph)));
            expect(partition(groups), name).toEqual(partition(findStronglyConnectedComponents(graph)));
        }
    });
});

describe("indexed.condensation against legacy condensationGraph", () => {
    it("gives the componentMap, the component numbering and the condensed edges", () => {
        for (const { name, graph, s } of cases(directed)) {
            const { components, condensed } = condensation(s);
            s.validate({ checksum: true });
            const legacy = condensationGraph(graph);
            const portMap = Array.from(components.labels, (label, i) => [s.ids.idOf(i), label]);
            expect(portMap.sort(), name).toEqual([...legacy.componentMap].sort());

            const d = condensed.snapshot;
            expect(d.directed, name).toBe(true);
            expect(d.nodeCount, name).toBe(legacy.condensedGraph.nodeCount);
            expect(Array.from(condensed.nodeRemap ?? []), name).toEqual(Array.from(components.labels));
            const el = d.edgeList();
            const portEdges: string[] = [];
            for (let e = 0; e < d.edgeCount; e++) {
                portEdges.push(`${String(el.src[e])}->${String(el.dst[e])}`);
            }
            const legacyEdges = [...legacy.condensedGraph.edges()].map(
                (e) => `${String(e.source)}->${String(e.target)}`,
            );
            expect(portEdges.sort(), name).toEqual(legacyEdges.sort());
            d.validate();
        }
    });
});

describe("indexed.directionOptimizedBfs against legacy directionOptimizedBFS", () => {
    it("gives the legacy distances on every fixture as built, and the legacy parents in legacy CSR order", () => {
        // Legacy numbers nodes by sorted id, not by insertion, and so picks the frontier node with
        // the lowest id where the port picks the lowest index: the two agree once they coincide.
        for (const [list, compareParents] of [
            [asBuilt(all), false],
            [cases(all, legacyCsrOrder), true],
        ] as const) {
            for (const { name, graph, s } of list) {
                for (const start of starts(s)) {
                    const at = `${name} from ${String(s.ids.idOf(start))}`;
                    const legacy = directionOptimizedBFS(toCSRGraph(graph), s.ids.idOf(start) as NodeId);
                    const port = directionOptimizedBfs(s, start);
                    s.validate({ checksum: true });
                    expect(port.visitedCount, at).toBe(legacy.visitedCount);
                    const depths = new Map<NodeId, number>();
                    for (const i of Array.from(port.order)) {
                        depths.set(s.ids.idOf(i) as NodeId, port.depth[i]);
                    }
                    expect([...depths].sort(), at).toEqual([...legacy.distances].sort());
                    if (compareParents) {
                        expect([...parentMap(s, port.order, port.parent)].sort(), at).toEqual(
                            [...legacy.parents].sort(),
                        );
                    }
                }
            }
        }
    });

    it("answers the same whichever direction every step takes", () => {
        for (const { name, s } of cases(all)) {
            for (const start of starts(s)) {
                const plain = breadthFirstSearch(s, start);
                // alpha near 0 never leaves top-down; alpha and beta huge switch to bottom-up at once and stay.
                const topDown = directionOptimizedBfs(s, start, { alpha: Number.MIN_VALUE });
                const bottomUp = directionOptimizedBfs(s, start, { alpha: Number.MAX_VALUE, beta: Number.MAX_VALUE });
                const mixed = directionOptimizedBfs(s, start);
                s.validate({ checksum: true });
                for (const r of [topDown, bottomUp]) {
                    expect(Array.from(r.depth), name).toEqual(Array.from(plain.depth));
                    expect(Array.from(r.parent), name).toEqual(Array.from(mixed.parent));
                    expect(Array.from(r.order), name).toEqual(Array.from(mixed.order));
                }
            }
        }
    });
});

describe("indexed.breadthFirstSearch target option against legacy breadthFirstSearch", () => {
    it("stops where legacy stops, visiting the same nodes with the same tree", () => {
        for (const { name, graph, s } of cases(all)) {
            if (s.nodeCount < 3) {
                continue;
            }
            const full = breadthFirstSearch(s, 0);
            for (const target of [full.order[full.visitedCount - 1], full.order[full.visitedCount >> 1]]) {
                const legacy = legacyBfs(graph, s.ids.idOf(0) as NodeId, { targetNode: s.ids.idOf(target) as NodeId });
                const port = breadthFirstSearch(s, 0, { target });
                s.validate({ checksum: true });
                const visited = ids(s, port.order);
                expect(visited, name).toEqual([...legacy.visited]);
                // legacy.order lists the nodes it expanded: the visit order up to and including the target.
                expect(visited.slice(0, visited.indexOf(s.ids.idOf(target) as NodeId) + 1), name).toEqual(legacy.order);
                expect([...parentMap(s, port.order, port.parent)], name).toEqual([...legacy.tree]);
            }
        }
    });
});

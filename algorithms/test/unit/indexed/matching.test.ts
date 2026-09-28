import { GraphBuilder, type GraphSnapshot, INVALID_INDEX, makeMask, maskSet, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    greedyBipartiteMatching as legacyGreedy,
    maximumBipartiteMatching as legacyMaximum,
} from "../../../src/algorithms/matching/bipartite.js";
import { Graph } from "../../../src/core/graph.js";
import { isBipartite } from "../../../src/indexed/bipartite.js";
import {
    type BipartiteMatchingResult,
    greedyBipartiteMatching,
    maximumBipartiteMatching,
} from "../../../src/indexed/matching.js";
import type { NodeId } from "../../../src/types/index.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

/** A seeded bipartite graph: `left` nodes l0.., `right` nodes r0.., `edges` random cross edges. */
function randomBipartite(left: number, right: number, edges: number, seed: number, directed = false): Graph {
    const g = new Graph({ directed });
    let state = seed >>> 0;
    const random = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    // Interleave the two sides so the node order is not "all left, then all right" -- except on a
    // directed graph, where the legacy colouring follows out-arcs only and finds the two sides
    // only when every arc's source comes first.
    for (let i = 0; i < Math.max(left, right); i++) {
        if (i < right && !directed) {
            g.addNode(`r${i}`);
        }
        if (i < left) {
            g.addNode(`l${i}`);
        }
    }
    for (let i = 0; directed && i < right; i++) {
        g.addNode(`r${i}`);
    }
    let added = 0;
    for (let guard = 0; added < edges && guard < edges * 100; guard++) {
        const u = `l${Math.floor(random() * left)}`;
        const v = `r${Math.floor(random() * right)}`;
        if (!g.hasEdge(u, v)) {
            g.addEdge(u, v);
            added++;
        }
    }
    return g;
}

function completeBipartite(a: number, b: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < a; i++) {
        for (let j = 0; j < b; j++) {
            g.addEdge(`a${i}`, `b${j}`);
        }
    }
    return g;
}

function evenCycleWithTailAndIsolated(): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < 8; i++) {
        g.addEdge(`c${i}`, `c${(i + 1) % 8}`);
    }
    g.addEdge("c2", "t0");
    g.addEdge("t0", "t1");
    g.addEdge("t1", "t2");
    g.addNode("alone");
    return g;
}

function numericPath(): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < 9; i++) {
        g.addEdge(i, i + 1);
    }
    return g;
}

const fixtures: readonly { readonly name: string; readonly graph: () => Graph }[] = [
    { name: "complete bipartite 4 x 6", graph: () => completeBipartite(4, 6) },
    { name: "even cycle with a tail and an isolated node", graph: evenCycleWithTailAndIsolated },
    { name: "path of ten with numeric ids", graph: numericPath },
    { name: "random bipartite 30 x 25, 70 edges", graph: () => randomBipartite(30, 25, 70, 11) },
    { name: "random bipartite 60 x 60, 90 edges", graph: () => randomBipartite(60, 60, 90, 4242) },
    { name: "random bipartite 200 x 150, 600 edges", graph: () => randomBipartite(200, 150, 600, 99) },
    { name: "directed random bipartite 40 x 40, 120 arcs", graph: () => randomBipartite(40, 40, 120, 7, true) },
];

/** Every pair is joined by an arc (either direction), left to right, and no right node is used twice. */
function assertValidMatching(s: GraphSnapshot, result: BipartiteMatchingResult, left: Uint32Array): void {
    const used = new Set<number>();
    let pairs = 0;
    for (let u = 0; u < s.nodeCount; u++) {
        const v = result.matching[u];
        if (v === INVALID_INDEX) {
            continue;
        }
        expect(maskTest(left, u)).toBe(true);
        expect(maskTest(left, v)).toBe(false);
        expect(s.hasArc(u, v) || s.hasArc(v, u)).toBe(true);
        expect(used.has(v)).toBe(false);
        used.add(v);
        pairs++;
    }
    expect(pairs).toBe(result.size);
}

function leftMaskOf(s: GraphSnapshot): Uint32Array {
    const { sides } = isBipartite(s);
    if (sides === null) {
        throw new Error("fixture is not bipartite");
    }
    const left = makeMask(s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        maskSet(left, i, !maskTest(sides, i));
    }
    return left;
}

/**
 * The same graph as a legacy `Graph` whose node order is the snapshot's index order and whose
 * every adjacency list is in ascending index order -- the orders the greedy port visits in.
 */
function legacyInIndexOrder(s: GraphSnapshot): Graph {
    const g = new Graph({ directed: s.directed });
    for (let i = 0; i < s.nodeCount; i++) {
        g.addNode(i);
    }
    const el = s.edgeList();
    const pairs: [number, number][] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        const [a, b] = s.directed ? [el.src[e], el.dst[e]] : [Math.min(el.src[e], el.dst[e]), Math.max(el.src[e], el.dst[e])];
        pairs.push([a, b]);
    }
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    for (const [a, b] of pairs) {
        g.addEdge(a, b);
    }
    return g;
}

function pathXYZ(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    b.addEdge("x", "y");
    b.addEdge("y", "z");
    return b.freeze();
}

function explicitSides(s: GraphSnapshot, leftIds: readonly NodeId[], rightIds: readonly NodeId[]): { left: Uint32Array; right: Uint32Array } {
    const left = makeMask(s.nodeCount);
    const right = makeMask(s.nodeCount);
    for (const id of leftIds) {
        maskSet(left, s.ids.indexOf(id), true);
    }
    for (const id of rightIds) {
        maskSet(right, s.ids.indexOf(id), true);
    }
    return { left, right };
}

describe("indexed.maximumBipartiteMatching", () => {
    for (const fixture of fixtures) {
        it(`${fixture.name}: the size equals legacy and the matching is valid`, () => {
            const graph = fixture.graph();
            const s = checksummedSnapshot(graph);
            const options = { arcs: "out" as const };
            const legacy = legacyMaximum(graph);
            const result = maximumBipartiteMatching(s, graph.isDirected ? options : {});
            expect(result.size).toBe(legacy.size);
            assertValidMatching(s, result, leftMaskOf(s));
            s.validate({ checksum: true });
        });
    }

    it("ignores arc direction by default, as the legacy function does on the undirected graph", () => {
        // Every arc points right to left, so following out-arcs of the left side finds nothing.
        const directed = new Graph({ directed: true });
        const undirected = new Graph({ directed: false });
        for (const [u, v] of [
            ["r0", "l0"],
            ["r1", "l0"],
            ["r1", "l1"],
            ["r2", "l2"],
        ]) {
            directed.addEdge(u, v);
            undirected.addEdge(u, v);
        }
        const s = checksummedSnapshot(directed);
        expect(maximumBipartiteMatching(s).size).toBe(legacyMaximum(undirected).size);
        expect(maximumBipartiteMatching(s).size).toBe(3);
    });

    it("ignores arc direction by default when the left side has only in-arcs", () => {
        // l0 is index 0, so the left side is the l side; every arc points into it.
        const b = new GraphBuilder({ directed: true });
        for (const id of ["l0", "l1", "l2"]) {
            b.addNode(id);
        }
        for (const [u, v] of [
            ["r0", "l0"],
            ["r1", "l1"],
            ["r2", "l2"],
        ]) {
            b.addEdge(u, v);
        }
        const s = b.freeze();
        expect(maximumBipartiteMatching(s).size).toBe(3);
        expect(greedyBipartiteMatching(s).size).toBe(3);
    });

    it("keeps its size on a multigraph with every edge doubled", () => {
        const graph = randomBipartite(30, 25, 70, 11);
        const b = new GraphBuilder({ directed: false });
        for (const node of graph.nodes()) {
            b.addNode(node.id);
        }
        for (const edge of graph.edges()) {
            b.addEdge(edge.source, edge.target);
            b.addEdge(edge.target, edge.source);
        }
        const s = b.freeze();
        expect(s.flags.multigraph).toBe(true);
        expect(maximumBipartiteMatching(s).size).toBe(legacyMaximum(graph).size);
    });

    it("uses explicit sides as given and never matches a node on neither side", () => {
        const graph = completeBipartite(3, 3);
        const s = checksummedSnapshot(graph);
        const left = makeMask(s.nodeCount);
        const right = makeMask(s.nodeCount);
        const leftIds: NodeId[] = ["a0", "a1"];
        const rightIds: NodeId[] = ["b0", "b1", "b2"];
        for (const id of leftIds) {
            maskSet(left, s.ids.indexOf(id), true);
        }
        for (const id of rightIds) {
            maskSet(right, s.ids.indexOf(id), true);
        }
        const result = maximumBipartiteMatching(s, { left, right });
        const legacy = legacyMaximum(graph, { leftNodes: new Set(leftIds), rightNodes: new Set(rightIds) });
        expect(result.size).toBe(legacy.size);
        expect(result.size).toBe(2);
        expect(result.matching[s.ids.indexOf("a2")]).toBe(INVALID_INDEX);
    });

    it("never matches a left node to a node on neither side, even its lowest neighbour", () => {
        // x (index 0) is on neither side; y's row is [x, z], so x is the first candidate.
        const s = pathXYZ();
        const sides = explicitSides(s, ["y"], ["z"]);
        for (const match of [maximumBipartiteMatching, greedyBipartiteMatching]) {
            const result = match(s, sides);
            expect(result.size).toBe(1);
            expect(result.matching[s.ids.indexOf("y")]).toBe(s.ids.indexOf("z"));
        }
    });

    it("throws on a graph that is not bipartite, as legacy does", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        expect(() => legacyMaximum(g)).toThrow("Graph is not bipartite");
        expect(() => maximumBipartiteMatching(checksummedSnapshot(g))).toThrow("Graph is not bipartite");
    });

    it("augments along a path through every earlier left node", () => {
        // Nodes numbered so every left node's lowest neighbour is the one its predecessor took:
        // each new left node forces an augmenting path through all the earlier ones.
        const n = 4000;
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < n; i++) {
            b.addNode(`l${i}`);
            b.addNode(`r${i}`);
        }
        for (let i = 0; i < n; i++) {
            b.addEdge(`l${i}`, `r${i}`);
            if (i > 0) {
                b.addEdge(`l${i}`, `r${i - 1}`);
            }
        }
        const s = b.freeze();
        const result = maximumBipartiteMatching(s);
        expect(result.size).toBe(n);
        assertValidMatching(s, result, leftMaskOf(s));
    });

    it("matches nothing on an empty graph", () => {
        const s = new GraphBuilder({ directed: false }).freeze();
        expect(maximumBipartiteMatching(s)).toEqual({ matching: new Uint32Array(0), size: 0 });
    });
});

describe("indexed.greedyBipartiteMatching", () => {
    for (const fixture of fixtures) {
        it(`${fixture.name}: equals legacy run in the same visiting order, and is maximal`, () => {
            const s = checksummedSnapshot(fixture.graph());
            const options = s.directed ? { arcs: "out" as const } : {};
            const result = greedyBipartiteMatching(s, options);
            const left = leftMaskOf(s);
            assertValidMatching(s, result, left);

            // Legacy visits left nodes in set order and neighbours in insertion order; given the
            // index orders it must choose exactly the same pairs.
            const ordered = legacyInIndexOrder(s);
            const leftNodes = new Set<NodeId>();
            const rightNodes = new Set<NodeId>();
            for (let i = 0; i < s.nodeCount; i++) {
                (maskTest(left, i) ? leftNodes : rightNodes).add(i);
            }
            const legacy = legacyGreedy(ordered, { leftNodes, rightNodes });
            expect(result.size).toBe(legacy.size);
            for (let u = 0; u < s.nodeCount; u++) {
                expect(result.matching[u]).toBe(legacy.matching.get(u) ?? INVALID_INDEX);
            }

            // Maximal: no arc joins an unmatched left node to an unmatched right node.
            const matchedRight = new Set(result.matching.filter((v) => v !== INVALID_INDEX));
            for (let u = 0; u < s.nodeCount; u++) {
                if (!maskTest(left, u) || result.matching[u] !== INVALID_INDEX) {
                    continue;
                }
                for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                    expect(matchedRight.has(s.colIdx[a])).toBe(true);
                }
            }
            expect(2 * result.size).toBeGreaterThanOrEqual(maximumBipartiteMatching(s, options).size);
            s.validate({ checksum: true });
        });
    }

    it("takes out-arcs before in-arcs on a directed snapshot", () => {
        // u (index 0) has an in-arc from a (index 1) and an out-arc to b (index 2).
        const b = new GraphBuilder({ directed: true });
        b.addNode("u");
        b.addEdge("a", "u");
        b.addEdge("u", "b");
        const s = b.freeze();
        const result = greedyBipartiteMatching(s, explicitSides(s, ["u"], ["a", "b"]));
        expect(result.matching[s.ids.indexOf("u")]).toBe(s.ids.indexOf("b"));
    });
});

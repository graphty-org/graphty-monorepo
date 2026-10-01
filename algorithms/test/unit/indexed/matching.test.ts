import { GraphBuilder, type GraphSnapshot, INVALID_INDEX, makeMask, maskSet, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { isBipartite } from "../../../src/indexed/bipartite.js";
import {
    type BipartiteMatchingResult,
    greedyBipartiteMatching,
    maximumBipartiteMatching,
} from "../../../src/indexed/matching.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { NodeId } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

/**
 * The order edges were added in, for the graphs whose `edges()` walk (grouped by source node) is
 * not that order. The snapshot's edge order is what the matching breaks ties by.
 */
const addedEdges = new WeakMap<Graph, [NodeId, NodeId][]>();

/** The graph frozen with its edges in the order they were added, as 2.x's neighbour lists held them. */
function inAddedOrder(graph: Graph): GraphSnapshot {
    const b = new GraphBuilder({ directed: graph.isDirected });
    for (const node of graph.nodes()) {
        b.addNode(node.id);
    }
    const edges = addedEdges.get(graph) ?? Array.from(graph.edges(), (e): [NodeId, NodeId] => [e.source, e.target]);
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze();
}

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
    const order: [NodeId, NodeId][] = [];
    for (let guard = 0; order.length < edges && guard < edges * 100; guard++) {
        const u = `l${Math.floor(random() * left)}`;
        const v = `r${Math.floor(random() * right)}`;
        if (!g.hasEdge(u, v)) {
            g.addEdge(u, v);
            order.push([u, v]);
        }
    }
    addedEdges.set(g, order);
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

/** The recorded 2.x result: partners by node id. */
interface LegacyMatching {
    readonly matching: Map<NodeId, NodeId>;
    readonly size: number;
}

const byKey = (a: [NodeId, NodeId], b: [NodeId, NodeId]): number => String(a[0]).localeCompare(String(b[0]));

/** The matched pairs by node id, left node first, sorted by the left node's id. */
function pairsOf(s: GraphSnapshot, result: BipartiteMatchingResult): Map<NodeId, NodeId> {
    const pairs: [NodeId, NodeId][] = [];
    for (let u = 0; u < s.nodeCount; u++) {
        if (result.matching[u] !== INVALID_INDEX) {
            pairs.push([s.ids.idOf(u), s.ids.idOf(result.matching[u])]);
        }
    }
    return new Map(pairs.sort(byKey));
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

function pathXYZ(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    b.addEdge("x", "y");
    b.addEdge("y", "z");
    return b.freeze();
}

function explicitSides(
    s: GraphSnapshot,
    leftIds: readonly NodeId[],
    rightIds: readonly NodeId[],
): { left: Uint32Array; right: Uint32Array } {
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
            const legacy = legacyResult() as LegacyMatching;
            const result = maximumBipartiteMatching(s, graph.isDirected ? options : {});
            expect(result.size).toBe(legacy.size);
            assertValidMatching(s, result, leftMaskOf(s));
            // The tie rule: with the edges in the order 2.x saw them, the very pairs 2.x chose.
            const ordered = inAddedOrder(graph);
            const tied = maximumBipartiteMatching(ordered, graph.isDirected ? options : {});
            expect(pairsOf(ordered, tied)).toEqual(new Map([...legacy.matching].sort(byKey)));
            s.validate({ checksum: true });
        });
    }

    it("pairs the job-matching story's graph exactly as 2.x did", () => {
        // graphty-element's Algorithms/Flow BipartiteMatching story. Both carol and alice could
        // take senior_dev or backend; 2.x gave alice senior_dev, and the story's approved picture
        // shows that pairing. Its edges are listed here in the story's order.
        const b = new GraphBuilder({ directed: false });
        for (const id of ["alice", "bob", "carol", "dave", "eve", "frank", "grace"]) {
            b.addNode(id);
        }
        for (const id of ["senior_dev", "ux_designer", "backend", "data_sci", "tech_lead", "frontend", "security"]) {
            b.addNode(id);
        }
        for (const [u, v] of [
            ["alice", "senior_dev"],
            ["alice", "backend"],
            ["alice", "frontend"],
            ["bob", "ux_designer"],
            ["carol", "backend"],
            ["carol", "senior_dev"],
            ["dave", "data_sci"],
            ["eve", "tech_lead"],
            ["frank", "frontend"],
            ["grace", "backend"],
            ["grace", "security"],
            ["grace", "senior_dev"],
        ]) {
            b.addEdge(u, v);
        }
        const s = b.freeze();
        // What 2.x maximumBipartiteMatching returned at f606a837.
        const expected = new Map<NodeId, NodeId>([
            ["alice", "senior_dev"],
            ["bob", "ux_designer"],
            ["carol", "backend"],
            ["dave", "data_sci"],
            ["eve", "tech_lead"],
            ["frank", "frontend"],
            ["grace", "security"],
        ]);
        expect(pairsOf(s, maximumBipartiteMatching(s))).toEqual(expected);
    });

    it("ignores arc direction by default, as the legacy function does on the undirected graph", () => {
        // Every arc points right to left, so following out-arcs of the left side finds nothing.
        const directed = new Graph({ directed: true });
        for (const [u, v] of [
            ["r0", "l0"],
            ["r1", "l0"],
            ["r1", "l1"],
            ["r2", "l2"],
        ]) {
            directed.addEdge(u, v);
        }
        const s = checksummedSnapshot(directed);
        // legacy: maximumBipartiteMatching on an undirected graph with the same edges
        expect(maximumBipartiteMatching(s).size).toBe((legacyResult() as BipartiteMatchingResult).size);
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

    it("follows a left node's in-arcs after its out-arcs when a later search revisits it", () => {
        // a matches r1 by its out-arc. b then reaches a through r1, and a must re-scan from the
        // start of its in-row to find r2; its out-row ends past where its in-row starts.
        const b = new GraphBuilder({ directed: true });
        for (const id of ["a", "b", "r1", "r2"]) {
            b.addNode(id);
        }
        for (const [u, v] of [
            ["a", "r1"],
            ["b", "r1"],
            ["r2", "a"],
        ]) {
            b.addEdge(u, v);
        }
        const s = b.freeze();
        const result = maximumBipartiteMatching(s);
        expect(result.size).toBe(2);
        expect(result.matching[s.ids.indexOf("a")]).toBe(s.ids.indexOf("r2"));
        expect(result.matching[s.ids.indexOf("b")]).toBe(s.ids.indexOf("r1"));
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
        expect(maximumBipartiteMatching(s).size).toBe((legacyResult() as BipartiteMatchingResult).size);
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
        const legacy = legacyResult() as BipartiteMatchingResult;
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
        expect(() => legacyResult() as BipartiteMatchingResult).toThrow("Graph is not bipartite");
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
            const leftNodes = new Set<NodeId>();
            const rightNodes = new Set<NodeId>();
            for (let i = 0; i < s.nodeCount; i++) {
                (maskTest(left, i) ? leftNodes : rightNodes).add(i);
            }
            const legacy = legacyResult() as BipartiteMatchingResult;
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

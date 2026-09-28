import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    findAllIsomorphisms as legacyFindAll,
    isGraphIsomorphic as legacyIsIsomorphic,
} from "../../../src/algorithms/matching/isomorphism.js";
import { Graph } from "../../../src/core/graph.js";
import { findAllIsomorphisms, isGraphIsomorphic } from "../../../src/indexed/isomorphism.js";
import type { NodeId } from "../../../src/types/index.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { gnm } from "./port-fixtures.js";

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * An isomorphic copy of `graph`: nodes and edges inserted in a shuffled order under new ids -- `x`
 * and the id of another node (`permuteIds`), or `x` and the node's own id.
 */
function relabelled(graph: Graph, seed: number, permuteIds = true): Graph {
    const random = seeded(seed);
    const ids = [...graph.nodes()].map((n) => n.id);
    const image = new Map<NodeId, string>();
    (permuteIds ? shuffled(ids, random) : ids).forEach((id, k) => image.set(ids[k], `x${String(id)}`));
    const out = new Graph({ directed: graph.isDirected });
    for (const id of shuffled([...image.values()], random)) {
        out.addNode(id);
    }
    for (const edge of shuffled([...graph.edges()], random)) {
        out.addEdge(image.get(edge.source) ?? "", image.get(edge.target) ?? "", edge.weight);
    }
    return out;
}

function fromPairs(directed: boolean, pairs: string, weighted = false): Graph {
    const g = new Graph({ directed });
    for (const pair of pairs.split(" ")) {
        const [u, v, w] = pair.split("-");
        g.addEdge(u, v, weighted ? Number(w) : 1);
    }
    return g;
}

function complete(n: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            g.addEdge(`k${i}`, `k${j}`);
        }
    }
    return g;
}

const PETERSEN = "0-1 1-2 2-3 3-4 4-0 0-5 1-6 2-7 3-8 4-9 5-7 7-9 9-6 6-8 8-5";

interface Case {
    readonly name: string;
    readonly graph: () => Graph;
    /** The number of automorphisms, where it is known independently of either implementation. */
    readonly automorphisms?: number;
}

const cases: readonly Case[] = [
    { name: "complete graph on four nodes", graph: () => complete(4), automorphisms: 24 },
    { name: "six-cycle", graph: () => fromPairs(false, "a-b b-c c-d d-e e-f f-a"), automorphisms: 12 },
    { name: "Petersen graph", graph: () => fromPairs(false, PETERSEN), automorphisms: 120 },
    { name: "path of six", graph: () => fromPairs(false, "a-b b-c c-d d-e e-f"), automorphisms: 2 },
    {
        name: "two triangles and an isolated node",
        graph: () => {
            const g = fromPairs(false, "a-b b-c c-a d-e e-f f-d");
            g.addNode("z");
            return g;
        },
        automorphisms: 72,
    },
    { name: "random 12 nodes, 20 edges", graph: () => gnm(12, 20, false, 31337) },
    { name: "random 30 nodes, 60 edges", graph: () => gnm(30, 60, false, 2024) },
    { name: "directed three-cycle", graph: () => fromPairs(true, "a-b b-c c-a"), automorphisms: 3 },
    {
        name: "directed hub, three targets, two sources",
        graph: () => fromPairs(true, "h-a h-b h-c d-h e-h"),
        automorphisms: 12,
    },
    {
        name: "directed cycle with reciprocal arcs",
        graph: () => fromPairs(true, "a-b b-a b-c c-d d-a"),
        automorphisms: 1,
    },
    { name: "random directed 10 nodes, 18 arcs", graph: () => gnm(10, 18, true, 99) },
];

/** Every arc of `s1` (parallels counted once) maps to an arc of `s2`, the map is a bijection, and no arc is left over. */
function assertIsomorphism(s1: GraphSnapshot, s2: GraphSnapshot, mapping: Uint32Array): void {
    expect(mapping.length).toBe(s1.nodeCount);
    expect(new Set(mapping).size).toBe(s2.nodeCount);
    expect(mapping.every((v) => v !== INVALID_INDEX && v < s2.nodeCount)).toBe(true);
    const distinctArcs = (s: GraphSnapshot): number => {
        let count = 0;
        for (let u = 0; u < s.nodeCount; u++) {
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                if (a === s.rowPtr[u] || s.colIdx[a - 1] !== s.colIdx[a]) {
                    count++;
                }
            }
        }
        return count;
    };
    for (let u = 0; u < s1.nodeCount; u++) {
        for (let a = s1.rowPtr[u]; a < s1.rowPtr[u + 1]; a++) {
            expect(s2.hasArc(mapping[u], mapping[s1.colIdx[a]])).toBe(true);
        }
    }
    expect(distinctArcs(s1)).toBe(distinctArcs(s2));
}

describe("indexed.findAllIsomorphisms", () => {
    for (const c of cases) {
        it(`${c.name}: counts equal legacy and every mapping is an isomorphism`, () => {
            const g1 = c.graph();
            const g2 = relabelled(g1, 17);
            const s1 = checksummedSnapshot(g1);
            const s2 = checksummedSnapshot(g2);
            const all = findAllIsomorphisms(s1, s2);
            expect(all.length).toBe(legacyFindAll(g1, g2).length);
            if (c.automorphisms !== undefined) {
                expect(all.length).toBe(c.automorphisms);
            }
            expect(new Set(all.map((m) => m.join(","))).size).toBe(all.length);
            for (const m of all) {
                assertIsomorphism(s1, s2, m);
            }

            const one = isGraphIsomorphic(s1, s2);
            expect(one.isomorphic).toBe(legacyIsIsomorphic(g1, g2).isIsomorphic);
            expect(one.isomorphic).toBe(true);
            assertIsomorphism(s1, s2, one.mapping ?? new Uint32Array(0));
            s1.validate({ checksum: true });
            s2.validate({ checksum: true });
        });
    }

    it("counts with a node predicate equal legacy", () => {
        const g1 = fromPairs(false, PETERSEN);
        const g2 = relabelled(g1, 5, false);
        const s1 = checksummedSnapshot(g1);
        const s2 = checksummedSnapshot(g2);
        // Only nodes whose original label has the same parity may correspond.
        const parity = (id: NodeId): number => Number(String(id).replace("x", "")) % 2;
        const legacy = legacyFindAll(g1, g2, { nodeMatch: (a, b) => parity(a) === parity(b) });
        const ported = findAllIsomorphisms(s1, s2, {
            nodeMatch: (i1, i2, a, b) => parity(a.ids.idOf(i1)) === parity(b.ids.idOf(i2)),
        });
        expect(ported.length).toBe(legacy.length);
        expect(ported.length).toBeGreaterThan(0);
        expect(ported.length).toBeLessThan(120);
        for (const m of ported) {
            assertIsomorphism(s1, s2, m);
            for (let i = 0; i < m.length; i++) {
                expect(parity(s1.ids.idOf(i))).toBe(parity(s2.ids.idOf(m[i])));
            }
        }
    });

    it("counts with an edge predicate equal legacy on an undirected graph", () => {
        // A weighted six-cycle: only rotations and reflections that carry every weight survive.
        const g1 = fromPairs(false, "a-b-1 b-c-2 c-d-1 d-e-2 e-f-1 f-a-2", true);
        const g2 = relabelled(g1, 8);
        const s1 = checksummedSnapshot(g1);
        const s2 = checksummedSnapshot(g2);
        const w1 = s1.edgeList().weights;
        const w2 = s2.edgeList().weights;
        const legacy = legacyFindAll(g1, g2, {
            edgeMatch: ([a, b], [c, d]) => g1.getEdge(a, b)?.weight === g2.getEdge(c, d)?.weight,
        });
        const ported = findAllIsomorphisms(s1, s2, { edgeMatch: (e1, e2) => w1?.[e1] === w2?.[e2] });
        expect(legacy.length).toBe(6);
        expect(ported.length).toBe(legacy.length);
        for (const m of ported) {
            assertIsomorphism(s1, s2, m);
        }
    });

    it("an edge predicate on a directed graph sees every arc, in both directions", () => {
        const g1 = fromPairs(true, "a-b-1 b-c-2 c-a-3 a-c-3 c-b-2 b-a-1", true);
        const s1 = checksummedSnapshot(g1);
        const w = s1.edgeList().weights;
        const all = findAllIsomorphisms(s1, s1);
        expect(all.length).toBe(6);
        const kept = findAllIsomorphisms(s1, s1, { edgeMatch: (e1, e2) => w?.[e1] === w?.[e2] });
        // Only the identity keeps every weight: each pair of nodes has its own weight.
        expect(kept.length).toBe(1);
        expect([...kept[0]]).toEqual([0, 1, 2]);
    });

    it("an edge predicate on a directed graph sees an arc that only the reverse view reaches", () => {
        // b is mapped after a and has no out-arcs: a -> b is offered only as an in-arc of b.
        const arc = (weight: number): GraphSnapshot => {
            const b = new GraphBuilder({ directed: true });
            b.addEdge("a", "b", weight);
            return b.freeze();
        };
        const byWeight = {
            edgeMatch: (e1: number, e2: number, a: GraphSnapshot, b: GraphSnapshot) =>
                a.edgeList().weights?.[e1] === b.edgeList().weights?.[e2],
        };
        expect(findAllIsomorphisms(arc(1), arc(2), byWeight)).toHaveLength(0);
        expect(isGraphIsomorphic(arc(1), arc(2), byWeight).isomorphic).toBe(false);
        expect(findAllIsomorphisms(arc(1), arc(1), byWeight)).toHaveLength(1);
    });

    it("an edge predicate sees self-loops", () => {
        const loop = (weight: number): GraphSnapshot => {
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "a", weight);
            b.addEdge("a", "b", 5);
            return b.freeze();
        };
        const byWeight = {
            edgeMatch: (e1: number, e2: number, a: GraphSnapshot, b: GraphSnapshot) =>
                a.edgeList().weights?.[e1] === b.edgeList().weights?.[e2],
        };
        expect(findAllIsomorphisms(loop(1), loop(2), byWeight)).toHaveLength(0);
        expect(isGraphIsomorphic(loop(1), loop(2), byWeight).isomorphic).toBe(false);
        expect(findAllIsomorphisms(loop(1), loop(1), byWeight)).toHaveLength(1);
    });

    it("finds none between graphs with the same degrees that are not isomorphic", () => {
        const cycle = fromPairs(false, "a-b b-c c-d d-e e-f f-a");
        const triangles = fromPairs(false, "a-b b-c c-a d-e e-f f-d");
        expect(legacyFindAll(cycle, triangles)).toHaveLength(0);
        expect(findAllIsomorphisms(checksummedSnapshot(cycle), checksummedSnapshot(triangles))).toHaveLength(0);
        expect(isGraphIsomorphic(checksummedSnapshot(cycle), checksummedSnapshot(triangles))).toEqual({
            isomorphic: false,
            mapping: null,
        });
    });

    it("keeps arc direction: a directed path is not an in-star", () => {
        const path = fromPairs(true, "a-b b-c");
        const inStar = fromPairs(true, "a-b c-b");
        expect(legacyIsIsomorphic(path, inStar).isIsomorphic).toBe(false);
        expect(isGraphIsomorphic(checksummedSnapshot(path), checksummedSnapshot(inStar)).isomorphic).toBe(false);
    });

    it("finds none across directedness or node counts", () => {
        const undirected = fromPairs(false, "a-b b-c");
        const directed = fromPairs(true, "a-b b-c");
        const bigger = fromPairs(false, "a-b b-c c-d");
        expect(findAllIsomorphisms(checksummedSnapshot(undirected), checksummedSnapshot(directed))).toHaveLength(0);
        expect(findAllIsomorphisms(checksummedSnapshot(undirected), checksummedSnapshot(bigger))).toHaveLength(0);
    });

    it("gives two empty graphs one isomorphism, the empty mapping, as legacy does", () => {
        const empty = new GraphBuilder({ directed: false }).freeze();
        expect(legacyFindAll(new Graph(), new Graph())).toHaveLength(1);
        expect(findAllIsomorphisms(empty, empty)).toEqual([new Uint32Array(0)]);
        expect(isGraphIsomorphic(empty, empty)).toEqual({ isomorphic: true, mapping: new Uint32Array(0) });
    });

    it("compares simple-graph neighbourhoods: parallel edges count once", () => {
        const simple = checksummedSnapshot(fromPairs(false, "a-b b-c c-d d-a"));
        const b = new GraphBuilder({ directed: false });
        for (const [u, v] of [
            ["p", "q"],
            ["q", "r"],
            ["q", "r"],
            ["r", "s"],
            ["s", "p"],
            ["s", "p"],
        ]) {
            b.addEdge(u, v);
        }
        const multi = b.freeze();
        expect(multi.flags.multigraph).toBe(true);
        const all = findAllIsomorphisms(simple, multi);
        expect(all).toHaveLength(8);
        for (const m of all) {
            assertIsomorphism(simple, multi, m);
        }
    });

    it("maps a self-loop only to a self-loop", () => {
        const build = (loopAt: string): GraphSnapshot => {
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "b");
            b.addEdge("b", "c");
            b.addEdge(loopAt, loopAt);
            return b.freeze();
        };
        const endLoop = build("a");
        expect(isGraphIsomorphic(endLoop, build("c")).isomorphic).toBe(true);
        expect(isGraphIsomorphic(endLoop, build("b")).isomorphic).toBe(false);
        const [only] = findAllIsomorphisms(endLoop, build("c"));
        // a (looped) must go to c (looped).
        expect(only[endLoop.ids.indexOf("a")]).toBe(build("c").ids.indexOf("c"));
    });
});

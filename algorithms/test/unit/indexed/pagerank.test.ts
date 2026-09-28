import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { pageRank, personalizedPageRank } from "../../../src/indexed/pagerank.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

function directedFrom(edges: readonly (readonly [string, string, number?])[]): Graph {
    const g = new Graph({ directed: true });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

function sum(scores: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < scores.length; i++) {
        total += scores[i];
    }
    return total;
}

describe("indexed.pageRank", () => {
    it("gives a directed 4-cycle four equal scores summing to 1", () => {
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "c"],
                ["c", "d"],
                ["d", "a"],
            ]),
        );
        const r = pageRank(s);
        expect(r.converged).toBe(true);
        for (let u = 0; u < 4; u++) {
            expect(r.scores[u]).toBeCloseTo(0.25, 12);
        }
        expect(Math.abs(sum(r.scores) - 1)).toBeLessThan(1e-12);
        s.validate({ checksum: true });
    });

    it("puts more mass on the target of a two-node chain", () => {
        const s = checksummedSnapshot(directedFrom([["a", "b"]]));
        const r = pageRank(s);
        expect(r.scores[1]).toBeGreaterThan(r.scores[0]);
        s.validate({ checksum: true });
    });

    it("does not leak mass through a dangling node", () => {
        // c has out-degree 0.
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "a"],
                ["a", "c"],
            ]),
        );
        const r = pageRank(s);
        expect(s.outDegree()[2]).toBe(0);
        expect(Math.abs(sum(r.scores) - 1)).toBeLessThan(1e-9);
        s.validate({ checksum: true });
    });

    it("reports iterations === 1 and converged === false under maxIterations: 1", () => {
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["a", "c"],
            ]),
        );
        const r = pageRank(s, { maxIterations: 1 });
        expect(r.iterations).toBe(1);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("weighted: true splits one node's contribution 3:1 across arcs of weight 3 and 1", () => {
        // u = 0 pushes into x = 1 over weight 3 and into y = 2 over weight 1; x and y are dangling
        // and u has no in-arcs, so after one iteration u's score is exactly the shared base term
        // and (x - u) : (y - u) is the weight ratio.
        const s = checksummedSnapshot(
            directedFrom([
                ["u", "x", 3],
                ["u", "y", 1],
            ]),
        );
        const r = pageRank(s, { weighted: true, maxIterations: 1 });
        expect((r.scores[1] - r.scores[0]) / (r.scores[2] - r.scores[0])).toBeCloseTo(3, 12);
        const unweighted = pageRank(s, { maxIterations: 1 });
        expect(unweighted.scores[1]).toBeCloseTo(unweighted.scores[2], 12);
        s.validate({ checksum: true });
    });

    it("agrees with the legacy pageRank to 1e-9 when both are pinned", () => {
        const g = directedFrom([
            ["a", "b"],
            ["a", "c"],
            ["b", "c"],
            ["c", "a"],
            ["c", "d"],
            ["d", "e"],
            ["e", "c"],
            ["e", "f"],
            ["f", "g"],
            ["g", "e"],
            ["h", "a"],
            ["h", "g"],
        ]);
        g.addEdge("g", "i"); // i is dangling
        const s = checksummedSnapshot(g);
        // Both sides are run to a tolerance neither can reach before maxIterations, so neither stopping
        // rule decides the answer. They differ: the port's `converged` is an L1 delta over all nodes
        // (`delta += Math.abs(next[v] - rank[v])`), the legacy one is L-infinity
        // (`maxDiff = Math.max(maxDiff, ...)`, pagerank.ts:257-267), both against 1e-6 by default -- so at
        // the default tolerance the legacy loop stops up to n iterations earlier and the two answers differ
        // by about its residual, which on scores near 0.25 is several times 1e-6 relative.
        // `useDelta: false` is MANDATORY, not tidiness: `options.useDelta !== false && n > 100`
        // (pagerank.ts) switches the legacy call to SimpleDeltaPageRank, a separate implementation.
        const legacy = legacyResult<PageRankResult>();
        const ported = pageRank(s, { dampingFactor: 0.85, maxIterations: 200, tolerance: 1e-12 });
        for (let u = 0; u < s.nodeCount; u++) {
            expect(ported.scores[u]).toBeCloseTo(legacy.ranks[String(s.ids.idOf(u))], 9); // 1e-9 absolute
        }
        s.validate({ checksum: true });
    });
});

/** The directed graph with both arcs of every edge of an undirected one (a self-loop stays one arc). */
function bothArcs(g: Graph): Graph {
    const d = new Graph({ directed: true });
    for (const node of g.nodes()) {
        d.addNode(node.id);
    }
    for (const edge of g.edges()) {
        d.addEdge(edge.source, edge.target, edge.weight);
        if (edge.source !== edge.target) {
            d.addEdge(edge.target, edge.source, edge.weight);
        }
    }
    return d;
}

function hasDanglingNode(g: Graph): boolean {
    return [...g.nodes()].some((node) => g.outDegree(node.id) === 0);
}

// The legacy results were recorded with `useDelta: false`: above 100 nodes the legacy function
// otherwise switches to SimpleDeltaPageRank, a separate implementation. `convergenceNorm: "max"` on
// every port call: it is the legacy stopping rule, so iterations and converged flags are comparable,
// not only scores.
const LEGACY_RULE = { convergenceNorm: "max" } as const;

function expectSameRanks(
    s: ReturnType<typeof checksummedSnapshot>,
    ported: { scores: ArrayLike<number>; iterations: number; converged: boolean },
    legacy: { ranks: Record<string, number>; iterations: number; converged: boolean },
): void {
    expect(ported.iterations).toBe(legacy.iterations);
    expect(ported.converged).toBe(legacy.converged);
    for (let u = 0; u < s.nodeCount; u++) {
        expect(Math.abs(ported.scores[u] - legacy.ranks[String(s.ids.idOf(u))])).toBeLessThan(1e-9);
    }
}

describe("indexed.pageRank against legacy, with the legacy stopping rule", () => {
    for (const { name, graph } of directedFixtures()) {
        it(`matches scores, iterations and converged on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            for (const options of [{}, { dampingFactor: 0.6, tolerance: 1e-9 }, { maxIterations: 3 }]) {
                expectSameRanks(s, pageRank(s, { ...options, ...LEGACY_RULE }), legacyResult<PageRankResult>());
            }
            expectSameRanks(s, pageRank(s, { weighted: true, ...LEGACY_RULE }), legacyResult<PageRankResult>());
            s.validate({ checksum: true });
        });
    }

    it("the default L1 rule stops no earlier than the legacy rule", () => {
        const { graph } = directedFixtures()[2];
        const s = checksummedSnapshot(graph);
        expect(pageRank(s).iterations).toBeGreaterThanOrEqual(legacyResult<PageRankResult>().iterations);
    });
});

describe("indexed.pageRank on an undirected snapshot", () => {
    for (const { name, graph } of undirectedFixtures()) {
        it(`carries rank both ways along every edge of ${name}`, () => {
            const s = checksummedSnapshot(graph);
            expectSameRanks(s, pageRank(s, LEGACY_RULE), legacyResult<PageRankResult>());
            expectSameRanks(s, pageRank(s, { weighted: true, ...LEGACY_RULE }), legacyResult<PageRankResult>());
            s.validate({ checksum: true });
        });
    }

    it("sends a self-loop's rank back to its node once", () => {
        const b = new GraphBuilder({ directed: false, weighted: false });
        b.addEdge("a", "a");
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        const s = b.freeze();
        const directed = new Graph({ directed: true });
        directed.addEdge("a", "a");
        directed.addEdge("a", "b");
        directed.addEdge("b", "a");
        directed.addEdge("b", "c");
        directed.addEdge("c", "b");
        expectSameRanks(s, pageRank(s, LEGACY_RULE), legacyResult<PageRankResult>());
    });
});

describe("indexed.pageRank initialRanks", () => {
    it("starts from the given ranks, normalised to sum 1, as legacy does", () => {
        const { graph } = directedFixtures()[2];
        const s = checksummedSnapshot(graph);
        const initial = new Float64Array(s.nodeCount);
        const initialMap = new Map<string, number>();
        for (let u = 0; u < s.nodeCount; u++) {
            initial[u] = u + 1;
            initialMap.set(String(s.ids.idOf(u)), u + 1);
        }
        for (const options of [{}, { maxIterations: 2 }]) {
            expectSameRanks(
                s,
                pageRank(s, { ...options, initialRanks: initial, ...LEGACY_RULE }),
                legacyResult<PageRankResult>(),
            );
        }
    });

    it("starts from all zero when every initial rank is 0, as legacy does", () => {
        const { graph } = directedFixtures()[2];
        const s = checksummedSnapshot(graph);
        const zeros = new Map<string, number>();
        for (let u = 0; u < s.nodeCount; u++) {
            zeros.set(String(s.ids.idOf(u)), 0);
        }
        expectSameRanks(
            s,
            pageRank(s, { initialRanks: new Float64Array(s.nodeCount), maxIterations: 1, ...LEGACY_RULE }),
            legacyResult<PageRankResult>(),
        );
    });

    it("refuses initial ranks of the wrong length", () => {
        const s = checksummedSnapshot(directedFixtures()[0].graph);
        expect(() => pageRank(s, { initialRanks: new Float64Array(1) })).toThrow(/initialRanks/);
    });
});

describe("indexed.personalizedPageRank", () => {
    const fixtures = [
        ...directedFixtures(),
        ...undirectedFixtures().map(({ name, graph }) => ({ name: `both arcs of ${name}`, graph: bothArcs(graph) })),
    ];

    it("has fixtures to compare on, dangling nodes included", () => {
        expect(fixtures.length).toBeGreaterThanOrEqual(5);
        expect(fixtures.some(({ graph }) => hasDanglingNode(graph))).toBe(true);
    });

    for (const { name, graph } of fixtures) {
        it(`matches legacy personalizedPageRank on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            const chosen = [0, Math.floor(s.nodeCount / 2), s.nodeCount - 1];
            const personalization = new Float64Array(s.nodeCount);
            for (const u of chosen) {
                personalization[u] = 1;
            }
            for (const options of [{}, { dampingFactor: 0.5 }, { maxIterations: 4 }]) {
                expectSameRanks(
                    s,
                    personalizedPageRank(s, personalization, { ...options, ...LEGACY_RULE }),
                    legacyResult<PageRankResult>(),
                );
            }
            s.validate({ checksum: true });
        });
    }

    it("with a uniform vector equals plain PageRank when no node is dangling", () => {
        const { graph } = fixtures.find(({ graph: g }) => !hasDanglingNode(g)) ?? fixtures[0];
        const s = checksummedSnapshot(graph);
        expect(hasDanglingNode(graph)).toBe(false);
        const plain = pageRank(s);
        const uniform = personalizedPageRank(s, new Float64Array(s.nodeCount).fill(3));
        expect(uniform.iterations).toBe(plain.iterations);
        for (let u = 0; u < s.nodeCount; u++) {
            expect(uniform.scores[u]).toBeCloseTo(plain.scores[u], 12);
        }
    });

    it("an all-zero vector gives plain PageRank, as legacy does for no personal nodes", () => {
        const { graph } = directedFixtures()[0];
        const s = checksummedSnapshot(graph);
        expectSameRanks(
            s,
            personalizedPageRank(s, new Float64Array(s.nodeCount), LEGACY_RULE),
            legacyResult<PageRankResult>(),
        );
    });

    it("reads weights that are not f32-exact at full precision, as legacy does", () => {
        const g = directedFrom([
            ["a", "b", 0.1],
            ["a", "c", 2.345678901234567],
            ["b", "c", 1.3],
            ["c", "a", 0.7],
            ["c", "b", 0.2],
        ]);
        const s = checksummedSnapshot(g);
        const port = { weighted: true, tolerance: 1e-10, maxIterations: 500, ...LEGACY_RULE };
        expectSameRanks(s, pageRank(s, port), legacyResult<PageRankResult>());
        const p = Float64Array.of(1, 0, 0);
        expectSameRanks(s, personalizedPageRank(s, p, port), legacyResult<PageRankResult>());
        // Exact to the last bit on the f64 side: the f32 rounding of 0.1 alone moves a score by
        // about 1e-9, far above what this comparison allows.
        const ported = pageRank(s, port).scores;
        const { ranks } = legacyResult<PageRankResult>();
        for (let u = 0; u < s.nodeCount; u++) {
            expect(Math.abs(ported[u] - ranks[String(s.ids.idOf(u))])).toBeLessThan(1e-12);
        }
    });

    it("returns an empty result on an empty snapshot, as legacy does", () => {
        const s = new GraphBuilder({ directed: true }).freeze();
        for (const r of [pageRank(s), personalizedPageRank(s, new Float64Array(0))]) {
            expect(r.scores).toHaveLength(0);
            expect(r.iterations).toBe(0);
            expect(r.converged).toBe(true);
        }
    });

    it("refuses a vector of the wrong length, a negative or a non-finite entry", () => {
        const s = checksummedSnapshot(directedFixtures()[0].graph);
        const n = s.nodeCount;
        expect(() => personalizedPageRank(s, new Float64Array(n - 1).fill(1))).toThrow(/personalization/);
        for (const bad of [-1, Number.NaN, Infinity]) {
            const vector = new Float64Array(n).fill(1);
            vector[1] = bad;
            expect(() => personalizedPageRank(s, vector)).toThrow(/personalization/);
        }
    });
});

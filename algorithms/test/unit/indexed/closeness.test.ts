import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { resolveSources } from "../../../src/indexed/betweenness.js";
import { closenessCentrality, nodeClosenessCentrality } from "../../../src/indexed/closeness.js";
import { exactArcWeights } from "../../helpers/facade.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { multigraphFixtures, numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

const TOLERANCE = 1e-9;

function expectMatches(s: GraphSnapshot, ported: Float64Array, legacy: Record<string, number>): void {
    expect(Object.keys(legacy)).toHaveLength(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        const id = String(s.ids.idOf(v));
        const want = legacy[id];
        expect(Math.abs(ported[v] - want), `${id}: ${ported[v]} vs ${want}`).toBeLessThanOrEqual(
            TOLERANCE * Math.max(1, Math.abs(want)),
        );
    }
}

const OPTION_SETS = [{}, { normalized: true }, { harmonic: true }, { harmonic: true, normalized: true }];

/** Weights no f32 can hold exactly, so only the per-arc f64 override reproduces the legacy sums. */
function inexactWeights(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 0.1);
    g.addEdge("b", "c", 0.7);
    g.addEdge("a", "c", 0.9);
    g.addEdge("c", "d", 1 / 3);
    g.addEdge("d", "e", 2.2);
    g.addNode("alone");
    return g;
}

describe("indexed.closenessCentrality", () => {
    it("is one over the summed hop distance", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        const r = closenessCentrality(b.freeze());
        expect([...r.scores]).toEqual([1 / 3, 1 / 2, 1 / 3]);
        expect(r.iterations).toBe(3);
        expect(r.converged).toBe(true);
    });

    it("reads the arc weights unless weighted: false", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 4);
        b.addEdge("b", "c", 1);
        const s = b.freeze();
        expect(closenessCentrality(s, { weighted: false }).scores[0]).toBe(1 / 3);
        expect(closenessCentrality(s).scores[0]).toBe(1 / 9);
        expect(closenessCentrality(s, { weighted: true }).scores[0]).toBe(1 / 9);
        // a node that reaches nothing scores 0
        expect(closenessCentrality(s, { weighted: true }).scores[2]).toBe(0);
    });

    it("takes the lightest of parallel edges", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", 2);
        expect([...closenessCentrality(b.freeze(), { weighted: true }).scores]).toEqual([1 / 2, 1 / 2]);
    });

    it("with negative weights, ends and keeps each node's first settled distance as legacy does", () => {
        const cases: [boolean, [string, string, number][]][] = [
            // undirected, so the negative edge is a negative cycle
            [
                false,
                [
                    ["a", "b", 2],
                    ["b", "c", -1],
                ],
            ],
            // directed, no cycle: b is settled at 1 before c offers -2
            [
                true,
                [
                    ["a", "b", 1],
                    ["a", "c", 3],
                    ["c", "b", -5],
                ],
            ],
            // a negative self-loop
            [
                true,
                [
                    ["a", "a", -1],
                    ["a", "b", 1],
                ],
            ],
        ];
        for (const [directed, edges] of cases) {
            const g = new Graph({ directed });
            for (const [u, v, w] of edges) {
                g.addEdge(u, v, w);
            }
            const s = checksummedSnapshot(g);
            for (const options of OPTION_SETS) {
                expectMatches(
                    s,
                    closenessCentrality(s, { ...options, weighted: true }).scores,
                    legacyResult() as Record<string, number>,
                );
            }
        }
    });

    it("equals legacy weighted closeness on a weighted multigraph, taking the lightest parallel edge", () => {
        const edges: [string, string, number][] = [
            ["a", "b", 5],
            ["a", "b", 2],
            ["b", "a", 3],
            ["b", "c", 1],
            ["a", "c", 4],
            ["c", "c", 7],
            ["c", "d", 2],
            ["c", "d", 0.5],
        ];
        for (const directed of [false, true]) {
            const b = new GraphBuilder({ directed });
            // legacy keeps one edge per pair, so give it the lightest
            const lightest = new Map<string, [string, string, number]>();
            for (const [u, v, w] of edges) {
                b.addEdge(u, v, w);
                const key = directed || u <= v ? `${u}>${v}` : `${v}>${u}`;
                const seen = lightest.get(key);
                if (seen === undefined || w < seen[2]) {
                    lightest.set(key, [u, v, w]);
                }
            }
            const g = new Graph({ directed });
            for (const [u, v, w] of lightest.values()) {
                g.addEdge(u, v, w);
            }
            const s = b.freeze();
            for (const options of OPTION_SETS) {
                expectMatches(
                    s,
                    closenessCentrality(s, { ...options, weighted: true }).scores,
                    legacyResult() as Record<string, number>,
                );
            }
        }
    });

    it("with a weighted cutoff, stops searching past it as the legacy weighted function does", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 5);
        const s = checksummedSnapshot(g);
        // c is 6 away from a and past the cutoff, but it is counted: the search expands b, which is closer than 2
        expect(closenessCentrality(s, { weighted: true, cutoff: 2 }).scores[0]).toBe(1 / 7);
        for (const options of [
            { cutoff: 2 },
            { cutoff: 0.5 },
            { cutoff: 1, harmonic: true },
            { cutoff: 5, normalized: true },
        ]) {
            expectMatches(
                s,
                closenessCentrality(s, { ...options, weighted: true }).scores,
                legacyResult() as Record<string, number>,
            );
        }
    });

    it("gives the empty graph an empty result", () => {
        expect(closenessCentrality(new GraphBuilder({ directed: false }).freeze()).scores).toHaveLength(0);
    });

    for (const { name, graph } of [
        ...undirectedFixtures(),
        ...directedFixtures(),
        { name: "numeric ids from 0", graph: numericIdsFromZero() },
    ]) {
        it(`equals the legacy closeness functions on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            const weights = exactArcWeights(s);
            for (const options of [...OPTION_SETS, { cutoff: 2 }, { cutoff: 1, normalized: true }]) {
                // the legacy closenessCentrality counted hops
                expectMatches(
                    s,
                    closenessCentrality(s, { ...options, weighted: false }).scores,
                    legacyResult() as Record<string, number>,
                );
            }
            for (const options of [...OPTION_SETS, { cutoff: 2 }, { cutoff: 1.5, harmonic: true }]) {
                expectMatches(
                    s,
                    closenessCentrality(s, { ...options, weighted: true, weights }).scores,
                    legacyResult() as Record<string, number>,
                );
            }
            s.validate({ checksum: true });
        });
    }

    it("equals the legacy weighted closeness exactly through the f64 weight override", () => {
        const g = inexactWeights();
        const s = checksummedSnapshot(g);
        const weights = exactArcWeights(s);
        expect(weights).toBeDefined();
        for (const options of OPTION_SETS) {
            expectMatches(
                s,
                closenessCentrality(s, { ...options, weighted: true, weights }).scores,
                legacyResult() as Record<string, number>,
            );
        }
        s.validate({ checksum: true });
    });

    for (const { name, snapshot } of multigraphFixtures()) {
        it(`equals legacy on the merged graph for the ${name}`, () => {
            for (const options of [...OPTION_SETS, { cutoff: 1 }]) {
                expectMatches(
                    snapshot,
                    closenessCentrality(snapshot, options).scores,
                    legacyResult() as Record<string, number>,
                );
            }
            snapshot.validate({ checksum: true });
        });
    }
});

describe("indexed.nodeClosenessCentrality", () => {
    it("equals the all-nodes score of the same node, unweighted and weighted", () => {
        const g = inexactWeights();
        const s = checksummedSnapshot(g);
        const weights = exactArcWeights(s);
        for (const options of [{}, { harmonic: true }, { weighted: true, weights, normalized: true }]) {
            const all = closenessCentrality(s, options).scores;
            for (let v = 0; v < s.nodeCount; v++) {
                expect(nodeClosenessCentrality(s, v, options)).toBe(all[v]);
            }
        }
        expect(nodeClosenessCentrality(s, s.ids.requireIndex("b"), { weighted: false })).toBe(legacyResult() as number);
        s.validate({ checksum: true });
    });

    it("refuses an index outside the snapshot", () => {
        const s = checksummedSnapshot(inexactWeights());
        expect(() => nodeClosenessCentrality(s, s.nodeCount)).toThrow(RangeError);
        expect(() => nodeClosenessCentrality(s, -1)).toThrow(RangeError);
        expect(() => nodeClosenessCentrality(s, 0.5)).toThrow(RangeError);
    });
});

describe("indexed.closenessCentrality, sampled", () => {
    /** Equal, or within TOLERANCE where the sums are floating-point and a sample adds them in another order. */
    function expectClose(got: Float64Array, want: Float64Array, exact: boolean): void {
        expect(got).toHaveLength(want.length);
        if (exact) {
            expect([...got]).toEqual([...want]);
            return;
        }
        for (let v = 0; v < want.length; v++) {
            expect(Math.abs(got[v] - want[v]), `${v}: ${got[v]} vs ${want[v]}`).toBeLessThanOrEqual(
                TOLERANCE * Math.max(1, Math.abs(want[v])),
            );
        }
    }

    const fixtures = [
        ...undirectedFixtures().map(({ name, graph }) => ({ name, snapshot: checksummedSnapshot(graph) })),
        ...directedFixtures().map(({ name, graph }) => ({ name, snapshot: checksummedSnapshot(graph) })),
        ...multigraphFixtures(),
    ];

    for (const { name, snapshot: s } of fixtures) {
        it(`equals the exact scores when the sample is every node, on ${name}`, () => {
            const n = s.nodeCount;
            const every = Array.from({ length: n }, (_, i) => i);
            // hop sums are integers, so any order adds them exactly; harmonic and weighted sums are floating-point
            const hops: [object, boolean][] = [
                [{ weighted: false }, true],
                [{ weighted: false, normalized: true }, true],
                [{ weighted: false, cutoff: 2 }, true],
                [{ weighted: false, harmonic: true }, false],
                [{ weighted: false, harmonic: true, normalized: true }, false],
            ];
            const weighted: [object, boolean][] = [
                [{ weighted: true }, false],
                [{ weighted: true, normalized: true }, false],
                [{ weighted: true, weights: exactArcWeights(s) }, false],
            ];
            for (const [options, exact] of [...hops, ...weighted]) {
                const want = closenessCentrality(s, options).scores;
                for (const sample of [{ sources: every }, { k: n }, { sources: every, k: n }]) {
                    const r = closenessCentrality(s, { ...options, ...sample });
                    expectClose(r.scores, want, exact);
                    expect(r.sourcesUsed).toBe(n);
                    expect(r.iterations).toBe(n);
                }
            }
        });
    }

    it("measures each node's distance TO the sources on a directed graph", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        const s = b.freeze();
        // only c is a source: a is 2 from it, b is 1, and c reaches no other source
        expect([...closenessCentrality(s, { sources: [2] }).scores]).toEqual([1 / 2, 1, 0]);
        // a is a source nothing reaches; the others do not reach it either
        expect([...closenessCentrality(s, { sources: [0] }).scores]).toEqual([0, 0, 0]);
    });

    it("sums over the sources run, unscaled, and runs a duplicate twice", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        b.addEdge("c", "d");
        const s = b.freeze();
        expect([...closenessCentrality(s, { sources: [0] }).scores]).toEqual([0, 1, 1 / 2, 1 / 3]);
        const twice = closenessCentrality(s, { sources: [0, 0] });
        expect([...twice.scores]).toEqual([0, 1 / 2, 1 / 4, 1 / 6]);
        expect(twice.sourcesUsed).toBe(2);
        expect(twice.iterations).toBe(2);
        // a node sums the sources other than itself: b is 1 from a and 1 from c
        expect(closenessCentrality(s, { sources: [0, 1, 2] }).scores[1]).toBe(1 / 2);
    });

    it("draws the same k sources as betweenness, the same way every time", () => {
        const s = checksummedSnapshot(gnmLike());
        for (const k of [0, 1, 7, 20]) {
            const drawn = resolveSources(s.nodeCount, undefined, k);
            const first = closenessCentrality(s, { k });
            expect(first.sourcesUsed).toBe(k);
            expect([...first.scores]).toEqual([...closenessCentrality(s, { k }).scores]);
            expect([...first.scores]).toEqual([...closenessCentrality(s, { sources: drawn }).scores]);
        }
        // a sample of 0 sources scores every node 0
        expect([...closenessCentrality(s, { k: 0 }).scores].every((x) => x === 0)).toBe(true);
    });

    it("refuses a bad sources list or k", () => {
        const s = checksummedSnapshot(gnmLike());
        const n = s.nodeCount;
        for (const options of [
            { k: n + 1 },
            { k: -1 },
            { k: 1.5 },
            { sources: [n] },
            { sources: [-1] },
            { sources: [0.5] },
            { sources: [0, 1], k: 1 },
        ]) {
            expect(() => closenessCentrality(s, options), JSON.stringify(options)).toThrow(RangeError);
        }
        expect(() => closenessCentrality(s, { k: n + 1 })).toThrow(/closenessCentrality/);
    });

    it("reports every node as a source on the exact run", () => {
        const s = checksummedSnapshot(gnmLike());
        expect(closenessCentrality(s).sourcesUsed).toBe(s.nodeCount);
    });
});

/** A small fixed graph for the sampling tests. */
function gnmLike(): Graph {
    return undirectedFixtures()[5].graph;
}

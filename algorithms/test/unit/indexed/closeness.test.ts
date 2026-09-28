import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { closenessCentrality, nodeClosenessCentrality } from "../../../src/indexed/closeness.js";
import { exactArcWeights } from "../../../src/indexed/facade.js";
import { legacyResult } from "../../helpers/golden.js";
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

    it("ignores weights unless weighted, and then reads the arc weights", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 4);
        b.addEdge("b", "c", 1);
        const s = b.freeze();
        expect(closenessCentrality(s).scores[0]).toBe(1 / 3);
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
                expectMatches(s, closenessCentrality(s, options).scores, legacyResult() as Record<string, number>);
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
        expect(nodeClosenessCentrality(s, s.ids.requireIndex("b"))).toBe(legacyResult() as number);
        s.validate({ checksum: true });
    });

    it("refuses an index outside the snapshot", () => {
        const s = checksummedSnapshot(inexactWeights());
        expect(() => nodeClosenessCentrality(s, s.nodeCount)).toThrow(RangeError);
        expect(() => nodeClosenessCentrality(s, -1)).toThrow(RangeError);
        expect(() => nodeClosenessCentrality(s, 0.5)).toThrow(RangeError);
    });
});

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { distanceMeasures } from "../../../src/indexed/distance-measures.js";

/** `networkx.karate_club_graph()`, unweighted. */
const KARATE =
    "0-1 0-2 0-3 0-4 0-5 0-6 0-7 0-8 0-10 0-11 0-12 0-13 0-17 0-19 0-21 0-31 1-2 1-3 1-7 1-13 1-17 1-19 1-21 " +
    "1-30 2-3 2-7 2-8 2-9 2-13 2-27 2-28 2-32 3-7 3-12 3-13 4-6 4-10 5-6 5-10 5-16 6-16 8-30 8-32 8-33 9-33 " +
    "13-33 14-32 14-33 15-32 15-33 18-32 18-33 19-33 20-32 20-33 22-32 22-33 23-25 23-27 23-29 23-32 23-33 " +
    "24-25 24-27 24-31 25-31 26-29 26-33 27-33 28-31 28-33 29-32 29-33 30-32 30-33 31-32 31-33 32-33";

/** `[nx.eccentricity(g)[v] for v in sorted(g)]` on the karate club. */
const KARATE_ECCENTRICITY = [
    3, 3, 3, 3, 4, 4, 4, 4, 3, 4, 4, 4, 4, 3, 5, 5, 5, 4, 5, 3, 5, 4, 5, 5, 4, 4, 5, 4, 4, 5, 4, 3, 4, 4,
];

function build(pairs: string, directed = false, isolated: string[] = []): GraphSnapshot {
    const b = new GraphBuilder({ directed });
    for (const pair of pairs.split(" ")) {
        const [u, v] = pair.split("-");
        b.addEdge(u, v);
    }
    for (const id of isolated) {
        b.addNode(id);
    }
    return b.freeze({ checksum: true });
}

function eccentricityOf(s: GraphSnapshot, ecc: Float64Array, id: string): number {
    return ecc[s.ids.indexOf(id)];
}

describe("distanceMeasures", () => {
    it("matches networkx on the karate club", () => {
        const s = build(KARATE);
        const r = distanceMeasures(s);
        for (let v = 0; v < 34; v++) {
            assert.strictEqual(eccentricityOf(s, r.eccentricity, String(v)), KARATE_ECCENTRICITY[v], `node ${v}`);
        }
        assert.strictEqual(r.diameter, 5);
        assert.strictEqual(r.radius, 3);
        assert.closeTo(r.averageShortestPathLength, 2.408199643493761, 1e-12);
        assert.strictEqual(r.componentCount, 1);
        assert.isTrue(r.exact);
        assert.strictEqual(r.sourcesUsed, 34);
        s.validate({ checksum: true });
    });

    it("matches networkx on a path of six", () => {
        const s = build("0-1 1-2 2-3 3-4 4-5");
        const r = distanceMeasures(s);
        assert.deepEqual([...r.eccentricity], [5, 4, 3, 3, 4, 5]);
        assert.strictEqual(r.diameter, 5);
        assert.strictEqual(r.radius, 3);
        assert.closeTo(r.averageShortestPathLength, 2.3333333333333335, 1e-12);
    });

    it("measures a disconnected graph per component, and reports the largest graph-wide", () => {
        // A path of four, a triangle and an isolated node; networkx per component: (3, 2, 5/3), (1, 1, 1), (0, 0, 0).
        const s = build("0-1 1-2 2-3 4-5 5-6 6-4", false, ["7"]);
        const r = distanceMeasures(s);
        assert.strictEqual(r.componentCount, 3);
        const path = r.component[s.ids.indexOf("0")];
        const triangle = r.component[s.ids.indexOf("4")];
        const alone = r.component[s.ids.indexOf("7")];
        assert.deepEqual([r.componentDiameter[path], r.componentRadius[path], r.componentSize[path]], [3, 2, 4]);
        assert.closeTo(r.componentAverageShortestPathLength[path], 5 / 3, 1e-12);
        assert.deepEqual(
            [
                r.componentDiameter[triangle],
                r.componentRadius[triangle],
                r.componentAverageShortestPathLength[triangle],
            ],
            [1, 1, 1],
        );
        assert.deepEqual(
            [r.componentDiameter[alone], r.componentRadius[alone], r.componentAverageShortestPathLength[alone]],
            [0, 0, 0],
        );
        assert.strictEqual(r.largestComponent, path);
        assert.strictEqual(r.diameter, 3);
        assert.strictEqual(r.radius, 2);
        assert.strictEqual(eccentricityOf(s, r.eccentricity, "7"), 0);
    });

    it("reads edge weights only when weighted", () => {
        // networkx eccentricity over weighted shortest paths: a 6, b 4, c 5, d 6; average 3.5.
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 2);
        b.addEdge("b", "c", 3);
        b.addEdge("a", "c", 10);
        b.addEdge("c", "d", 1);
        const s = b.freeze();
        const weighted = distanceMeasures(s, { weighted: true });
        assert.deepEqual(
            ["a", "b", "c", "d"].map((id) => eccentricityOf(s, weighted.eccentricity, id)),
            [6, 4, 5, 6],
        );
        assert.strictEqual(weighted.averageShortestPathLength, 3.5);
        assert.strictEqual(distanceMeasures(s).diameter, 2);
    });

    it("follows arc direction on a directed graph", () => {
        const s = build("a-b b-c", true);
        const r = distanceMeasures(s);
        assert.deepEqual([...r.eccentricity], [2, 1, 0]);
        assert.strictEqual(r.componentCount, 1);
        // Reachable ordered pairs: a-b 1, a-c 2, b-c 1.
        assert.closeTo(r.averageShortestPathLength, 4 / 3, 1e-12);
    });

    it("bounds the work with a sample of k sources", () => {
        const s = build(KARATE);
        const r = distanceMeasures(s, { k: 5 });
        assert.isFalse(r.exact);
        assert.strictEqual(r.sourcesUsed, 5);
        const measured = [...r.eccentricity].filter((e) => !Number.isNaN(e));
        assert.lengthOf(measured, 5);
        assert.isAtMost(r.diameter, 5);
        assert.isAtLeast(r.radius, 3);
        // The same k draws the same sources.
        assert.deepEqual([...distanceMeasures(s, { k: 5 }).eccentricity], [...r.eccentricity]);
        // A sample of every node is the exact answer.
        assert.deepEqual(
            [...distanceMeasures(s, { sources: Array.from({ length: 34 }, (_, i) => i) }).eccentricity],
            [...distanceMeasures(s).eccentricity],
        );
    });

    it("measures a cycle, a star and a complete graph exactly", () => {
        // Cycle of six: every eccentricity 3; distances from a node 1, 1, 2, 2, 3 -> mean 9 / 5.
        const cycle = distanceMeasures(build("0-1 1-2 2-3 3-4 4-5 5-0"));
        assert.deepEqual([...cycle.eccentricity], [3, 3, 3, 3, 3, 3]);
        assert.deepEqual([cycle.diameter, cycle.radius], [3, 3]);
        assert.closeTo(cycle.averageShortestPathLength, 9 / 5, 1e-12);

        // Star with a hub and four leaves: hub 1, leaves 2; mean (4 * 2 + 12 * 2) / 20 = 1.6.
        const starSnapshot = build("h-a h-b h-c h-d");
        const star = distanceMeasures(starSnapshot);
        assert.strictEqual(eccentricityOf(starSnapshot, star.eccentricity, "h"), 1);
        assert.strictEqual(eccentricityOf(starSnapshot, star.eccentricity, "a"), 2);
        assert.deepEqual([star.diameter, star.radius], [2, 1]);
        assert.closeTo(star.averageShortestPathLength, 1.6, 1e-12);

        // Complete graph on five: every distance 1.
        const complete = distanceMeasures(build("0-1 0-2 0-3 0-4 1-2 1-3 1-4 2-3 2-4 3-4"));
        assert.deepEqual([...complete.eccentricity], [1, 1, 1, 1, 1]);
        assert.deepEqual([complete.diameter, complete.radius, complete.averageShortestPathLength], [1, 1, 1]);
    });

    it("agrees with a brute-force all-pairs computation on a seeded random weighted graph", () => {
        // A linear congruential generator, so the graph is the same on every run.
        let state = 20261128;
        const random = (): number => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 2 ** 32;
        };
        for (const directed of [false, true]) {
            const n = 30;
            const b = new GraphBuilder({ directed });
            for (let i = 0; i < n; i++) {
                b.addNode(i);
            }
            const w = Array.from({ length: n }, () => new Float64Array(n).fill(Infinity));
            for (let e = 0; e < 45; e++) {
                const u = Math.floor(random() * n);
                const v = Math.floor(random() * n);
                if (u === v || w[u][v] !== Infinity) {
                    continue;
                }
                const weight = 1 + Math.floor(random() * 5);
                b.addEdge(u, v, weight);
                w[u][v] = weight;
                if (!directed) {
                    w[v][u] = weight;
                }
            }
            const s = b.freeze({ checksum: true });
            for (const weighted of [false, true]) {
                // Floyd-Warshall over the ids, the oracle.
                const hop = (x: number): number => (weighted || x === Infinity ? x : 1);
                const d = w.map((row, i) => Float64Array.from(row, (x, j) => (i === j ? 0 : hop(x))));
                for (let k = 0; k < n; k++) {
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
                        }
                    }
                }
                const r = distanceMeasures(s, { weighted });
                const perComponent = new Map<number, { max: number; min: number; sum: number; pairs: number }>();
                for (let i = 0; i < n; i++) {
                    const reached = [...d[i]].filter((x, j) => j !== i && x !== Infinity);
                    const ecc = Math.max(0, ...reached);
                    assert.strictEqual(r.eccentricity[s.ids.indexOf(i)], ecc, `node ${i}`);
                    const c = r.component[s.ids.indexOf(i)];
                    const agg = perComponent.get(c) ?? { max: -Infinity, min: Infinity, sum: 0, pairs: 0 };
                    agg.max = Math.max(agg.max, ecc);
                    agg.min = Math.min(agg.min, ecc);
                    agg.sum += reached.reduce((a, x) => a + x, 0);
                    agg.pairs += reached.length;
                    perComponent.set(c, agg);
                }
                for (const [c, agg] of perComponent) {
                    assert.strictEqual(r.componentDiameter[c], agg.max);
                    assert.strictEqual(r.componentRadius[c], agg.min);
                    assert.closeTo(
                        r.componentAverageShortestPathLength[c],
                        agg.pairs === 0 ? 0 : agg.sum / agg.pairs,
                        1e-12,
                    );
                }
                s.validate({ checksum: true });
            }
        }
    });

    it("refuses a negative weight when weighted, and ignores it otherwise", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", -1);
        const s = b.freeze();
        assert.throws(() => distanceMeasures(s, { weighted: true }), RangeError, /non-negative/);
        assert.strictEqual(distanceMeasures(s).diameter, 1);
    });

    it("gives NaN graph-wide figures on an empty graph", () => {
        const r = distanceMeasures(new GraphBuilder({ directed: false }).freeze());
        assert.strictEqual(r.largestComponent, -1);
        assert.isNaN(r.diameter);
        assert.isNaN(r.radius);
        assert.isNaN(r.averageShortestPathLength);
    });

    it("refuses a k outside the graph", () => {
        assert.throws(() => distanceMeasures(build("a-b"), { k: 3 }), RangeError);
    });
});

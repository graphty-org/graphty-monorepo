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

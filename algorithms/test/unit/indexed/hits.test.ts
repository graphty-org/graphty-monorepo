import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { hits } from "../../../src/indexed/hits.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

function l2(v: ArrayLike<number>): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}

describe("indexed.hits", () => {
    it("makes the only source a pure hub and its targets pure authorities", () => {
        const g = new Graph({ directed: true });
        g.addEdge("h", "a");
        g.addEdge("h", "b");
        g.addEdge("h", "c");
        const s = checksummedSnapshot(g);
        const r = hits(s);
        expect(r.hubs[0]).toBeCloseTo(1, 9);
        expect(r.authorities[0]).toBe(0);
        for (let u = 1; u < 4; u++) {
            expect(r.hubs[u]).toBe(0);
            expect(r.authorities[u]).toBeCloseTo(1 / Math.sqrt(3), 9);
        }
        expect(l2(r.hubs)).toBeCloseTo(1, 12);
        expect(l2(r.authorities)).toBeCloseTo(1, 12);
        s.validate({ checksum: true });
    });

    it("gives an undirected graph equal hubs and authorities", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("c", "d");
        const s = checksummedSnapshot(g);
        const r = hits(s);
        for (let u = 0; u < s.nodeCount; u++) {
            expect(r.hubs[u]).toBeCloseTo(r.authorities[u], 12);
        }
        s.validate({ checksum: true });
    });

    it("reports the iteration cap it stopped at", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("a", "c");
        const s = checksummedSnapshot(g);
        const r = hits(s, { maxIterations: 2, tolerance: 0 });
        expect(r.iterations).toBe(2);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("normalized: false rescales both vectors so their largest entry is 1", () => {
        const g = new Graph({ directed: true });
        g.addEdge("h", "a");
        g.addEdge("h", "b");
        g.addEdge("i", "a");
        const s = checksummedSnapshot(g);
        const r = hits(s, { normalized: false });
        expect(Math.max(...r.hubs)).toBeCloseTo(1, 12);
        expect(Math.max(...r.authorities)).toBeCloseTo(1, 12);
        s.validate({ checksum: true });
    });

    it("weighted: true scales a contribution by the arc weight", () => {
        const g = new Graph({ directed: true });
        g.addEdge("h", "a", 3);
        g.addEdge("h", "b", 1);
        const s = checksummedSnapshot(g);
        const r = hits(s, { weighted: true, maxIterations: 1 });
        expect(r.authorities[1]).toBeCloseTo(3 * r.authorities[2], 12);
        const flat = hits(s, { maxIterations: 1 });
        expect(flat.authorities[1]).toBeCloseTo(flat.authorities[2], 12);
        s.validate({ checksum: true });
    });

    for (const { name, graph } of [...directedFixtures(), ...undirectedFixtures()]) {
        it(`agrees with the legacy hits on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            // Same alternating iteration, same L2 normalization every round, same stopping rule on the
            // largest single-node change; the only difference is the order the sums are accumulated in.
            for (const options of [{}, { maxIterations: 4 }, { normalized: false }]) {
                const ported = hits(s, options);
                const legacy = legacyResult() as HITSResult;
                for (let u = 0; u < s.nodeCount; u++) {
                    const id = String(s.ids.idOf(u));
                    expect(ported.hubs[u]).toBeCloseTo(legacy.hubs[id], 9);
                    expect(ported.authorities[u]).toBeCloseTo(legacy.authorities[id], 9);
                }
            }
            s.validate({ checksum: true });
        });
    }
});

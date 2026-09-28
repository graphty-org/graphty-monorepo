import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { louvain } from "../../../src/indexed/louvain.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { undirectedFixtures } from "./port-fixtures.js";

function clique(size: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            g.addEdge(`k${i}`, `k${j}`);
        }
    }
    return g;
}

/**
 * The fixtures whose community structure has one right answer -- disjoint cliques and triangles --
 * which both implementations find. The random graphs and the karate club are left out on purpose:
 * Louvain is a greedy heuristic whose result depends on the order nodes are visited in, and on those
 * the two stop at different partitions. Measured by the package's own modularity formula the port
 * scores 0.29969 against the legacy's 0.28104 on the 40-node random graph, 0.35021 against 0.36871
 * on the 80-node weighted one, and 0.41880 against 0.34040 on the karate club.
 */
const DETERMINED = new Set([
    "two triangles and an isolated node",
    "path of six",
    "three four-cliques in a chain",
    "two five-cliques, disconnected",
    "weighted star with one rim edge",
]);

describe("indexed.louvain", () => {
    it("throws on a directed snapshot", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        expect(() => louvain(s)).toThrow("requires an undirected graph");
        s.validate({ checksum: true });
    });

    it("finds two disjoint triangles and leaves an isolated node alone", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("d", "e");
        g.addEdge("e", "f");
        g.addEdge("f", "d");
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = louvain(s);
        expect(r.count).toBe(3);
        expect([...r.labels]).toEqual([0, 0, 0, 1, 1, 1, 2]);
        expect(r.groups().map((group) => group.length)).toEqual([3, 3, 1]);
        expect(r.groups()).toBe(r.groups());
        // Two triangles out of six edges: Q = 2 * (6/12 - (6/12)^2).
        expect(r.modularity).toBeCloseTo(0.5, 12);
        expect(r.iterations).toBeGreaterThan(0);
        s.validate({ checksum: true });
    });

    it("splits two disconnected five-cliques into exactly those two communities", () => {
        const g = undirectedFixtures().find((f) => f.name === "two five-cliques, disconnected")?.graph;
        expect(g).toBeDefined();
        const s = checksummedSnapshot(g as Graph);
        const r = louvain(s);
        expect(r.count).toBe(2);
        expect(r.groups().map((group) => [...group])).toEqual([
            [0, 1, 2, 3, 4],
            [5, 6, 7, 8, 9],
        ]);
        s.validate({ checksum: true });
    });

    it("leaves every node alone on a graph with no edges", () => {
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        const s = b.freeze({ label: "edgeless", checksum: true });
        const r = louvain(s);
        expect(r.count).toBe(3);
        expect([...r.labels]).toEqual([0, 1, 2]);
        expect(r.modularity).toBe(0);
        expect(r.iterations).toBe(0);
        s.validate({ checksum: true });
    });

    it("keeps every node separate at a resolution that makes any merge a loss", () => {
        const s = checksummedSnapshot(clique(4));
        const r = louvain(s, { resolution: 100 });
        expect(r.count).toBe(4);
        expect(r.iterations).toBe(0);
        const merged = louvain(s);
        expect(merged.count).toBe(1);
        s.validate({ checksum: true });
    });

    for (const { name, graph } of undirectedFixtures()) {
        it(`reports the modularity the package's own formula gives, on ${name}`, () => {
            // The port computes Q per arc over typed arrays; the legacy `calculateModularity`
            // computed it per edge over a Graph. The record is what the legacy formula gave for the
            // partition the port found when it was recorded, so this fails when either the port's
            // modularity or its partition changes.
            const s = checksummedSnapshot(graph);
            const r = louvain(s);
            expect(r.modularity).toBeCloseTo(legacyResult() as number, 12);
            s.validate({ checksum: true });
        });

        if (DETERMINED.has(name)) {
            it(`finds the same communities as the legacy louvain on ${name}`, () => {
                const s = checksummedSnapshot(graph);
                const key = (ids: readonly string[]): string => [...ids].sort().join(",");
                const ported = louvain(s)
                    .groups()
                    .map((group) => key([...group].map((u) => String(s.ids.idOf(u)))))
                    .sort();
                const legacy = (legacyResult() as CommunityResult).communities
                    .map((community) => key(community.map((id) => String(id))))
                    .sort();
                expect(ported).toEqual(legacy);
                s.validate({ checksum: true });
            });
        }
    }

    it("reaches the published Louvain modularity on Zachary's karate club", () => {
        // 0.4188034188 in four communities is what networkx's louvain_communities reports for this
        // graph, and it is the number papers quote. The legacy implementation stops at 0.3404010519
        // in seven communities, so this is the one fixture where the two differ by enough to matter
        // rather than by search order.
        const graph = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph;
        const s = checksummedSnapshot(graph as Graph);
        const r = louvain(s);
        expect(r.count).toBe(4);
        expect(r.modularity).toBeCloseTo(0.4188034188034188, 12);
        expect((legacyResult() as CommunityResult).modularity).toBeLessThan(r.modularity);
        s.validate({ checksum: true });
    });
});

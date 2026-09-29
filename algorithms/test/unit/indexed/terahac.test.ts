import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { teraHAC } from "../../../src/indexed/terahac.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { NodeId, TeraHACClusterNode as ClusterNode, TeraHACConfig } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/** The port's dendrogram in the legacy shape, with node indices as ids (the ids legacy was recorded with: the same graph renumbered 0..n-1). */
function portShape(g: Graph, config: TeraHACConfig): { dendrogram: ClusterNode; distances: number[] } {
    const s = checksummedSnapshot(g);
    const r = teraHAC(s, config);
    s.validate({ checksum: true });
    const n = s.nodeCount;
    const build = (c: number): ClusterNode => {
        if (c < n) {
            return { id: String(c), members: new Set([c]), distance: 0, size: 1 };
        }
        const left = build(r.left[c - n]);
        const right = build(r.right[c - n]);
        return {
            id: String(c),
            members: new Set([...left.members, ...right.members]),
            left,
            right,
            distance: r.distance[c - n],
            size: r.size[c - n],
        };
    };
    return { dendrogram: build(r.root), distances: Array.from(r.distance.subarray(0, r.merges)) };
}

/**
 * Whether a legacy cluster Map (recorded over the graph renumbered 0..n-1, so each key is a node index) and the port's
 * labels describe the same partition.
 */
function expectSamePartition(legacy: Map<NodeId, number>, labels: Uint32Array): void {
    expect(legacy.size).toBe(labels.length);
    const legacyToPort = new Map<number, number>();
    const portToLegacy = new Map<number, number>();
    for (const [index, legacyLabel] of legacy) {
        const portLabel = labels[index as number];
        expect(legacyToPort.get(legacyLabel) ?? portLabel).toBe(portLabel);
        expect(portToLegacy.get(portLabel) ?? legacyLabel).toBe(legacyLabel);
        legacyToPort.set(legacyLabel, portLabel);
        portToLegacy.set(portLabel, legacyLabel);
    }
}

const fixtures: FacadeFixture[] = [...undirectedFixtures(), ...directedFixtures()];
const LINKAGES = ["single", "complete", "average", "ward"] as const;

describe("indexed.teraHAC", () => {
    it("throws on an empty graph and on a bad cluster count, as legacy does", () => {
        const empty = new Graph({ directed: false });
        expect(() => teraHAC(toSnapshot(empty))).toThrow("Cannot cluster empty graph");
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        expect(() => teraHAC(toSnapshot(g), { numClusters: 0 })).toThrow("numClusters must be a positive integer");
        expect(() => teraHAC(toSnapshot(g), { numClusters: 1.5 })).toThrow("numClusters must be a positive integer");
    });

    it("returns a single node as its own root", () => {
        const g = new Graph({ directed: false });
        g.addNode("only");
        const r = teraHAC(toSnapshot(g));
        expect(r.root).toBe(0);
        expect(r.merges).toBe(0);
        expect(r.left.length).toBe(0);
        expect([...r.labels]).toEqual([0]);
        expect(r.count).toBe(1);
    });

    it("joins what distance never merges under an infinite-distance root", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addNode("c");
        const r = teraHAC(toSnapshot(g), { numClusters: 2 });
        expect(r.merges).toBe(1);
        expect(r.root).toBe(4);
        expect(Array.from(r.distance)).toEqual([1, Infinity]);
        expect(Array.from(r.size)).toEqual([2, 3]);
        expect(r.count).toBe(2);
        expect(r.groups().map((group) => [...group])).toEqual([[0, 1], [2]]);
    });

    // The defect this port removes: legacy teraHAC indexes its distance matrix with
    // parseInt(String(nodeId)), which is NaN for "a" and an off-by-one for ids that start at 1, so
    // every distance after the first merge is its "unreachable" 100 and the merges are arbitrary.
    it("clusters string ids exactly as legacy clusters the same graph numbered 0..n-1", () => {
        const g = new Graph({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
            ["c", "d"],
        ]) {
            g.addEdge(u, v);
        }
        const r = teraHAC(toSnapshot(g), { numClusters: 2 });
        // Every edge is one hop, so average linkage grows one cluster across the bridge before the
        // far triangle closes; legacy on the numbered graph makes the same merges.
        expect(r.groups().map((group) => [...group])).toEqual([
            [0, 1, 2, 3],
            [4, 5],
        ]);
        expectFacadeMatchesLegacy([{ name: "two triangles and a bridge, string ids", graph: g }], (graph) =>
            portShape(graph, { numClusters: 2 }),
        );
        // The same graph with ids 1..6: legacy reads row id, one past the node's own row.
        const shifted = new Graph({ directed: false });
        for (const e of g.edges()) {
            shifted.addEdge("abcdef".indexOf(String(e.source)) + 1, "abcdef".indexOf(String(e.target)) + 1);
        }
        const again = teraHAC(toSnapshot(shifted), { numClusters: 2 });
        expect(Array.from(again.labels)).toEqual(Array.from(r.labels));
        expect(Array.from(again.distance)).toEqual(Array.from(r.distance));
    });

    for (const linkage of LINKAGES) {
        for (const useGraphDistance of [true, false]) {
            it(`equals legacy on every fixture: ${linkage} linkage, useGraphDistance ${String(useGraphDistance)}`, () => {
                const config = { linkage, useGraphDistance, onWarning: () => undefined };
                expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, config));
                for (const { graph } of fixtures) {
                    expectSamePartition(
                        (legacyResult() as TeraHACResult).clusters,
                        teraHAC(toSnapshot(graph), config).labels,
                    );
                }
            });
        }
    }

    it("equals legacy when stopped at a cluster count or a distance threshold", () => {
        for (const config of [
            { numClusters: 3 },
            { numClusters: 5, linkage: "complete" as const },
            { distanceThreshold: 1.5 },
            { distanceThreshold: 2, linkage: "single" as const },
        ]) {
            expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, config));
            for (const { graph } of fixtures) {
                expectSamePartition(
                    (legacyResult() as TeraHACResult).clusters,
                    teraHAC(toSnapshot(graph), config).labels,
                );
            }
        }
    });

    it("treats a zero distance threshold as a threshold, merging nothing", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const r = teraHAC(toSnapshot(g), { distanceThreshold: 0 });
        expect(r.merges).toBe(0);
        expect(r.count).toBe(3);
    });

    it("reads a parallel edge and a self-loop as the simple edge", () => {
        const multi = new GraphBuilder({ directed: false });
        multi.addEdge("a", "b");
        multi.addEdge("a", "b");
        multi.addEdge("b", "c");
        multi.addEdge("c", "c");
        const plain = new GraphBuilder({ directed: false });
        plain.addEdge("a", "b");
        plain.addEdge("b", "c");
        const withExtras = teraHAC(multi.freeze());
        const without = teraHAC(plain.freeze());
        expect(Array.from(withExtras.distance)).toEqual(Array.from(without.distance));
        expect(Array.from(withExtras.left)).toEqual(Array.from(without.left));
        expect(Array.from(withExtras.right)).toEqual(Array.from(without.right));
    });
});

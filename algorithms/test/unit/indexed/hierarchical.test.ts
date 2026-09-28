import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    type ClusterNode,
    hierarchicalClustering as legacyHierarchical,
    type LinkageMethod,
} from "../../../src/clustering/hierarchical.js";
import { Graph } from "../../../src/core/graph.js";
import { hierarchicalClustering, type HierarchicalResult } from "../../../src/indexed/hierarchical.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

const LINKAGES: LinkageMethod[] = ["single", "complete", "average", "ward"];

/** A legacy cluster as plain data: id, members as strings, distance, height and its children. */
interface Plain {
    id: string;
    members: string[];
    distance: number;
    height: number;
    children: Plain[];
}

function plainLegacy(node: ClusterNode<string>): Plain {
    const children = node.trees ?? [node.left, node.right].filter((c): c is ClusterNode<string> => c !== undefined);
    return {
        id: node.id,
        members: [...node.members],
        distance: node.distance,
        height: node.height,
        children: children.map(plainLegacy),
    };
}

/** The port's dendrogram in the legacy shape, forest node included, for a structural comparison. */
function plainPort(s: GraphSnapshot, r: HierarchicalResult): Plain {
    const n = r.nodeCount;
    const name = (c: number): Plain => ({
        id: c < n ? `leaf-${c}` : `cluster-${c}`,
        members: Array.from(r.members(c), (i) => String(s.ids.idOf(i))),
        distance: c < n ? 0 : r.distance[c - n],
        height: r.height[c],
        children: c < n ? [] : [name(r.left[c - n]), name(r.right[c - n])],
    });
    if (r.roots.length === 1) {
        return name(r.roots[0]);
    }
    const trees = Array.from(r.roots, name);
    return {
        id: `forest-${n + r.left.length}`,
        members: Array.from({ length: n }, (_, i) => String(s.ids.idOf(i))),
        distance: Infinity,
        height: Math.max(...trees.map((t) => t.height)) + 1,
        children: trees,
    };
}

describe("indexed.hierarchicalClustering", () => {
    it("merges a path pairwise, breaking distance ties by the legacy id order", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "d");
        const s = checksummedSnapshot(g);
        const r = hierarchicalClustering(s);
        expect([...r.left]).toEqual([0, 2, 4]);
        expect([...r.right]).toEqual([1, 3, 5]);
        expect([...r.distance]).toEqual([1, 1, 1]);
        expect([...r.roots]).toEqual([6]);
        expect([...r.members(6)]).toEqual([0, 1, 2, 3]);
        expect([...r.height]).toEqual([0, 0, 0, 0, 1, 1, 2]);
        expect(r.cut(0).map((c) => [...c])).toEqual([[0], [1], [2], [3]]);
        expect(r.cut(1).map((c) => [...c])).toEqual([
            [0, 1],
            [2, 3],
        ]);
        s.validate({ checksum: true });
    });

    it("keeps disconnected parts as separate roots and cuts inside each", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("c", "d");
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = hierarchicalClustering(s, { linkage: "complete" });
        expect(r.left.length).toBe(2);
        expect([...r.roots].map((c) => [...r.members(c)])).toEqual([[4], [0, 1], [2, 3]]);
        expect(r.cut(0).map((c) => [...c])).toEqual([[4], [0], [1], [2], [3]]);
        expect(r.cut(1).map((c) => [...c])).toEqual([[4], [0, 1], [2, 3]]);
        s.validate({ checksum: true });
    });

    it("returns an empty dendrogram for an empty snapshot and a lone leaf for one node", () => {
        const empty = hierarchicalClustering(new GraphBuilder({ directed: false }).freeze());
        expect(empty.roots.length).toBe(0);
        expect(empty.cut(0)).toEqual([]);
        const b = new GraphBuilder({ directed: false });
        b.addNode("only");
        const one = hierarchicalClustering(b.freeze());
        expect([...one.roots]).toEqual([0]);
        expect(one.cut(0).map((c) => [...c])).toEqual([[0]]);
    });

    it("refuses an unknown linkage and an unknown cluster", () => {
        const s = checksummedSnapshot(undirectedFixtures()[0].graph);
        expect(() => hierarchicalClustering(s, { linkage: "median" as never })).toThrow(RangeError);
        expect(() => hierarchicalClustering(s).members(99)).toThrow(RangeError);
    });

    for (const linkage of LINKAGES) {
        it(`builds the legacy dendrogram exactly with ${linkage} linkage on every fixture`, () => {
            for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
                const s = checksummedSnapshot(graph);
                const legacy = legacyHierarchical(graph, linkage);
                const port = hierarchicalClustering(s, { linkage });
                expect(plainPort(s, port), name).toEqual(plainLegacy(legacy.root));
                // One dendrogram entry per leaf and merge, plus the legacy forest node.
                expect(legacy.dendrogram.length, name).toBe(
                    s.nodeCount + port.left.length + (port.roots.length > 1 ? 1 : 0),
                );
                if (port.roots.length === 1) {
                    for (const [h, clusters] of legacy.clusters) {
                        const cut = port.cut(h).map((c) => Array.from(c, (i) => String(s.ids.idOf(i))));
                        expect(cut, `${name} at height ${h}`).toEqual(clusters.map((set) => [...set]));
                    }
                }
                s.validate({ checksum: true });
            }
        });
    }
});

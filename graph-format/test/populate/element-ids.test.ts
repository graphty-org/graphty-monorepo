/**
 * Element ids at the edges of the package: `edgeIds` on fromEdgeArrays, the fromElements factory
 * that returns the snapshot with the host elements in index order, and the NodeRef / NodeSet
 * resolvers that turn ids, index arrays and masks into node indices.
 */

import { describe, expect, it } from "vitest";

import { INVALID_INDEX } from "../../src/constants.js";
import { GraphFormatError } from "../../src/errors.js";
import { fromEdgeArrays } from "../../src/populate/from-edge-arrays.js";
import { fromElements } from "../../src/populate/from-elements.js";
import { makeMask, maskSet, maskToIndices } from "../../src/util/mask.js";
import { resolveNode, resolveNodeMask, resolveNodeSet } from "../../src/util/node-set.js";

function code(fn: () => unknown): string {
    try {
        fn();
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err.code;
        }
        throw err;
    }
    throw new Error("expected a GraphFormatError");
}

const src = new Uint32Array([0, 1, 2]);
const dst = new Uint32Array([1, 2, 0]);

describe("fromEdgeArrays: edgeIds", () => {
    it("builds the role id edge column so edgeIndexOf resolves every edge id", () => {
        const s = fromEdgeArrays({ directed: true, ids: ["a", "b", "c"], src, dst, edgeIds: ["ab", "bc", "ca"] });
        expect(s.edgeIndexOf("ab")).toBe(0);
        expect(s.edgeIndexOf("ca")).toBe(2);
        expect(s.edgeIndexOf("zz")).toBe(INVALID_INDEX);
        expect(s.edges.byRole("id")?.meta.unique).toBe(true);
    });

    it("accepts numeric edge ids", () => {
        const s = fromEdgeArrays({ directed: false, nodeCount: 3, src, dst, edgeIds: [10, 20, 30] });
        expect(s.edgeIndexOf(20)).toBe(1);
    });

    it("rejects an edgeIds array of the wrong length and a repeated edge id", () => {
        expect(code(() => fromEdgeArrays({ directed: true, nodeCount: 3, src, dst, edgeIds: ["x"] }))).toBe(
            "E_COLUMN_LENGTH",
        );
        expect(code(() => fromEdgeArrays({ directed: true, nodeCount: 3, src, dst, edgeIds: ["x", "y", "x"] }))).toBe(
            "E_DUPLICATE_EDGE_ID",
        );
    });
});

interface HostNode {
    readonly key: string;
}
interface HostEdge {
    readonly name: string;
    readonly from: string;
    readonly to: string;
    readonly w?: number;
}

describe("fromElements", () => {
    const nodes: HostNode[] = [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "lonely" }];
    const edges: HostEdge[] = [
        { name: "e1", from: "a", to: "b", w: 2 },
        { name: "e2", from: "b", to: "c", w: 3 },
        { name: "e3", from: "c", to: "a", w: 4 },
    ];

    it("returns the snapshot with the host nodes and edges in index order", () => {
        const {
            snapshot,
            nodes: byIndex,
            edges: byEdge,
        } = fromElements(nodes, edges, {
            directed: true,
            id: (n) => n.key,
            source: (e) => e.from,
            target: (e) => e.to,
            edgeId: (e) => e.name,
            weight: (e) => e.w ?? 1,
        });
        expect(snapshot.nodeCount).toBe(4);
        expect(snapshot.edgeCount).toBe(3);
        expect(byIndex[snapshot.ids.indexOf("lonely")]).toBe(nodes[3]);
        const e = snapshot.edgeIndexOf("e2");
        expect(byEdge[e]).toBe(edges[1]);
        expect(snapshot.ids.idOf(snapshot.edgeSource(e))).toBe("b");
        expect(snapshot.ids.idOf(snapshot.edgeTarget(e))).toBe("c");
        expect(snapshot.weights).not.toBeNull();
    });

    it("works without edge ids or weights", () => {
        const { snapshot, edges: byEdge } = fromElements(nodes, edges, {
            directed: false,
            id: (n) => n.key,
            source: (e) => e.from,
            target: (e) => e.to,
        });
        expect(snapshot.weights).toBeNull();
        expect(snapshot.edges.byRole("id")).toBeNull();
        expect(byEdge).toEqual(edges);
    });

    it("rejects an edge whose endpoint is not a node", () => {
        expect(
            code(() =>
                fromElements(nodes, [{ name: "x", from: "a", to: "nope" }], {
                    directed: true,
                    id: (n) => n.key,
                    source: (e) => e.from,
                    target: (e) => e.to,
                }),
            ),
        ).toBe("E_UNKNOWN_NODE");
    });
});

describe("NodeRef and NodeSet resolvers", () => {
    const s = fromEdgeArrays({ directed: true, ids: ["a", "b", "c", "d"], src, dst });

    it("resolves a node index or a node id", () => {
        expect(resolveNode(s, 2)).toBe(2);
        expect(resolveNode(s, { id: "d" })).toBe(3);
        expect(code(() => resolveNode(s, { id: "nope" }))).toBe("E_UNKNOWN_NODE");
    });

    it("leaves a bare node index unchecked so each caller keeps its own range error", () => {
        expect(resolveNode(s, 99)).toBe(99);
    });

    it("refuses a node id on a graph that has no id map", () => {
        const view = { nodeCount: 4 };
        expect(code(() => resolveNode(view, { id: "a" }))).toBe("E_UNKNOWN_NODE");
    });

    it("resolves an index array, a mask and ids to node indices", () => {
        const indices = [3, 1];
        expect(resolveNodeSet(s, indices)).toBe(indices);
        const mask = makeMask(4);
        maskSet(mask, 0, true);
        maskSet(mask, 2, true);
        expect(Array.from(resolveNodeSet(s, { mask }))).toEqual([0, 2]);
        expect(Array.from(resolveNodeSet(s, { ids: ["c", "a"] }))).toEqual([2, 0]);
        expect(code(() => resolveNodeSet(s, { ids: ["zz"] }))).toBe("E_UNKNOWN_NODE");
    });

    it("resolves any node set to a mask", () => {
        expect(Array.from(maskToIndices(resolveNodeMask(s, [3, 1]), 4))).toEqual([1, 3]);
        expect(Array.from(maskToIndices(resolveNodeMask(s, { ids: new Set(["b"]) }), 4))).toEqual([1]);
        const mask = makeMask(4, true);
        expect(resolveNodeMask(s, { mask })).toBe(mask);
        expect(code(() => resolveNodeMask(s, [4]))).toBe("E_INDEX_RANGE");
    });
});

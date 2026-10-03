import assert from "node:assert";

import { fromEdgeArrays, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import * as layout from "../../src";

// a - b - c - d (a path), ids are strings
const s = fromEdgeArrays({
    directed: false,
    ids: ["a", "b", "c", "d"],
    src: new Uint32Array([0, 1, 2]),
    dst: new Uint32Array([1, 2, 3]),
});
const same = (x: layout.LayoutResult, y: layout.LayoutResult): void => {
    assert.deepStrictEqual(Array.from(x.positions), Array.from(y.positions));
};

describe("layouts accept node ids wherever they take a node or a node set", () => {
    it("bfs start and radial root take { id }", () => {
        same(layout.bfs(s, { start: { id: "c" } }), layout.bfs(s, { start: 2 }));
        same(layout.radial(s, { root: { id: "b" } }), layout.radial(s, { root: 1 }));
    });

    it("shell and multipartite take index arrays, masks or ids per group", () => {
        const inner = makeMask(4);
        maskSet(inner, 0, true);
        same(
            layout.shell(s, { nlist: [{ mask: inner }, { ids: ["b", "c", "d"] }] }),
            layout.shell(s, { nlist: [[0], [1, 2, 3]] }),
        );
        same(
            layout.multipartite(s, { subsets: [{ ids: ["a", "b"] }, new Uint32Array([2, 3])] }),
            layout.multipartite(s, {
                subsets: [
                    [0, 1],
                    [2, 3],
                ],
            }),
        );
    });

    it("bipartite top takes ids or a plain index array, and still reads a Uint32Array as a mask", () => {
        const top = makeMask(4);
        maskSet(top, 0, true);
        maskSet(top, 2, true);
        const byMask = layout.bipartite(s, { top });
        same(layout.bipartite(s, { top: { ids: ["a", "c"] } }), byMask);
        same(layout.bipartite(s, { top: [0, 2] }), byMask);
    });

    it("an unknown id throws", () => {
        assert.throws(() => layout.bfs(s, { start: { id: "zz" } }), /zz|E_UNKNOWN_NODE|not/);
    });
});

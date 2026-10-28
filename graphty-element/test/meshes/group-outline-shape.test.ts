/**
 * @file The pieces that make a group outline enclose its whole group
 * (design/rendering/shader-studio/decisions.md section 5.5): the minimum spanning tree its
 * connectors run along, the connector's kernel as picking reads it, and which group outlines
 * share a level.
 */

import { assert, describe, it } from "vitest";

import { fieldAt, levelJoins, spanningTree } from "../../src/meshes/GroupOutlinePass";
import type { GroupOutlineSet } from "../../src/session/styles/StylesApi";

/**
 * The total length of a tree's edges.
 * @param at - x, y, z per point.
 * @param edges - Two point indices per edge.
 * @returns The length.
 */
function lengthOf(at: Float32Array, edges: Uint32Array): number {
    let sum = 0;
    for (let e = 0; e < edges.length; e += 2) {
        const [i, j] = [edges[e], edges[e + 1]];
        sum += Math.hypot(at[i * 3] - at[j * 3], at[i * 3 + 1] - at[j * 3 + 1], at[i * 3 + 2] - at[j * 3 + 2]);
    }

    return sum;
}

/**
 * Whether edges join every point into one tree: n - 1 edges and every point reached from the first.
 * @param n - How many points.
 * @param edges - Two point indices per edge.
 * @returns True when they do.
 */
function spans(n: number, edges: Uint32Array): boolean {
    const reached = new Set([0]);
    for (let grew = true; grew;) {
        grew = false;
        for (let e = 0; e < edges.length; e += 2) {
            const [i, j] = [edges[e], edges[e + 1]];
            if (reached.has(i) !== reached.has(j)) {
                reached.add(i).add(j);
                grew = true;
            }
        }
    }

    return edges.length === (n - 1) * 2 && reached.size === n;
}

describe("spanningTree", () => {
    it("joins n points with n - 1 edges, of the least total length", () => {
        // A unit square and a far point beside one corner: the tree is three sides of the square
        // and the 5-long reach to the far point, 8 in all.
        const at = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 6, 1, 0]);
        const edges = spanningTree(at);
        assert.isTrue(spans(5, edges));
        assert.closeTo(lengthOf(at, edges), 8, 1e-6);
    });

    it("matches the shortest tree of every choice of edges on a small fixture", () => {
        const at = new Float32Array([0, 0, 0, 3, 1, 0, 1, 4, 2, 5, 5, 0, 2, 2, 1]);
        const n = 5;
        const pairs: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                pairs.push([i, j]);
            }
        }

        let shortest = Infinity;
        for (let mask = 0; mask < 1 << pairs.length; mask++) {
            const chosen = pairs.filter((_, k) => (mask & (1 << k)) !== 0);
            const edges = new Uint32Array(chosen.flat());
            if (chosen.length === n - 1 && spans(n, edges)) {
                shortest = Math.min(shortest, lengthOf(at, edges));
            }
        }

        const tree = spanningTree(at);
        assert.isTrue(spans(n, tree));
        assert.closeTo(lengthOf(at, tree), shortest, 1e-5);
    });

    it("has no edges for one point or none", () => {
        assert.lengthOf(spanningTree(new Float32Array([1, 2, 3])), 0);
        assert.lengthOf(spanningTree(new Float32Array(0)), 0);
    });
});

describe("fieldAt with connectors", () => {
    it("peaks at 1 all along a connector and falls off across it as a member's kernel does", () => {
        const discs = new Float32Array([0, 0, 10, 100, 0, 10]);
        const bridges = new Float32Array([0, 0, 100, 0, 10]);
        assert.closeTo(fieldAt(discs, 50, 0), 0, 1e-9, "the two members alone leave a gap");
        assert.closeTo(fieldAt(discs, 50, 0, bridges), 1, 1e-9);
        assert.closeTo(fieldAt(discs, 50, 5, bridges), 0.75 ** 2, 1e-9);
        assert.closeTo(fieldAt(discs, 50, 10, bridges), 0, 1e-9);
    });
});

describe("levelJoins", () => {
    /**
     * A group outline.
     * @param layer - Its id.
     * @param shader - Its shader.
     * @param members - Its one group's members.
     * @returns It.
     */
    function layer(layer: string, shader: string, members: string[]): GroupOutlineSet {
        return { layer, use: { shader }, groups: [{ key: null, members }], left: 0 };
    }

    it("puts sibling layers of one shader on one level, and a subset of a level above it", () => {
        assert.deepEqual(
            levelJoins([
                layer("a", "hull", ["1", "2"]),
                layer("b", "hull", ["3"]),
                layer("c", "hull", ["4", "5"]),
                layer("sub", "hull", ["1"]),
                layer("other", "bubble", ["9"]),
            ]),
            [false, true, true, false, false],
        );
    });
});

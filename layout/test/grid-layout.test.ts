import { assert, describe, it } from "vitest";

import { completeGraph, type Graph, gridLayout } from "../src";

/** A path 0 - 1 - ... - (n-1). */
const pathGraph = (n: number): Graph => ({
    nodes: () => Array.from({ length: n }, (_, i) => i),
    edges: () => Array.from({ length: n - 1 }, (_, i): [number, number] => [i, i + 1]),
});


describe("Grid Layout", () => {
    it("places nine nodes on a three-by-three lattice with equal spacing", () => {
        const graph = completeGraph(9);
        const positions = gridLayout(graph);

        const xs = [...new Set(graph.nodes().map((node) => positions[node][0]))].sort((a, b) => a - b);
        const ys = [...new Set(graph.nodes().map((node) => positions[node][1]))].sort((a, b) => a - b);
        assert.deepEqual(xs, [-1, 0, 1]);
        assert.deepEqual(ys, [-1, 0, 1]);

        // node i sits at column i % 3, row floor(i / 3)
        assert.deepEqual(positions[0], [-1, -1]);
        assert.deepEqual(positions[4], [0, 0]);
        assert.deepEqual(positions[5], [1, 0]);
        assert.deepEqual(positions[8], [1, 1]);
    });

    it("gives every node its own cell", () => {
        const graph = pathGraph(10);
        const positions = gridLayout(graph);
        const cells = new Set(graph.nodes().map((node) => positions[node].join(",")));
        assert.equal(cells.size, 10);
    });

    it("honours an explicit column count, scale and centre", () => {
        const graph = pathGraph(6);
        const positions = gridLayout(graph, 2, 2, [10, 20]);

        // 2 columns x 3 rows, centred; the longer side (rows) spans [-scale, scale], so spacing 2
        assert.deepEqual(positions[0], [9, 18]);
        assert.deepEqual(positions[1], [11, 18]);
        assert.deepEqual(positions[2], [9, 20]);
        assert.deepEqual(positions[5], [11, 22]);
    });

    it("handles an empty graph and a single node", () => {
        assert.deepEqual(gridLayout({ nodes: () => [], edges: () => [] }), {});
        assert.deepEqual(gridLayout({ nodes: () => ["a"], edges: () => [] }), { a: [0, 0] });
    });

    it("rejects a column count below one", () => {
        assert.throws(() => gridLayout(pathGraph(3), 0), /columns/);
    });
});

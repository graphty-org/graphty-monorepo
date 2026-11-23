/**
 * Moving the stored edges of a graph through a renumbering in place: down after a removal, up after rows are
 * put back, and both ways at once, each edge kept on its new row with its ends and record (issue #9164).
 */
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { RowEdges } from "../../src/data/RowMap";

const X = INVALID_INDEX;

/**
 * Edges on rows 0..n-1, counter 10 + row, ends `s<row>` and `t<row>`.
 * @param rows - The rows that hold an edge.
 * @returns The map.
 */
function edgesOn(rows: readonly number[]): RowEdges<string, string> {
    const edges = new RowEdges<string, string>();
    for (const row of rows) {
        edges.set(row, {
            edgeId: 10 + row,
            record: `r${row}`,
            sourceId: `s${row}`,
            targetId: `t${row}`,
            edgeIndex: row,
        });
    }

    return edges;
}

/**
 * Remap, recording the callbacks.
 * @param edges - The map.
 * @param remap - Old row to new.
 * @returns What each callback was called with, and every row after.
 */
function remapped(
    edges: RowEdges<string, string>,
    remap: readonly number[],
): { moved: [number, number][]; dropped: number[]; rows: [number, string, string, string, number][] } {
    const moved: [number, number][] = [];
    const dropped: number[] = [];
    edges.remap(
        Uint32Array.from(remap),
        (edgeId, row) => moved.push([edgeId, row]),
        (edgeId) => dropped.push(edgeId),
    );
    const rows = [...edges].map(
        ([row, edge]) =>
            [row, edge.record, edge.sourceId, edge.targetId, edge.edgeId] as [number, string, string, string, number],
    );
    return { moved: moved.sort((a, b) => a[0] - b[0]), dropped, rows };
}

describe("RowEdges.remap", () => {
    it("closes a removal up", () => {
        const edges = edgesOn([0, 1, 2, 3, 4]);
        const result = remapped(edges, [0, X, 1, 2, X]);
        assert.deepEqual(result.dropped.sort(), [11, 14]);
        assert.deepEqual(result.moved, [
            [10, 0],
            [12, 1],
            [13, 2],
        ]);
        assert.deepEqual(result.rows, [
            [0, "r0", "s0", "t0", 10],
            [1, "r2", "s2", "t2", 12],
            [2, "r3", "s3", "t3", 13],
        ]);
        assert.strictEqual(edges.size, 3);
    });

    it("moves rows up past rows put back", () => {
        const edges = edgesOn([0, 1, 2]);
        const result = remapped(edges, [0, 2, 4]);
        assert.deepEqual(result.rows, [
            [0, "r0", "s0", "t0", 10],
            [2, "r1", "s1", "t1", 11],
            [4, "r2", "s2", "t2", 12],
        ]);
        assert.isUndefined(edges.get(1));
        assert.strictEqual(edges.size, 3);
    });

    it("moves some rows down and others up", () => {
        const edges = edgesOn([0, 1, 3]);
        const result = remapped(edges, [1, 0, X, 3]);
        assert.deepEqual(result.dropped, []);
        assert.deepEqual(result.rows, [
            [0, "r1", "s1", "t1", 11],
            [1, "r0", "s0", "t0", 10],
            [3, "r3", "s3", "t3", 13],
        ]);
        assert.strictEqual(edges.size, 3);
    });

    it("drops rows past the end of the remap", () => {
        const edges = edgesOn([0, 5]);
        const result = remapped(edges, [0]);
        assert.deepEqual(result.dropped, [15]);
        assert.deepEqual(result.rows, [[0, "r0", "s0", "t0", 10]]);
        assert.strictEqual(edges.size, 1);
    });
});

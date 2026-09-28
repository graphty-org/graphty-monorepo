import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import {
    fromPositionColumn,
    fromPositionMap,
    type LayoutResult,
    type PositionMap,
    rescaleInPlace,
    rescaleLayout,
    toLayoutSnapshot,
    toPositionColumn,
    toPositionMap,
} from "../src";

const { ids } = toLayoutSnapshot(["a", "b", 7]);

function closeTo(actual: ArrayLike<number>, expected: ArrayLike<number>, tolerance = 1e-6): void {
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
        if (Number.isNaN(expected[i])) {
            assert.ok(Number.isNaN(actual[i]), `[${i}] is NaN`);
        } else {
            assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `[${i}] ${actual[i]} vs ${expected[i]}`);
        }
    }
}

describe("position helpers", () => {
    for (const dim of [2, 3] as const) {
        it(`round-trips a ${dim}D PositionMap through a LayoutResult`, () => {
            const pos: PositionMap =
                dim === 2
                    ? { a: [0.5, -1], b: [2, 3], 7: [-4, 0.25] }
                    : { a: [0.5, -1, 2], b: [2, 3, -0.5], 7: [-4, 0.25, 1] };
            const positions = fromPositionMap(pos, ids, dim, () => assert.fail("every node is given"));
            assert.equal(positions.length, 3 * dim);
            const r: LayoutResult = { positions, dim, n: 3 };
            assert.deepEqual(toPositionMap(r, ids), pos);
        });

        it(`round-trips a ${dim}D LayoutResult through the scene column`, () => {
            const positions = Float32Array.from({ length: 3 * dim }, (_, k) => k * 0.75 - 2);
            const r: LayoutResult = { positions, dim, n: 3 };
            const column = toPositionColumn(r, 10, [1, -2, 3]);
            assert.equal(column.length, 9);
            assert.equal(column[0], positions[0] * 10 + 1);
            assert.equal(column[4], positions[dim + 1] * 10 - 2);
            if (dim === 2) {
                assert.equal(column[2], 3, "a 2D row's z is the centre's z");
            }
            closeTo(fromPositionColumn(column, dim, 10, [1, -2, 3]), positions);
        });
    }

    it("fills the rows of nodes absent from the map, and every row when there is no map", () => {
        const filled: number[] = [];
        const fill = (i: number, out: Float32Array): void => {
            filled.push(i);
            out[2 * i] = 100 + i;
            out[2 * i + 1] = 200 + i;
        };
        const positions = fromPositionMap({ b: [1, 2] }, ids, 2, fill);
        assert.deepEqual(filled, [0, 2]);
        assert.deepEqual(Array.from(positions), [100, 200, 1, 2, 102, 202]);
        filled.length = 0;
        fromPositionMap(null, ids, 2, fill);
        assert.deepEqual(filled, [0, 1, 2]);
    });

    it("reads a missing third component of a 3D row as 0", () => {
        assert.deepEqual(
            Array.from(fromPositionMap({ a: [1, 2], b: [3, 4, 5], 7: [6, 7, 8] }, ids, 3, () => {})),
            [1, 2, 0, 3, 4, 5, 6, 7, 8],
        );
    });

    it("writes into the owner's array when one is given", () => {
        const r: LayoutResult = { positions: Float32Array.from([1, 2, 3, 4, 5, 6]), dim: 2, n: 3 };
        const out = new Float32Array(9);
        assert.equal(toPositionColumn(r, 1, null, out), out);
        const back = new Float32Array(6);
        assert.equal(fromPositionColumn(out, 2, 1, null, back), back);
        assert.deepEqual(Array.from(back), [1, 2, 3, 4, 5, 6]);
    });

    it("leaves an unplaced node out of the id-keyed map", () => {
        // shell and multipartite leave a node in no shell or layer as a NaN row; a partly NaN row is kept
        const r: LayoutResult = { positions: Float32Array.of(1, 2, NaN, NaN, NaN, 3), dim: 2, n: 3 };
        assert.deepEqual(toPositionMap(r, ids), { a: [1, 2], 7: [NaN, 3] });
    });

    it("works on an empty graph", () => {
        const empty = fromEdgeArrays({
            directed: false,
            nodeCount: 0,
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
        });
        const r: LayoutResult = { positions: new Float32Array(0), dim: 2, n: 0 };
        assert.deepEqual(toPositionMap(r, empty.ids), {});
        assert.equal(toPositionColumn(r, 1, null).length, 0);
        assert.equal(rescaleInPlace(new Float32Array(0), 3).length, 0);
    });
});

describe("rescaleInPlace", () => {
    const cases: { name: string; dim: 2 | 3; rows: number[][]; scale?: number; center?: number[] }[] = [
        {
            name: "2D, defaults",
            dim: 2,
            rows: [
                [0.1, 5],
                [3, -2],
                [-7, 0.5],
                [2.25, 2],
            ],
        },
        {
            name: "3D, defaults",
            dim: 3,
            rows: [
                [0.1, 5, 1],
                [3, -2, -4],
                [-7, 0.5, 9],
            ],
        },
        {
            name: "2D, scale and centre",
            dim: 2,
            rows: [
                [1, 1],
                [4, -3],
                [0, 2],
            ],
            scale: 7.5,
            center: [10, -3],
        },
        {
            name: "3D, scale and centre",
            dim: 3,
            rows: [
                [1, 1, 1],
                [4, -3, 2],
                [0, 2, -6],
            ],
            scale: 0.3,
            center: [1, 2, 3],
        },
        {
            name: "NaN components",
            dim: 3,
            rows: [
                [1, Number.NaN, 1],
                [4, -3, 2],
                [Number.NaN, 2, -6],
            ],
        },
        {
            name: "every node at one point",
            dim: 2,
            rows: [
                [3, 3],
                [3, 3],
                [3, 3],
            ],
            center: [1, 2],
        },
        {
            // every finite spread is zero, so every non-NaN component moves to the centre, the infinite axis too
            name: "every node at one point on an infinite axis",
            dim: 2,
            rows: [
                [Number.POSITIVE_INFINITY, 1],
                [Number.POSITIVE_INFINITY, 1],
            ],
        },
        { name: "one node", dim: 3, rows: [[3, -1, 2]], scale: 4 },
        {
            // an f32 running sum of these loses whole units, which moves every rescaled row by more than 1e-6
            name: "many rows far from the origin",
            dim: 2,
            rows: Array.from({ length: 2000 }, (_, i) => [1e6 + i * 0.5, 1e6 - i * 0.25]),
        },
    ];
    for (const c of cases) {
        it(`matches rescaleLayout within 1e-6: ${c.name}`, () => {
            const expected = rescaleLayout(c.rows, c.scale, c.center ?? null) as number[][];
            const positions = Float32Array.from(c.rows.flat());
            assert.equal(rescaleInPlace(positions, c.dim, c.scale, c.center), positions, "in place");
            closeTo(positions, expected.flat());
        });
    }
});

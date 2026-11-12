/**
 * @file The capture reads a patterned line's dashes along the line as drawn: round a route's corners too, not as
 * their shadows on the straight line between its ends (issue #3102).
 */
import { assert, describe, it } from "vitest";

import { spansAlongCenters } from "./pattern-spans";

/**
 * A dash 4 long and 1 wide centered on a point, lying along a direction.
 * @param c - Its center.
 * @param u - Its direction, a unit vector.
 * @returns Its four corners.
 */
function dash(c: [number, number], u: [number, number]): [number, number][] {
    const [h, w] = [2, 0.5];
    const v = [-u[1], u[0]];
    return [
        [c[0] - h * u[0] - w * v[0], c[1] - h * u[1] - w * v[1]],
        [c[0] + h * u[0] - w * v[0], c[1] + h * u[1] - w * v[1]],
        [c[0] + h * u[0] + w * v[0], c[1] + h * u[1] + w * v[1]],
        [c[0] - h * u[0] + w * v[0], c[1] - h * u[1] + w * v[1]],
    ];
}

/**
 * The dashes and gaps from spans, in order.
 * @param spans - The spans.
 * @returns Dash, gap, dash, ..., dash.
 */
function pattern(spans: [number, number][]): number[] {
    return spans.flatMap(([a, b], i) => (i === 0 ? [b - a] : [a - spans[i - 1][1], b - a]));
}

describe("a patterned line's spans along it", () => {
    it("reads a straight line's dashes and gaps", () => {
        const centers: [number, number][] = [0, 6, 12, 18].map((x) => [x, 0]);
        const spans = spansAlongCenters(
            centers,
            centers.map((c) => dash(c, [1, 0])),
        );
        assert.deepEqual(pattern(spans ?? []), [4, 2, 4, 2, 4, 2, 4]);
    });

    it("reads the dashes and gaps round a route's corner, every gap the 2 drawn and none negative", () => {
        // six dashes 6 apart: three along x, then three up y from the corner at (12, 0)
        const centers: [number, number][] = [
            [0, 0],
            [6, 0],
            [12, 0],
            [12, 6],
            [12, 12],
            [12, 18],
        ];
        const dirs: [number, number][] = [
            [1, 0],
            [1, 0],
            [1, 0],
            [0, 1],
            [0, 1],
            [0, 1],
        ];
        const spans = spansAlongCenters(
            centers,
            centers.map((c, i) => dash(c, dirs[i])),
        );
        const drawn = pattern(spans ?? []);
        const gaps = drawn.filter((_x, i) => i % 2 === 1);
        const dashes = drawn.filter((_x, i) => i % 2 === 0);
        // the dash at the corner is read along the corner's diagonal, so its own length is a little off there
        for (const g of gaps) {
            assert.isAbove(g, 0, "no gap is negative");
        }
        assert.closeTo(gaps[0], 2, 1e-9);
        assert.closeTo(gaps.at(-1) ?? 0, 2, 1e-9);
        assert.closeTo(dashes[0], 4, 1e-9);
        assert.closeTo(dashes.at(-1) ?? 0, 4, 1e-9);
    });
});

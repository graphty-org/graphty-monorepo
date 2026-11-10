/**
 * The model canvas's geometry: a step's pill is set clear of every box, so it never hides a
 * column's name.
 */

import { assert, describe, it } from "vitest";

import { BOX_W, clearOfBoxes, fitScale, MIN_SCALE, PILL_HALF_W } from "../canvas/model";

/** Two boxes side by side, 100 pixels apart, each 200 high. */
const BOXES = [
    { x: 24, y: 24, height: 200 },
    { x: 24 + BOX_W + 100, y: 24, height: 200 },
] as const;

/**
 * Whether a pill centered on a point overlaps a box.
 * @param point - the pill's center.
 * @returns true when it covers part of a box.
 */
function covers(point: { x: number; y: number }): boolean {
    return BOXES.some(
        (box) =>
            point.x + PILL_HALF_W > box.x &&
            point.x - PILL_HALF_W < box.x + BOX_W &&
            point.y + 12 > box.y &&
            point.y - 12 < box.y + box.height,
    );
}

describe("a pill's place", () => {
    it("leaves a point clear of the boxes where it is", () => {
        const point = { x: 24 + BOX_W + 50, y: 400 };
        assert.deepEqual(clearOfBoxes(point, BOXES), point);
    });

    it("moves a point on a box out beside it, to the nearer side, never off the canvas's left", () => {
        const onSecond = clearOfBoxes({ x: 24 + 2 * BOX_W + 80, y: 100 }, BOXES);
        assert.isFalse(covers(onSecond));
        assert.isAbove(onSecond.x, 24 + 2 * BOX_W + 100, "out to its right");
        assert.strictEqual(onSecond.y, 100);
        const onFirst = clearOfBoxes({ x: 30, y: 100 }, BOXES);
        assert.isFalse(covers(onFirst));
        assert.isAtLeast(onFirst.x, PILL_HALF_W);
    });

    it("moves a point out of the gap between two boxes when the pill does not fit in it", () => {
        const between = clearOfBoxes({ x: 24 + BOX_W + 50, y: 100 }, BOXES);
        assert.isFalse(covers(between));
    });
});

describe("the canvas's fit", () => {
    it("draws a model that fits at full size, and shrinks one that does not, down to the smallest readable scale", () => {
        assert.strictEqual(fitScale({ x: 400, y: 300 }, { width: 800, height: 600 }), 1);
        const shrunk = fitScale({ x: 400, y: 584 }, { width: 800, height: 540 });
        assert.isBelow(shrunk, 1);
        assert.isAtMost((584 + 16) * shrunk, 540);
        assert.strictEqual(fitScale({ x: 400, y: 3000 }, { width: 800, height: 540 }), MIN_SCALE);
        assert.strictEqual(fitScale({ x: 400, y: 3000 }, { width: 0, height: 0 }), 1, "before it is measured");
    });
});

/**
 * A polygon that closes itself in its own points and is closed again by the reader holds its first vertex three times
 * (#706). Graphviz writes every polygon closed (`points="953.35,-639 820.58,-639 786.43,-603 919.2,-603 953.35,-639"`,
 * dot-synth-nodes s_parallelogram), and the SVG reader closes it once more, so a parallelogram whose first vertex sits
 * on its box's corner counted that corner twice, three corners on the box: a rectangle.
 */
import { assert, describe, it } from "vitest";

import { shapeOf } from "./associate";
import { boxOfPoints, type Prim, type Pt } from "./primitives";

const polygon = (points: Pt[]): Prim => ({
    index: 0,
    tag: "polygon",
    kind: "shape",
    box: boxOfPoints(points),
    points,
    closed: true,
    corners: 4,
    fill: null,
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
});

describe("the shape class of a polygon closed twice", () => {
    it("reads Graphviz's parallelogram as neither a rectangle nor a diamond", () => {
        // s_parallelogram as the reader gives it: the file's closing point, and the reader's
        const read: Pt[] = [
            [630.386, 476.598],
            [542.961, 476.598],
            [520.475, 500.303],
            [607.9, 500.303],
            [630.386, 476.598],
            [630.386, 476.598],
        ];
        assert.strictEqual(shapeOf(polygon(read)), "other");
    });

    it("still reads a box closed twice as a rectangle", () => {
        const box: Pt[] = [
            [10, 10],
            [50, 10],
            [50, 30],
            [10, 30],
            [10, 10],
            [10, 10],
        ];
        assert.strictEqual(shapeOf(polygon(box)), "rect");
    });
});

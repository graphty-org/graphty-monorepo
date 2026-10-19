/**
 * @file The geometry of what is drawn over a node's face: a pie's slices, a striped fill's bands, an
 * image's placement, and the cut of an outline to a box.
 */
import { assert, describe, test } from "vitest";

import { boxOf, clipToBox, imageBox, pieSlices, stripeBands } from "../../src/meshes/nodeDecoration";
import type { Point2 } from "../../src/meshes/shapeOutlines";

const area = (o: readonly Point2[]): number =>
    o.reduce((s, [x0, y0], i) => {
        const [x1, y1] = o[(i + 1) % o.length];
        return s + x0 * y1 - x1 * y0;
    }, 0) / 2;

describe("a pie", () => {
    test("is cut clockwise from 12 o'clock into its shares of a disc of half the shorter side", () => {
        const [a, b] = pieSlices({ colors: "#ff0000 #0000ff", sizes: "0.25 0.75" }, 40, 20);
        // the first quarter is the top right of a disc of radius 10
        const box = boxOf(a.outline);
        assert.approximately(box.x0, 0, 1e-9);
        assert.approximately(box.x1, 10, 1e-9);
        assert.approximately(box.y0, 0, 1e-9);
        assert.approximately(box.y1, 10, 1e-9);
        assert.deepEqual(a.rgb, [1, 0, 0]);
        assert.deepEqual(b.rgb, [0, 0, 1]);
        assert.approximately(area(a.outline), (Math.PI * 100) / 4, 1);
        assert.approximately(area(b.outline), (3 * Math.PI * 100) / 4, 2);
    });

    test("turns by its start angle, shares out what the sizes leave, and stops at a full turn", () => {
        const [a] = pieSlices({ colors: "red", sizes: "0.25", rotation: 90 }, 20, 20);
        // a quarter from 3 o'clock clockwise: the bottom right
        const box = boxOf(a.outline);
        assert.approximately(box.x1, 10, 1e-9);
        assert.approximately(box.y0, -10, 1e-9);
        assert.approximately(box.y1, 0, 1e-9);
        // the unsized slices split what is left; past the whole nothing is drawn
        const shares = pieSlices({ colors: "red green blue", sizes: "0.5" }, 20, 20).map((s) => area(s.outline));
        assert.lengthOf(shares, 3);
        assert.approximately(shares[1], shares[2], 1e-6);
        assert.lengthOf(pieSlices({ colors: "red green", sizes: "1 0.5" }, 20, 20), 1);
    });

    test("with a hole is a ring, and with fitBox fills the node's ellipse", () => {
        const [ring] = pieSlices({ colors: "red", hole: 0.5 }, 20, 20);
        assert.approximately(area(ring.outline), Math.PI * (100 - 25), 1.5);
        const [oval] = pieSlices({ colors: "red", fitBox: true }, 40, 20);
        assert.deepEqual(boxOf(oval.outline), { x0: -20, y0: -10, x1: 20, y1: 10 });
        assert.approximately(pieSlices({ colors: "red", opacities: "0.4" }, 20, 20)[0].opacity, 0.4, 1e-9);
    });
});

describe("stripes", () => {
    test("follow one another top to bottom, or left to right, each its share of the box", () => {
        const down = stripeBands({ colors: "red green blue", sizes: "0.3 0.5 0.2" }, 10, 20);
        assert.deepEqual(
            down.map((b) => [b.box.y0, b.box.y1].map((v) => Math.round(v * 1e6) / 1e6)),
            [
                [4, 10],
                [-6, 4],
                [-10, -6],
            ],
        );
        const right = stripeBands({ colors: "red green", direction: "right", size: 0.5 }, 10, 20);
        assert.deepEqual(right[0].box, { x0: -2.5, x1: 0, y0: -5, y1: 5 });
    });
});

describe("an image", () => {
    const natural = { width: 20, height: 10 };
    test("contains, covers, fills or keeps its own size against the node", () => {
        assert.deepEqual(imageBox({}, 40, 40, natural, 1), { x0: -20, y0: -10, x1: 20, y1: 10 });
        assert.deepEqual(imageBox({ fit: "cover" }, 40, 40, natural, 1), { x0: -40, y0: -20, x1: 40, y1: 20 });
        assert.deepEqual(imageBox({ fit: "fill" }, 40, 30, natural, 1), { x0: -20, y0: -15, x1: 20, y1: 15 });
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1 }, 40, 40, natural, 2), {
            x0: -20,
            y0: -10,
            x1: 20,
            y1: 10,
        });
        // one side given keeps the image's proportions
        assert.deepEqual(imageBox({ fit: "none", width: 10 }, 40, 40, natural, 1), {
            x0: -5,
            y0: -2.5,
            x1: 5,
            y1: 2.5,
        });
    });

    test("is placed across the room the node leaves and moved by its offset, y down", () => {
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1, positionX: 0, positionY: 0 }, 40, 40, natural, 1), {
            x0: -20,
            y0: 10,
            x1: 0,
            y1: 20,
        });
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1, offsetX: 3, offsetY: 4 }, 40, 40, natural, 1), {
            x0: -7,
            y0: -9,
            x1: 13,
            y1: 1,
        });
    });
});

describe("cutting an outline to a box", () => {
    test("keeps the part inside, and none of an outline outside it", () => {
        const square: Point2[] = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ];
        assert.approximately(area(clipToBox(square, { x0: 0, x1: 5, y0: -Infinity, y1: Infinity })), 2, 1e-12);
        assert.lengthOf(clipToBox(square, { x0: 2, x1: 3, y0: 0, y1: 1 }), 0);
    });
});

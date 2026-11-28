/**
 * @file A solid's outline is the convex hull of its projected vertices. Two vertices a rounding error apart used to
 * both stay in the hull; once the outline was scaled (a 3D overlay or outline follows the view by scaling it), the
 * pair could land on one point, the side between them had no direction, and offsetting the outline threw a spike
 * out of the plate (sweep case tw-037, issue #10497).
 */
import { assert, describe, test } from "vitest";

import { convexHull, offsetOutline, type Point2 } from "../../src/meshes/shapeOutlines";

describe("an outline with a corner repeated a rounding error away", () => {
    // the pair is taken from a sphere's projected outline in the sweep
    const corner: Point2 = [1.0118053822739528, 0.1323942018986613];
    const twin: Point2 = [1.0118053822739528, 0.13239420189866138];
    const clean: Point2[] = [[-1, 0], [0, -1], corner, [0, 1]];
    const hull = convexHull([[-1, 0], [0, -1], corner, twin, [0, 1]]);

    test("its hull keeps the corner once", () => {
        assert.lengthOf(hull, clean.length);
    });

    test("offsetting it, scaled any way, gives the outline the corner gives once", () => {
        const pad = 0.45;
        let stray = 0;

        for (let i = 0; i <= 2000; i++) {
            const scale = 0.9 + i / 10000;
            const scaled = (outline: Point2[]): Point2[] => outline.map(([x, y]): Point2 => [x * scale, y * scale]);
            const want = offsetOutline(scaled(clean), pad);
            const got = offsetOutline(scaled(hull), pad);
            stray += got.filter(([x, y]) => !want.some(([u, v]) => Math.hypot(x - u, y - v) < 1e-9)).length;
        }

        assert.equal(stray, 0);
    });
});

/**
 * @file The location map's globe math: a globe's radius is at least `size` and spans small data
 * `size` scene units across, as on the flat map, and the orbit camera fits a globe by its outline.
 */
import { assert, describe, it } from "vitest";

import { sphereFitDistance } from "../../src/cameras/OrbitCameraController";
import { globeRadius } from "../../src/layout/locationMap/place";

describe("globeRadius", () => {
    it("draws data spanning a small angle size units across: its chord, 2 r sin(angle / 2)", () => {
        for (const angle of [0.01, 0.2, 1]) {
            assert.closeTo(2 * globeRadius(100, angle) * Math.sin(angle / 2), 100, 1e-9);
        }
        assert.closeTo(globeRadius(100, 0.01), 100 / 0.01, 1, "small data: the arc and the chord agree");
    });

    it("is never less than size, so world data makes a globe 2 size wide and a node of size 1 small on it", () => {
        assert.strictEqual(globeRadius(100, Math.PI), 100);
        assert.strictEqual(globeRadius(100, 2 * Math.PI), 100, "past half a turn the globe's width is what is seen");
        assert.strictEqual(globeRadius(100, 2), 100, "a continent's span: at least size");
    });
});

describe("sphereFitDistance", () => {
    it("stands where the globe's outline touches the view's edge, nearer than a box around it would", () => {
        const tan = Math.tan(0.4);
        const d = sphereFitDistance(100, tan);
        // the line of sight at the view's edge is tangent to the sphere
        assert.closeTo(Math.asin(100 / d), 0.4, 1e-12);
        // fitting the box around it puts its near corner (100, 100, -100) at the edge
        const box = 100 / tan + 100;
        assert.isBelow(d, box * 0.8, "the globe is drawn over a quarter larger than a box fit draws it");
    });
});

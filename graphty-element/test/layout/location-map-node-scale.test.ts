/**
 * @file The scaling math of the location map: a globe's radius is at least `size` and spans small
 * data `size` scene units across, as on the flat map, and `nodeScale: "screen"` draws a node of size 1 at `1 / size` of the
 * view's height on either map, measured at the surface the node stands on.
 */
import { assert, describe, it } from "vitest";

import { sphereFitDistance } from "../../src/cameras/OrbitCameraController";
import { mapDepth, screenNodeScale } from "../../src/layout/locationMap/nodeScale";
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

describe("screenNodeScale", () => {
    it("draws size 1 at 1 / size of the view's height, in perspective and orthographic", () => {
        const fov = 0.8;
        for (const depth of [1, 10, 300]) {
            const scale = screenNodeScale({ fov, depth }, 100) ?? 0;
            const viewHeight = 2 * depth * Math.tan(fov / 2);
            assert.closeTo(scale / viewHeight, 1 / 100, 1e-12, "the same share of the view at every zoom");
        }
        assert.strictEqual(screenNodeScale({ orthoHeight: 50 }, 100), 0.5);
        assert.isNull(screenNodeScale({ orthoHeight: 0 }, 100));
    });

    it("measures a globe at its surface under the camera, so nodes shrink as the camera comes down to it", () => {
        const radius = 100;
        // the camera 1 unit above the surface: nodes are drawn at that depth, not the center's
        assert.strictEqual(mapDepth(radius + 1, radius), 1);
        assert.strictEqual(mapDepth(80, 0), 80, "a flat map at the point the camera turns about");
        assert.isAbove(mapDepth(radius, radius), 0, "never zero");
        const near = screenNodeScale({ fov: 0.8, depth: mapDepth(radius + 1, radius) }, 100) ?? 0;
        const far = screenNodeScale({ fov: 0.8, depth: mapDepth(radius + 100, radius) }, 100) ?? 0;
        assert.closeTo(far / near, 100, 1e-9);
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

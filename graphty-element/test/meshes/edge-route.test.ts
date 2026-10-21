/**
 * @file The geometry of an edge drawn through bends: reading `line.bends`, placing the bends
 * between the node centers (so they scale and turn with the nodes), rounding corners, and where a
 * segment leaves a node.
 */
import { assert, describe, it } from "vitest";

import {
    bendPoints,
    interiorOutside,
    liftRoute,
    parseBends,
    roundCorners,
    surfaceReach,
} from "../../src/meshes/edgeRoute";

const at = (x: number, y: number, z = 0): { x: number; y: number; z: number } => ({ x, y, z });

describe("edge route geometry", () => {
    it("reads along,across pairs, and nothing from a value that is not one", () => {
        assert.deepEqual(parseBends("0,-0.5  1,-0.5"), [0, -0.5, 1, -0.5]);
        assert.deepEqual(parseBends(" 0.25,1e-3 "), [0.25, 0.001]);
        assert.isNull(parseBends(undefined));
        assert.isNull(parseBends(""));
        assert.isNull(parseBends("0.5"));
        assert.isNull(parseBends("0.5,x"));
        assert.isNull(parseBends("0.5,1,2"));
        assert.isNull(parseBends("0.5,"));
    });

    it("places bends along and left of the line between the centers, scaling and turning with it", () => {
        const route = [0, -0.5, 1, -0.5];
        assert.deepEqual(bendPoints(at(0, 0), at(8, 0), route), [0, -4, 0, 8, -4, 0]);
        // twice as far apart: twice as far below
        assert.deepEqual(bendPoints(at(0, 0), at(16, 0), route), [0, -8, 0, 16, -8, 0]);
        // the line turned to point up: "right of it" is now +x, and the corners stay right angles
        const turned = bendPoints(at(0, 0), at(0, 8), route);
        assert.deepEqual(
            turned.map((v) => Math.round(v * 1e9) / 1e9),
            [4, 0, 0, 4, 8, 0],
        );
    });

    it("rounds each interior corner and keeps the ends", () => {
        const flat = [0, 0, 0, 0, -4, 0, 8, -4, 0, 8, 0, 0];
        const out = roundCorners(flat);
        // two corners of six points each, plus the two ends
        assert.lengthOf(out, (2 + 2 * 6) * 3);
        assert.deepEqual(out.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(out.slice(-3), [8, 0, 0]);
        // no point is the sharp corner itself
        for (let i = 0; i < out.length; i += 3) {
            assert.isAbove(Math.hypot(out[i], out[i + 1] + 4), 1e-9);
        }
        // a polyline with no interior point is unchanged
        assert.deepEqual(roundCorners([0, 0, 0, 1, 1, 1]), [0, 0, 0, 1, 1, 1]);
    });

    it("lifts a route into an arc over its middle, keeping its ends", () => {
        const out = liftRoute([0, 0, 0, 10, 0, 0], 2);
        assert.isAtLeast(out.length / 3 - 1, 16, "a straight route is drawn as at least sixteen pieces");
        assert.deepEqual(out.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(out.slice(-3), [10, 0, 0]);
        // the middle point is the highest, at the lift, and the route never leaves the x-z plane
        const middle = out.length / 3 / 2;
        assert.closeTo(out[Math.floor(middle) * 3 + 2], 2, 1e-9);
        for (let i = 0; i < out.length; i += 3) {
            assert.strictEqual(out[i + 1], 0);
            assert.isAtLeast(out[i + 2], 0);
            assert.isAtMost(out[i + 2], 2 + 1e-9);
        }

        // a bent route keeps its corners and is raised by how far along it each point is
        const bent = liftRoute([0, 0, 0, 0, 4, 0, 4, 4, 0], 1);
        assert.include(bent.join(","), "0,4,1", "the corner, halfway along by length, is raised by the whole lift");
        assert.deepEqual(liftRoute([0, 0, 0, 1, 0, 0], 0), [0, 0, 0, 1, 0, 0], "no lift is the route itself");
    });

    it("keeps only the interior points outside both end nodes", () => {
        const route = [0, 0, 0, 0.5, 0, 0, 2, 0, 0, 3.5, 0, 0, 4, 0, 0];
        assert.deepEqual(interiorOutside(route, 1, 1), [2, 0, 0]);
        assert.deepEqual(interiorOutside(route, 0.1, 0.1), [0.5, 0, 0, 2, 0, 0, 3.5, 0, 0]);
    });

    it("leaves a round node at its radius and a box where the ray crosses its side", () => {
        assert.strictEqual(surfaceReach(at(1, 0), at(9, 9, 9), 2), 2);
        assert.strictEqual(surfaceReach(at(0, -1), at(3, 1, 1), null), 1);
        assert.closeTo(surfaceReach(at(Math.SQRT1_2, Math.SQRT1_2), at(1, 2, 1), null), Math.SQRT2, 1e-12);
    });
});

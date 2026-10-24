/**
 * @file The geometry of a raised edge route (`line.route`): a raised arc over a flat map and a
 * great-circle arc over a globe -- both ends kept, the peak where and as high as asked, and pieces
 * enough to look round.
 */
import { assert, describe, it } from "vitest";

import { greatCircleArc, raisedArc } from "../../src/meshes/edgeRoute";

const at = (x: number, y: number, z = 0): { x: number; y: number; z: number } => ({ x, y, z });

describe("raisedArc", () => {
    it("keeps both ends and peaks at the middle, toward the viewer, by height times the map distance", () => {
        const arc = raisedArc(at(0, 0), at(30, 40), 0.25);
        assert.deepEqual(arc.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(arc.slice(-3), [30, 40, 0]);
        const lowest = Math.min(...arc.filter((_, i) => i % 3 === 2));
        assert.closeTo(lowest, -0.25 * 50, 0.3);
        assert.isAtLeast(arc.length / 3, 3);
    });

    it("is the straight line at height 0", () => {
        assert.deepEqual(raisedArc(at(0, 0), at(1, 0), 0), [0, 0, 0, 1, 0, 0]);
    });
});

describe("greatCircleArc", () => {
    it("keeps both ends and lifts the middle off the sphere", () => {
        const r = 100;
        const arc = greatCircleArc(at(r, 0, 0), at(0, r, 0), 0.25);
        assert.deepEqual(arc.slice(0, 3), [r, 0, 0]);
        assert.deepEqual(arc.slice(-3), [0, r, 0]);
        const n = arc.length / 3;
        const radii = Array.from({ length: n }, (_, i) => Math.hypot(arc[3 * i], arc[3 * i + 1], arc[3 * i + 2]));
        const peak = Math.max(...radii);
        assert.closeTo(peak, r + 0.25 * (Math.PI / 2) * r, 1);
        // every point lies in the plane of the two ends and the center (z = 0)
        assert.isTrue(arc.every((v, i) => i % 3 !== 2 || Math.abs(v) < 1e-9));
        // about one piece per 7.5 degrees of turn, and never more than 48
        assert.isAtLeast(n - 1, 12);
        assert.isAtMost(n - 1, 48);
    });

    it("is the straight line between ends in one direction, or opposite ones", () => {
        assert.lengthOf(greatCircleArc(at(1, 0, 0), at(2, 0, 0), 0.25), 6);
        assert.lengthOf(greatCircleArc(at(1, 0, 0), at(-1, 0, 0), 0.25), 6);
    });
});

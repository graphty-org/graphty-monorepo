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
        // the lift is a share of the straight-line distance between the ends
        assert.closeTo(peak, r + 0.25 * Math.SQRT2 * r, 1);
        // every point lies in the plane of the two ends and the center (z = 0)
        assert.isTrue(arc.every((v, i) => i % 3 !== 2 || Math.abs(v) < 1e-9));
        // about one piece per 7.5 degrees of turn, and never more than 48
        assert.isAtLeast(n - 1, 12);
        assert.isAtMost(n - 1, 48);
    });

    it("rises with the distance between its ends and stays modest across the whole globe", () => {
        const r = 100;
        const peak = (lon: number): number => {
            const a = (lon * Math.PI) / 180;
            const arc = greatCircleArc(at(0, 0, -r), at(r * Math.sin(a), 0, -r * Math.cos(a)), 0.1);
            const n = arc.length / 3;
            return Math.max(
                ...Array.from({ length: n }, (_, i) => Math.hypot(arc[3 * i], arc[3 * i + 1], arc[3 * i + 2])),
            );
        };
        const lifts = [5, 30, 90, 179].map((lon) => peak(lon) - r);
        for (let i = 1; i < lifts.length; i++) {
            assert.isAbove(lifts[i], lifts[i - 1], "a longer route rises higher");
        }
        // 0.1 of the chord: a short hop barely lifts, the far side of the world at most 0.2 radii
        assert.closeTo(lifts[0], 0.1 * 2 * r * Math.sin((5 * Math.PI) / 360), 0.05);
        assert.isAtMost(lifts[3], 0.2 * r + 1e-6);
    });

    it("is the straight line between ends in one direction, or opposite ones", () => {
        assert.lengthOf(greatCircleArc(at(1, 0, 0), at(2, 0, 0), 0.25), 6);
        assert.lengthOf(greatCircleArc(at(1, 0, 0), at(-1, 0, 0), 0.25), 6);
    });
});

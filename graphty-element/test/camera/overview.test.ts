/**
 * @file The overview arithmetic (issue #293): nodes laid flat along the view in a unit frame,
 * a density grid above the point limit, and a frame point mapping back to the view axes.
 */

import { assert, describe, it } from "vitest";

import { fromFrame, projectOverview, toFrame } from "../../src/camera/overview";

/** The identity view: x right, y up, looking along z. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

describe("projectOverview", () => {
    it("lays nodes in a unit frame, y down, the shorter side centred", () => {
        // A 100 wide, 50 tall box; one unplaced node skipped.
        const positions = [0, 0, 0, 100, 50, 7, Number.NaN, 0, 0, 50, 25, -3];
        const { kind, points, frame } = projectOverview(positions, 4, IDENTITY);
        assert.strictEqual(kind, "points");
        assert.strictEqual(frame.placed, 3);
        assert.deepEqual([...points], [0, 0.75, 1, 0.25, 0.5, 0.5]);
    });

    it("follows the view direction: a view turned to look along x lays out y and z", () => {
        // Rows of the rotation: view x = world z, view y = world y.
        const turned = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
        const { points } = projectOverview([5, 0, 0, 9, 10, 10], 2, turned);
        assert.deepEqual([...points], [0, 1, 1, 0]);
    });

    it("returns a density grid above the point limit, counting every placed node", () => {
        const positions: number[] = [];
        for (let i = 0; i < 10; i++) {
            positions.push(i, i, 0);
        }

        const { kind, points, density } = projectOverview(positions, 10, IDENTITY, { maxPoints: 5, gridSize: 2 });
        assert.strictEqual(kind, "density");
        assert.strictEqual(points.length, 0);
        assert.strictEqual(density?.size, 2);
        // The diagonal runs bottom-left to top-right: y down puts it in cells (1,0) and (0,1).
        assert.deepEqual([...(density?.counts ?? [])], [0, 5, 5, 0]);
    });

    it("measures nothing when no node is placed", () => {
        const { frame, points } = projectOverview([Number.NaN, 0, 0], 1, IDENTITY);
        assert.strictEqual(frame.placed, 0);
        assert.strictEqual(points.length, 0);
    });

    it("maps a frame point back to where it came from", () => {
        const { frame } = projectOverview([0, 0, 0, 40, 10, 0], 2, IDENTITY);
        const back = fromFrame(frame, toFrame(frame, 30, 4).x, toFrame(frame, 30, 4).y);
        assert.closeTo(back.x, 30, 1e-9);
        assert.closeTo(back.y, 4, 1e-9);
    });
});

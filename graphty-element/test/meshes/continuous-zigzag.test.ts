import { assert, describe, it } from "vitest";

import { PatternedLineRenderer } from "../../src/meshes/PatternedLineRenderer";

// One diagonal of the zigzag: a period of 1.275 split into four 45-degree segments.
const D = 1.275 / 4;
const THICKNESS = 0.15;

/**
 * The quad-strip positions for a list of zigzag points: a bottom and a top vertex each.
 * @param points - The (x, z) points along the line.
 * @returns The flat positions.
 */
function strip(points: [number, number][]): number[] {
    return points.flatMap(([x, z]) => [x, 0, z - THICKNESS, x, 0, z + THICKNESS]);
}

/**
 * Assert two position lists agree to float precision.
 * @param actual - The positions made.
 * @param expected - The positions wanted.
 */
function assertPositions(actual: ArrayLike<number> | null | undefined, expected: number[]): void {
    assert.isOk(actual);
    const got = Array.from(actual ?? []);
    assert.lengthOf(got, expected.length);
    got.forEach((value, at) => {
        assert.closeTo(value, expected[at], 1e-9, `position ${String(at)}`);
    });
}

describe("PatternedLineRenderer.createContinuousZigzag", () => {
    it("walks baseline, peak, baseline, valley and ends on the line's length between phases", () => {
        // Interpolated end between a valley and the baseline.
        assertPositions(
            PatternedLineRenderer.createContinuousZigzag(1).positions,
            strip([
                [0, 0],
                [D, D],
                [2 * D, 0],
                [3 * D, -D],
                [1, -D * (1 - (1 - 3 * D) / D)],
            ]),
        );
    });

    it("interpolates the last point from each phase to the next", () => {
        // Baseline to peak.
        assertPositions(
            PatternedLineRenderer.createContinuousZigzag(0.2).positions,
            strip([
                [0, 0],
                [0.2, 0.2],
            ]),
        );
        // Peak to baseline.
        assertPositions(
            PatternedLineRenderer.createContinuousZigzag(0.5).positions,
            strip([
                [0, 0],
                [D, D],
                [0.5, D - (0.5 - D)],
            ]),
        );
        // Baseline to valley.
        assertPositions(
            PatternedLineRenderer.createContinuousZigzag(0.8).positions,
            strip([
                [0, 0],
                [D, D],
                [2 * D, 0],
                [0.8, -(0.8 - 2 * D)],
            ]),
        );
    });

    it("ends exactly on a corner when the length is a whole number of diagonals", () => {
        const data = PatternedLineRenderer.createContinuousZigzag(4 * D);
        assertPositions(
            data.positions,
            strip([
                [0, 0],
                [D, D],
                [2 * D, 0],
                [3 * D, -D],
                [4 * D, 0],
            ]),
        );
        assert.deepEqual(
            Array.from(data.indices ?? []),
            [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6, 5, 7, 6, 6, 7, 8, 7, 9, 8],
        );
    });
});

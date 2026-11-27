import { assert, describe, it } from "vitest";

import { centeredOffset } from "../../src/camera/builtins";

/** A seeded generator, so the cloud is the same on every run. */
function seeded(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

/** The halving search as it was before it dropped points: 48 passes over every point. */
function reference(points: readonly { along: number; x: number }[], distance: number): number {
    let low = Math.min(...points.map((p) => p.x));
    let high = Math.max(...points.map((p) => p.x));
    for (let step = 0; step < 48 && high > low; step++) {
        const middle = (low + high) / 2;
        let above = -Infinity;
        let below = -Infinity;
        for (const point of points) {
            const depth = Math.max(distance - point.along, Number.EPSILON);
            above = Math.max(above, (point.x - middle) / depth);
            below = Math.max(below, (middle - point.x) / depth);
        }

        if (above > below) {
            low = middle;
        } else {
            high = middle;
        }
    }

    return (low + high) / 2;
}

describe("keep-angle Fit centering search", () => {
    it("visits each point a few times, not once per halving step, and finds the same offset", () => {
        // The corners of 10,000 node cubes, as a keep-angle Fit at 10k nodes measures them.
        const random = seeded(10321);
        let visits = 0;
        const points = Array.from({ length: 80_000 }, () => {
            const x = (random() - 0.5) * 200;
            return {
                along: (random() - 0.5) * 200,
                y: (random() - 0.5) * 120,
                get x(): number {
                    visits++;
                    return x;
                },
            };
        });
        const plain = points.map((p) => ({ along: p.along, x: p.x, y: p.y }));
        visits = 0;

        const offset = centeredOffset(points, "x", 250);

        assert.strictEqual(offset, reference(plain, 250));
        // Before the fix every point was visited twice in each of 48 passes: 98 visits per point.
        // Dropping the points that can no longer set an edge leaves about 8.
        assert.isBelow(visits, 12 * points.length, `visits: ${visits}`);
    });
});

/**
 * A step's histogram bar heights (selection spec 4.3, ws-polish 2): a long tail of small bins under
 * a few giant ones is drawn at log heights, and a bin that holds anything is never drawn flat.
 */

import { assert, describe, it } from "vitest";

import { barHeights } from "../barHeights";

describe("barHeights", () => {
    it("draws a skewed spread at log heights, so a 160-node bin under a 20,000-node one shows", () => {
        // Degree on 50,000 nodes: two giant bins, then a tail of 160 to 441 nodes each.
        const counts = [20_000, 15_000, 441, 400, 300, 250, 200, 160, 0];
        const heights = barHeights(counts, false);
        const tallest = Math.max(...heights);
        assert.isAbove(heights[7] ?? 0, tallest * 0.4, "the tail is drawn at log height");
        assert.strictEqual(heights[8], 0, "an empty bin stays flat");
    });

    it("keeps linear heights for an even spread, with a floor for a bin that holds one", () => {
        const counts = [10, 8, 6, 9, 1];
        const heights = barHeights(counts, false);
        assert.deepEqual(heights.slice(0, 4), [10, 8, 6, 9]);
        assert.isAtLeast(heights[4] ?? 0, 10 * 0.05);
    });

    it("draws log heights whenever graphty-element suggests a log scale", () => {
        assert.closeTo(barHeights([3, 3], true)[0] ?? 0, Math.log1p(3), 1e-9);
    });
});

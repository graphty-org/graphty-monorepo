/**
 * A line's width as a reader sees it (#4451): under a pixel wide, a line shows its width only as how dark the pixels it
 * crosses are, so a difference no pixel shows passes however far apart the ratio; a difference a reader sees fails.
 */
import { assert, describe, it } from "vitest";

import { lineWidthMiss } from "./compare-oracle";

describe("edge width", () => {
    it("passes a 0.22 px line drawn a tenth wider, which darkens its pixels by under the color tolerance", () => {
        // dot-real-siblings: 284 lines 0.222 px wide flipped to failing at a ratio of 1.101
        assert.strictEqual(lineWidthMiss(0.222, 0.222 * 1.101, "#000000", 1, "#ffffff"), 0);
        assert.strictEqual(lineWidthMiss(0.22, 0.222, "#000000", 1, "#ffffff"), 0);
    });

    it("fails a 0.22 px line drawn twice as wide", () => {
        assert.isAbove(lineWidthMiss(0.22, 0.44, "#000000", 1, "#ffffff"), 0);
    });

    it("judges a line a pixel wide or more by its ratio", () => {
        assert.strictEqual(lineWidthMiss(2, 2.1, "#000000", 1, "#ffffff"), 0);
        assert.isAbove(lineWidthMiss(2, 2.4, "#000000", 1, "#ffffff"), 0);
        assert.isAbove(lineWidthMiss(0.9, 1.2, "#000000", 1, "#ffffff"), 0);
    });
});

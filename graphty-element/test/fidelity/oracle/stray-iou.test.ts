/**
 * Strays overlapped as drawn lines: an annotation's straight line has a box with no height, so the same line in both
 * drawings (Cytoscape's arrow annotations on cx2-specimen-images-charts-p6) shared no area and was a stray on both sides.
 */
import { assert, describe, it } from "vitest";

import { strayIou } from "./compare-oracle";

describe("strays overlapped as lines", () => {
    it("matches the same straight line in both drawings", () => {
        const o = { x0: 84.6, y0: 435.9, x1: 154.2, y1: 435.9 };
        const g = { x0: 84.6, y0: 435.8, x1: 154.2, y1: 435.8 };
        assert.isAbove(strayIou(o, g), 0.9);
    });

    it("keeps two lines a row apart, and boxes with area, as they were", () => {
        const a = { x0: 84.6, y0: 435.9, x1: 154.2, y1: 435.9 };
        const b = { x0: 84.6, y0: 554, x1: 154.2, y1: 554 };
        assert.strictEqual(strayIou(a, b), 0);
        const box = { x0: 0, y0: 0, x1: 10, y1: 10 };
        assert.closeTo(strayIou(box, { x0: 5, y0: 0, x1: 15, y1: 10 }), 1 / 3, 1e-9);
    });
});

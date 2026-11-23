/**
 * yEd paints a hollow head (white_delta) as a fill in the canvas's color and then its outline over it: two arrows read
 * at one spot, the first with no color of its own. The head's color is its outline's, so arrowColor is judged
 * (graphml-libcitygml-mapping n27 -> n25: it was never judged, the first arrow read having no color).
 */
import { assert, describe, it } from "vitest";

import { withTwinColor } from "./compare-oracle";
import { type PArrow } from "./primitives";

const head = (over: Partial<PArrow>): PArrow => ({
    end: "target",
    length: 11,
    width: 8,
    filled: false,
    shape: "triangle",
    color: null,
    at: [656.52, 588.95],
    ...over,
});

describe("a yEd hollow head painted as a fill then its outline", () => {
    it("takes its outline's color", () => {
        const fill = head({});
        const outline = head({ color: "#000000" });
        assert.strictEqual(withTwinColor(fill, [fill, outline])?.color, "#000000");
    });

    it("takes the color painted last, over a white stroke under it", () => {
        // Cytoscape.js's hollow head (json-cyjs-synth-edges arrow-hollow): no fill, a white stroke, then its own color
        const fill = head({});
        const white = head({ color: "#ffffff" });
        const own = head({ color: "#999999" });
        assert.strictEqual(withTwinColor(fill, [fill, white, own])?.color, "#999999");
    });

    it("takes no color from a head elsewhere, at the other end, or filled where it is hollow", () => {
        const fill = head({});
        const away = head({ color: "#000000", at: [700, 588.95] });
        const source = head({ color: "#000000", end: "source" });
        const solid = head({ color: "#000000", filled: true });
        assert.isNull(withTwinColor(fill, [fill, away, source, solid])?.color);
    });

    it("leaves a head with a color, or no head, as it is", () => {
        const red = head({ color: "#ff0000" });
        assert.strictEqual(withTwinColor(red, [red, head({ color: "#000000" })]), red);
        assert.isUndefined(withTwinColor(undefined, [head({ color: "#000000" })]));
    });
});

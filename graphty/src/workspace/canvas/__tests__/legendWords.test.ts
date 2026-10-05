import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { overflowLine, paintWords, sectionTitle, swatchName } from "../legendWords";

/**
 * A legend block with only what these tests read.
 * @param over - the fields to set.
 * @returns the block.
 */
function block(over: Partial<LegendBlock>): LegendBlock {
    return {
        channel: "node.color",
        layerId: "layer-1",
        kind: "sequential",
        swatches: [],
        departures: [],
        ...over,
    } as LegendBlock;
}

const swatch = (over: Partial<LegendSwatch>): LegendSwatch => ({ label: "x", value: 0, ...over });

describe("the legend card's words", () => {
    it("titles a section with the property and the row", () => {
        assert.equal(sectionTitle(block({}), "PageRank"), "Color: PageRank");
        assert.equal(sectionTitle(block({ channel: "node.size" }), "Degree"), "Size: Degree");
        assert.equal(sectionTitle(block({ channel: "edge.width" }), "Weight"), "Edge width: Weight");
    });

    it("titles a channel the app has no word for by the row alone, never by the channel id", () => {
        assert.equal(sectionTitle(block({ channel: "edge.arrowHead" }), "Flow"), "Flow");
    });

    it("names the Other row Other, without counting what it holds", () => {
        assert.equal(swatchName(swatch({ label: "3" })), "3");
        assert.equal(swatchName(swatch({ role: "other", value: [7, 8, 9] })), "Other");
    });

    it("words a shape or line pattern, gives a size as its number, and leaves a color row alone", () => {
        assert.equal(paintWords(swatch({ paints: "triangular_prism" })), "Triangular prism");
        assert.equal(paintWords(swatch({ paints: "torus-knot" })), "Torus knot");
        assert.equal(paintWords(swatch({ size: 2.5 })), "2.5");
        assert.isNull(paintWords(swatch({ color: "#ff0000" })));
    });

    it("says how many rows did not fit", () => {
        assert.equal(overflowLine(28), "28 more");
    });
});

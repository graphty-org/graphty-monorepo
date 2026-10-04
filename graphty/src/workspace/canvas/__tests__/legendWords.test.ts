import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { luminance, readingSentence, sectionTitle, sizeRange, swatchName } from "../legendWords";

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
        field: { plainName: "PageRank", technicalName: "pagerank", path: "pagerank" },
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

    it("says darker or lighter from the block's own two ends, so a reversed palette reads right", () => {
        const light = swatch({ color: "#f0f0f0" });
        const dark = swatch({ color: "#202020" });
        assert.equal(readingSentence(block({ swatches: [light, dark] })), "Darker means higher PageRank.");
        assert.equal(readingSentence(block({ swatches: [dark, light] })), "Lighter means higher PageRank.");
    });

    it("says larger for a size ramp, and gives the drawn range in the element's units", () => {
        const sized = block({
            channel: "node.size",
            swatches: [swatch({ size: 1 }), swatch({ size: 2 }), swatch({ size: 3 })],
        });
        assert.equal(readingSentence(sized), "Larger means higher PageRank.");
        assert.equal(sizeRange(sized), "1 to 3");
        assert.isNull(sizeRange(block({ swatches: [swatch({ color: "#000000" })] })));
    });

    it("says nothing for a list, a field-less block, or two equal ends", () => {
        const ends = [swatch({ color: "#000000" }), swatch({ color: "#ffffff" })];
        assert.isNull(readingSentence(block({ kind: "categorical", swatches: ends })));
        assert.isNull(readingSentence(block({ field: undefined, swatches: ends })));
        assert.isNull(readingSentence(block({ swatches: [swatch({ color: "#777" }), swatch({ color: "#777777" })] })));
    });

    it("names the Other row by the groups it holds", () => {
        assert.equal(swatchName(swatch({ label: "3" })), "3");
        assert.equal(swatchName(swatch({ role: "other", value: [7, 8, 9] })), "Other (3 groups)");
        assert.equal(swatchName(swatch({ role: "other", value: [7] })), "Other (1 group)");
    });

    it("reads luminance from three, six and eight digit hex", () => {
        assert.equal(luminance("#fff"), 1);
        assert.equal(luminance("#000000ff"), 0);
        assert.isNull(luminance("red"));
    });
});

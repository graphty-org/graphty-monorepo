import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { factSentence, overflowLine, paintWords, sectionTitle, swatchName, swatchText } from "../legendWords";

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
        facts: [],
        departures: [],
        ...over,
    };
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
        const categories = block({ kind: "categorical" });
        assert.equal(swatchName(categories, swatch({ value: 3 })), "3");
        assert.equal(swatchName(categories, swatch({ role: "other", value: [7, 8, 9] })), "Other");
    });

    it("words each kind of row from its facts, as the element's English label did", () => {
        const categories = block({ kind: "categorical" });
        assert.equal(swatchText(categories, swatch({ value: 0, rank: 2 })), "Group 2");
        assert.equal(swatchText(categories, swatch({ value: ["a", "b"], role: "other" })), "other: 2 groups");
        assert.equal(swatchText(categories, swatch({ value: ["a"], role: "other" })), "other: 1 group");
        assert.equal(swatchText(categories, swatch({ value: "engineering" })), "engineering");
        assert.equal(swatchText(block({}), swatch({ value: 0.30000000000000004 })), "0.3");
        assert.equal(swatchText(block({}), swatch({ value: 12345678 })), "1.23e+7");
        assert.equal(swatchText(block({}), swatch({ value: 0, extent: { min: 0, max: 25.5 } })), "0 - 25.5");
        assert.equal(swatchText(block({}), swatch({ value: 4, extent: { min: 4, max: 4 } })), "4");
        assert.equal(swatchText(block({ kind: "literal" }), swatch({ value: "#ff9900" }), "Selected"), "Selected");
    });

    it("words each legend fact, and leaves out a code it does not know", () => {
        assert.equal(factSentence({ code: "legend.not-measured", params: { count: 12 } }), "not measured (12)");
        assert.equal(factSentence({ code: "legend.clamped", params: { from: 2, to: 98 } }), "clamped at p2/p98");
        assert.equal(
            factSentence({ code: "legend.painted-over", params: { layerId: "l1", name: "Washout" } }),
            'painted over by "Washout"',
        );
        assert.isNull(factSentence({ code: "legend.something-new" as "legend.lumped", params: {} }));
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

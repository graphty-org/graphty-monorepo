import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    factSentence,
    imageLegend,
    keyBlocks,
    overflowLine,
    paintWords,
    sectionTitle,
    swatchName,
    swatchText,
} from "../legendWords";

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

    it("gives the exported image the card's sections, top first, in the card's words", () => {
        const blocks = [
            block({
                layerId: "below",
                swatches: [swatch({ value: 0.01, color: "#ffffff" }), swatch({ value: 0.09, color: "#000080" })],
            }),
            block({
                layerId: "size",
                channel: "node.size",
                swatches: [swatch({ value: 1 }), swatch({ value: 36 })],
            }),
            block({
                layerId: "above",
                kind: "categorical",
                swatches: [
                    swatch({ value: 1, color: "#4e79a7", count: 1200 }),
                    swatch({ label: "x", role: "other", color: "#cccccc", count: 4 }),
                ],
                overflow: { hidden: 28 },
            }),
        ];
        const names: Record<string, string> = { below: "PageRank", size: "Degree", above: "Louvain" };
        assert.deepEqual(
            imageLegend(blocks, (b) => names[b.layerId]),
            [
                {
                    title: "Color: Louvain",
                    rows: [
                        { label: "1", color: "#4e79a7", value: (1200).toLocaleString() },
                        { label: "Other", color: "#cccccc", value: "4" },
                    ],
                    note: "28 more",
                },
                { title: "Size: Degree", ramp: { min: "1", max: "36" } },
                { title: "Color: PageRank", ramp: { min: "0.01", max: "0.09", colors: ["#ffffff", "#000080"] } },
            ],
        );
    });

    it("keys neither a label nor a size that does not vary", () => {
        const color = block({ layerId: "color" });
        const bound = block({ layerId: "sized", channel: "node.size" });
        const blocks = [
            color,
            block({ layerId: "names", channel: "node.label", kind: "categorical" }),
            block({ layerId: "one-size", channel: "node.size", kind: "literal", swatches: [swatch({ size: 1 })] }),
            bound,
        ];
        assert.deepEqual(keyBlocks(blocks), [color, bound]);
        assert.deepEqual(
            imageLegend(blocks, (b) => b.layerId).map((section) => section.title),
            ["Size: sized", "Color: color"],
        );
    });

    it("keys no block a layer above paints over on every element", () => {
        const covered = block({
            layerId: "degree",
            facts: [{ code: "legend.painted-over", params: { layerId: "louvain", name: "Communities" } }],
        });
        const top = block({ layerId: "louvain", kind: "categorical" });
        assert.deepEqual(keyBlocks([covered, top]), [top]);
        assert.deepEqual(
            imageLegend([covered, top], (b) => b.layerId).map((section) => section.title),
            ["Color: louvain"],
        );
    });
});

import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { imageLegend, keyBlocks, overflowLine, paintWords, sectionTitle, swatchName } from "../legendWords";

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

    it("gives the exported image the card's sections, top first, in the card's words", () => {
        const blocks = [
            block({
                layerId: "below",
                swatches: [swatch({ label: "0.01", color: "#ffffff" }), swatch({ label: "0.09", color: "#000080" })],
            }),
            block({
                layerId: "size",
                channel: "node.size",
                swatches: [swatch({ label: "1" }), swatch({ label: "36" })],
            }),
            block({
                layerId: "above",
                kind: "categorical",
                swatches: [
                    swatch({ label: "1", color: "#4e79a7", count: 1200 }),
                    swatch({ label: "x", role: "other", color: "#cccccc", count: 4 }),
                ],
                overflow: { hidden: 28 },
            } as Partial<LegendBlock>),
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
});

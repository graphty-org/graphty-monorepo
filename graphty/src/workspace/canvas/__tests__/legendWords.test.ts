import type { GraphSession, LegendBlock, LegendSwatch, Run } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    factSentence,
    imageLegend,
    keyBlocks,
    keyNames,
    keySections,
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

const byLayer = { row: (b: LegendBlock) => b.layerId, entry: (b: LegendBlock) => b.layerId };

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
        assert.deepEqual(imageLegend(blocks, { row: (b) => names[b.layerId], entry: (b) => names[b.layerId] }), [
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
        ]);
    });

    it("keys neither a label, its look, nor a size that does not vary, a highlight's included", () => {
        const color = block({ layerId: "color" });
        const bound = block({ layerId: "sized", channel: "node.size" });
        const blocks = [
            color,
            block({ layerId: "names", channel: "node.label", kind: "categorical" }),
            // A label's look (the app's font on every label line) is not a key either.
            block({ layerId: "names", channel: "node.labelStyle", kind: "literal" }),
            block({ layerId: "one-size", channel: "node.size", kind: "literal", swatches: [swatch({ size: 1 })] }),
            // A path's highlight draws its edges 24 wide: a number a reader takes for the path's.
            block({ layerId: "on-path", channel: "edge.width", kind: "highlight", swatches: [swatch({ size: 24 })] }),
            bound,
        ];
        assert.deepEqual(keyBlocks(blocks), [color, bound]);
        assert.deepEqual(
            imageLegend(blocks, byLayer).map((section) => section.title),
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
            imageLegend([covered, top], byLayer).map((section) => section.title),
            ["Color: louvain"],
        );
    });

    it("keys a run's node and edge highlight in one color as one section, in the app's words", () => {
        const black = [swatch({ value: "#000000", color: "#000000" })];
        const ranked = block({ layerId: "pagerank" });
        const edges = block({
            layerId: "route-e",
            runId: "r2",
            channel: "edge.color",
            kind: "highlight",
            swatches: black,
        });
        const nodes = block({
            layerId: "route-n",
            runId: "r2",
            channel: "node.color",
            kind: "highlight",
            swatches: black,
        });
        const names = {
            row: (b: LegendBlock) => (b.runId === "r2" ? "Shortest path" : "PageRank"),
            entry: (b: LegendBlock) => (b.kind === "highlight" ? "On the path" : b.layerId),
        };
        const sections = keySections([ranked, edges, nodes], names);
        assert.deepEqual(
            sections.map(({ title, entry, merged }) => [title, entry, merged]),
            [
                ["Shortest path", "On the path", true],
                ["Color: PageRank", "pagerank", false],
            ],
        );
        assert.deepEqual(imageLegend([ranked, edges, nodes], names)[0], {
            title: "Shortest path",
            rows: [{ label: "On the path", color: "#000000" }],
        });
        // Two colors, or two runs, stay two sections, each with its property.
        const red = block({ ...edges, swatches: [swatch({ value: "#ff0000", color: "#ff0000" })] });
        assert.deepEqual(
            keySections([red, nodes], names).map((section) => section.title),
            ["Color: Shortest path", "Edge color: Shortest path"],
        );
        assert.lengthOf(keySections([{ ...edges, runId: "r3" }, nodes], names), 2);
    });

    it("marks a section whose run is out of date as the run list does, and only then", () => {
        const run = {
            id: "r1",
            algorithm: "pagerank",
            params: {},
            distinguishedBy: null,
            siblingsDifferBy: null,
            scope: { spec: "graph" },
            status: "succeeded",
            stale: null as Run["stale"],
        };
        const summary = { visibleNodes: 15, totalNodes: 20 };
        const session = {
            runs: { get: () => run },
            visibility: { summary },
            styles: { get: () => undefined },
            sets: { get: () => undefined },
            catalog: { algorithms: () => [{ key: "pagerank", plainName: "PageRank" }] },
        } as unknown as GraphSession;
        const size = block({ channel: "node.size", runId: "r1" });
        const title = (): string => keySections([size], keyNames(session))[0].title;
        assert.equal(title(), "Size: PageRank");
        run.stale = { reason: "data-changed" } as unknown as Run["stale"];
        assert.equal(title(), "Size: PageRank, out of date");
        // A filter step since a run on every node: the values still hold, and the key says so only
        // while the drawing shows fewer.
        run.stale = { reason: "scope-changed", ranOn: 20, nowVisible: 15 } as unknown as Run["stale"];
        assert.equal(title(), "Size: PageRank, full graph");
        // As many drawn as it ran on: nothing to tell apart, so no scope words.
        summary.visibleNodes = 20;
        assert.equal(title(), "Size: PageRank");
        // A narrower run than the whole graph, with another count drawn: its own count.
        run.stale = { reason: "scope-changed", ranOn: 12, nowVisible: 15 } as unknown as Run["stale"];
        assert.equal(title(), "Size: PageRank on 12 nodes");
    });
});

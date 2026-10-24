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
    scopeLine,
    sectionTitle,
    swatchName,
    swatchText,
    swatchValue,
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

    it("titles a channel with no key word by the Style tab's word, never by the row alone or the channel id", () => {
        assert.equal(sectionTitle(block({ channel: "edge.arrowHead" }), "Flow"), "Edge target end: Flow");
        assert.equal(sectionTitle(block({ channel: "node.wireframe" }), "Bob"), "Wireframe: Bob");
    });

    it("names a fixed pattern's row by what it paints, not by the layer the title already names", () => {
        const line = block({ channel: "edge.style", kind: "literal" });
        const solid = swatch({ value: "solid", paints: "solid", count: 254 });
        assert.equal(sectionTitle(line, "Bob"), "Edge line: Bob");
        assert.equal(swatchName(line, solid, "Bob"), "Solid");
        assert.equal(swatchValue(line, solid, "Bob"), 254, "the count, not 'Solid' twice");
        // A fixed color keeps its chit and the layer's name.
        assert.equal(swatchName(block({ kind: "literal" }), swatch({ color: "#ff0000" }), "Bob"), "Bob");
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
        assert.equal(swatchText(block({}), swatch({ value: 12345678 })), "12,345,678");
        // The same spelling as the inspector and the table: four significant digits, never exponents.
        assert.equal(swatchText(block({}), swatch({ value: 0.000123456 })), "0.0001235");
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

    it("keys no value the binding hides, and no block whose every value is hidden", () => {
        const shown = swatch({ label: "Group 1", value: 1, color: "#0072b2" });
        const groups = block({
            kind: "categorical",
            swatches: [shown, swatch({ label: "Group 2", value: 2, color: "#e69f00", hidden: true })],
        });
        const gone = block({ layerId: "gone", kind: "categorical", swatches: [swatch({ value: 3, hidden: true })] });
        assert.deepEqual(keyBlocks([groups, gone]), [{ ...groups, swatches: [shown] }]);
    });

    it("keys no row that paints nothing now, and no ring, band, text size or motion speed as a bare number", () => {
        const halo = block({ layerId: "halo", channel: "node.haloColor", kind: "literal" });
        const blocks = [
            block({ layerId: "selected", kind: "literal", painted: 0 }),
            block({ layerId: "label", channel: "node.labelSize", kind: "literal", swatches: [swatch({ value: 72 })] }),
            block({ layerId: "halo", channel: "node.haloScale", kind: "literal" }),
            block({ layerId: "halo", channel: "node.haloOpacity", kind: "literal" }),
            block({ layerId: "band", channel: "edge.bandWidth", kind: "literal" }),
            block({ layerId: "band", channel: "edge.bandOpacity", kind: "literal" }),
            // A motion's speed would print "On the path 2".
            block({ layerId: "band", channel: "edge.animationSpeed", kind: "literal" }),
            // A pattern count would print "Bob 2".
            block({ layerId: "line", channel: "edge.patternCount", kind: "literal", swatches: [swatch({ value: 2 })] }),
            halo,
        ];
        assert.deepEqual(keyBlocks(blocks), [halo]);
        assert.equal(sectionTitle(halo, "Key people"), "Halo: Key people");
    });

    it("keys no layer whose every element a filter step hides, and keeps one that still reaches some", () => {
        const hidden = block({ layerId: "hidden", kind: "literal", scope: { count: 0, of: 24 } });
        const some = block({ layerId: "some", kind: "literal", scope: { count: 4, of: 24 } });
        assert.deepEqual(keyBlocks([hidden, some]), [some]);
    });

    it("heads a channel only one of a run's group layers writes by that layer, not by the run", () => {
        const group = (layerId: string, color: string): LegendBlock =>
            block({ layerId, runId: "run-1", kind: "literal", swatches: [swatch({ color })] });
        const shape = block({
            layerId: "group-1",
            runId: "run-1",
            channel: "node.shape",
            kind: "literal",
            swatches: [swatch({ value: "box", paints: "box" })],
        });
        const names = {
            row: (b: LegendBlock) => (b.runId === undefined ? b.layerId : "Louvain"),
            entry: (b: LegendBlock) => b.layerId,
        };
        const titles = keySections([group("group-1", "#ff0000"), group("group-2", "#00ff00"), shape], names).map(
            (section) => section.title,
        );
        assert.deepEqual(titles, ["Shape: group-1", "Color: Louvain"]);
    });

    it("lists a run's groups in rank order, a group with its own color included, Other last", () => {
        const groups = block({
            kind: "categorical",
            swatches: [
                swatch({ value: 5, rank: 3 }),
                swatch({ value: 0, rank: 1 }),
                swatch({ value: [7, 8], role: "other", count: 4 }),
                swatch({ value: 2, rank: 2 }),
            ],
        });
        const [ordered] = keyBlocks([groups]);
        assert.deepEqual(
            ordered.swatches.map((each) => swatchName(ordered, each)),
            ["Group 1", "Group 2", "Group 3", "Other"],
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
            caveats: {},
        };
        const summary = { visibleNodes: 15, totalNodes: 20 };
        const session = {
            runs: { get: () => run },
            visibility: { summary },
            styles: { get: () => undefined, counts: () => ({ covers: {} }) },
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

    it("names a run by its algorithm as the Analyze list names it, not the catalog's plain name", () => {
        const run = {
            id: "r1",
            algorithm: "shortest-path",
            params: {},
            distinguishedBy: null,
            siblingsDifferBy: null,
            scope: { spec: "graph" },
            status: "succeeded",
            stale: null,
            caveats: {},
        };
        const session = {
            runs: { get: () => run },
            styles: { get: () => undefined, counts: () => ({ covers: {} }) },
            catalog: {
                algorithms: () => [
                    { key: "shortest-path", plainName: "Shortest route", technicalName: "Shortest path" },
                ],
            },
        } as unknown as GraphSession;
        const color = block({ channel: "node.color", runId: "r1" });
        assert.equal(keySections([color], keyNames(session))[0].title, "Color: Shortest path");
    });

    it("titles a bound value by the column it reads, not by the layer it sits in", () => {
        const session = {
            data: {
                attributes: () => [{ path: "data.donations", name: "donations" }],
                readableValues: () => [],
            },
            runs: { get: () => undefined },
            styles: { get: () => ({ name: "Everything" }), counts: () => ({ covers: {} }) },
        } as unknown as GraphSession;
        const field = { path: "data.donations", plainName: "Donations", technicalName: "donations" };
        const size = block({ channel: "node.size", field });
        assert.equal(keySections([size], keyNames(session))[0].title, "Size: donations");
        // A fixed value reads no column: its layer names it.
        const fixed = block({ kind: "literal", swatches: [swatch({ color: "#ff0000" })] });
        assert.equal(keySections([fixed], keyNames(session))[0].title, "Color: Everything");
    });

    it("prints a number grouped, as the binding popover writes it", () => {
        assert.equal(swatchText(block({}), swatch({ value: 250000 })), "250,000");
        assert.equal(swatchText(block({}), swatch({ value: 0, extent: { min: 0, max: 250000 } })), "0 - 250,000");
        assert.equal(swatchText(block({}), swatch({ value: 1234.5678 })), "1,235");
    });

    it("draws a fixed value named as its title as one line, not the name twice", () => {
        const fixed = block({ kind: "literal", layerId: "Agencies", swatches: [swatch({ color: "#ff0000" })] });
        const [section] = keySections([fixed], byLayer);
        assert.deepEqual([section.title, section.merged], ["Color: Agencies", true]);
        // Rows named otherwise keep their title.
        const shape = block({ channel: "node.shape", kind: "literal", swatches: [swatch({ paints: "box" })] });
        assert.isFalse(keySections([shape], byLayer)[0].merged);
    });
});

describe("the words for a block of some elements", () => {
    const of = (over: Partial<LegendBlock>): LegendBlock => ({
        channel: "node.size",
        layerId: "picked",
        kind: "sequential",
        swatches: [],
        facts: [],
        departures: [],
        scope: { count: 3, of: 24 },
        ...over,
    });

    it("names the layer and the count, once", () => {
        assert.equal(scopeLine(of({}), "Size: donations", "Picked"), "Picked: 3 of 24 nodes");
        assert.equal(scopeLine(of({}), "Color: Picked", "Picked"), "3 of 24 nodes", "the title names the layer");
        assert.equal(scopeLine(of({ runId: "r1" }), "Color: PageRank", "Layer 9"), "3 of 24 nodes");
        assert.equal(
            scopeLine(of({ channel: "edge.color", scope: { count: 1, of: 1000 } }), "T", "E"),
            "E: 1 of 1,000 edges",
        );
        assert.isNull(scopeLine(of({ scope: undefined }), "Size: donations", "Picked"));
    });
});

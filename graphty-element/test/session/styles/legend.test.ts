import { assert, describe, it } from "vitest";

import type { Channel, LayerId, LayerSpec, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { prepareBinding, type PreparedBinding } from "../../../src/session/styles/encoding";
import {
    type ChannelExplanation,
    type ExplainSources,
    explainStyle,
    type ExplainTarget,
    resolveToStatic,
    type StaticResolution,
    type StyleContribution,
    type StyleExplanation,
    type UnboundLayer,
    unboundLayers,
} from "../../../src/session/styles/explain";
import { checkLayerSpec, type CompiledLayer, type Layer, type PathDirectory } from "../../../src/session/styles/Layer";
import {
    buildLegend,
    type FieldWords,
    type LegendBlock,
    type LegendSources,
    type LegendSwatch,
} from "../../../src/session/styles/legend";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createScaleRegistry, type ScaleRegistry } from "../../../src/session/styles/scales";

/** One element's columns, keyed by the path a layer names. */
type Row = Readonly<Record<Path, unknown>>;

/**
 * Five nodes: four a run measured and one it did not.
 *
 * The zero matters -- it is what a logarithmic scale has no place for, and betweenness has zeros
 * on every real graph -- and so does the missing row, which is what "not measured" counts.
 */
const NODES: readonly Row[] = [
    { "results.betweenness.value": 0, "results.louvain.group": "a" },
    { "results.betweenness.value": 4, "results.louvain.group": "a" },
    { "results.betweenness.value": 16, "results.louvain.group": "b" },
    { "results.betweenness.value": 100, "results.louvain.group": "c" },
    {},
];

/** Everything one harness holds: the stack in both forms, and the prepared encodings. */
interface Fixture {
    /** The layers, bottom first. */
    readonly layers: readonly Layer[];
    /** The same layers with their selectors compiled, bottom first. */
    readonly compiled: readonly CompiledLayer[];
    /** What a legend reads. */
    readonly legend: LegendSources;
    /** What an explanation reads. */
    readonly explain: ExplainSources;
}

/**
 * Everything one column carries, and how many elements carry nothing.
 *
 * The same reading the repaint takes for a run-bound layer: the column holds what the run
 * MEASURED, and the elements it never measured are counted rather than included, so a domain is a
 * property of the measurement and not of the graph.
 * @param rows - The elements.
 * @param path - The column path.
 * @returns The values and the count of elements carrying none.
 */
function columnOf(rows: readonly Row[], path: Path): { column: unknown[]; unmeasured: number } {
    const column: unknown[] = [];
    let unmeasured = 0;

    for (const row of rows) {
        const value = row[path];

        if (value === undefined || value === null) {
            unmeasured++;
            continue;
        }

        column.push(value);
    }

    return { column, unmeasured };
}

/**
 * Prepare every binding one layer writes, in the order a repaint applies them.
 * @param layer - The layer.
 * @param rows - The elements its columns are read from.
 * @param scales - The session's scales.
 * @returns The prepared bindings, fixed values first and rules second.
 */
function prepareLayer(layer: Layer, rows: readonly Row[], scales: ScaleRegistry): readonly PreparedBinding[] {
    const prepared: PreparedBinding[] = [];

    for (const [name, value] of Object.entries(layer.set ?? {})) {
        prepared.push(prepareBinding({ channel: name as Channel, binding: { value }, scales }));
    }

    for (const [name, binding] of Object.entries(layer.encode ?? {})) {
        if (binding === undefined) {
            continue;
        }

        const column = "by" in binding ? columnOf(rows, binding.by) : undefined;
        prepared.push(prepareBinding({ channel: name as Channel, binding, scales, ...column }));
    }

    return prepared;
}

/**
 * Build a stack out of specifications, refusing to run on one the element would not accept.
 * @param specs - The layers, bottom first.
 * @param rows - The elements.
 * @param paths - Which paths the session answers, when the test supplies a directory.
 * @returns The fixture.
 */
function harness(specs: readonly LayerSpec[], rows: readonly Row[] = NODES, paths?: PathDirectory): Fixture {
    const scales = createScaleRegistry();
    const elements: SelectorSource = {
        nodeValue: (index, path) => rows[index]?.[path],
        edgeValue: () => undefined,
        nodeIdOf: (index) => `n${String(index)}`,
        edgeIdOf: (index) => `e${String(index)}`,
    };

    const compiled = specs.map((spec, at): CompiledLayer => {
        const checked = checkLayerSpec(spec, { id: `l${String(at)}`, elements, scales });

        if (checked.layer === null) {
            throw new Error(`the fixture layer "${spec.name}" was refused: ${JSON.stringify(checked.result.errors)}`);
        }

        return checked.layer;
    });

    const layers = compiled.map((entry) => entry.layer);
    const prepared = new Map<LayerId, readonly PreparedBinding[]>(
        layers.map((layer) => [layer.id, prepareLayer(layer, rows, scales)]),
    );
    const encoding = (layerId: LayerId): readonly PreparedBinding[] => prepared.get(layerId) ?? [];

    return {
        layers,
        compiled,
        legend: { layers: () => layers, encoding, scales },
        explain: {
            stack: () => compiled,
            encoding,
            elements,
            nodeIndex: (id) => {
                const at = Number(String(id).slice(1));

                return Number.isInteger(at) && at >= 0 && at < rows.length ? at : undefined;
            },
            edgeIndex: () => undefined,
            ...(paths === undefined ? {} : { paths }),
        },
    };
}

/** A layer that colours by betweenness, scoped the way `encode()` scopes one. */
function betweennessColor(extra: Partial<LayerSpec> = {}): LayerSpec {
    return {
        name: "Betweenness - Node Colour",
        kind: "encoding",
        selector: { match: "has", path: "results.betweenness.value" },
        encode: { "node.color": { by: "results.betweenness.value", palette: "viridis" } },
        source: { by: "run", runId: "betweenness", algorithm: "betweenness", params: {} },
        ...extra,
    };
}

/** The one block a single-layer stack produces. */
function onlyBlock(specs: readonly LayerSpec[], rows: readonly Row[] = NODES): LegendBlock {
    const blocks = buildLegend(harness(specs, rows).legend);

    assert.strictEqual(blocks.length, 1, "expected exactly one block");

    return blocks[0];
}

/** One swatch of a block, by position, so a missing one fails where it is asked for. */
function swatchAt(block: LegendBlock, at: number): LegendSwatch {
    const swatch = block.swatches[at];

    assert.isDefined(swatch, `expected a swatch at ${String(at)}`);

    return swatch;
}

/** One layer's share of an explanation, by the name the layer goes by. */
function contributionOf(why: StyleExplanation, name: string): StyleContribution {
    const found = why.contributions.find((entry) => entry.name === name);

    assert.isDefined(found, `expected a contribution from ${name}`);

    return found;
}

/** The error code a call threw, so a test names the contract rather than the message. */
function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `threw something else: ${String(error)}`;
    }

    return "did not throw";
}

describe("a legend block names everything the picture does not say for itself", () => {
    it("names the channel, the layer, the run, the field, the scale, the domain and the palette", () => {
        const block = onlyBlock([betweennessColor()]);

        assert.strictEqual(block.channel, "node.color");
        assert.strictEqual(block.layerId, "l0");
        assert.strictEqual(block.runId, "betweenness");
        assert.strictEqual(block.kind, "sequential");
        assert.deepEqual(block.field, {
            plainName: "Value",
            technicalName: "results.betweenness.value",
            path: "results.betweenness.value",
        });
        assert.deepEqual(block.scale, { kind: "linear", label: "Even Steps" });
        assert.deepEqual(block.domain, { min: 0, max: 100 });
        assert.deepEqual(block.palette, { name: "viridis", reversed: false });
    });

    it("says the scale in the words the scale catalogue uses, never the name a binding spells", () => {
        const block = onlyBlock([
            betweennessColor({
                encode: { "node.color": { by: "results.betweenness.value", scale: "sqrt", palette: "viridis" } },
            }),
        ]);

        assert.deepEqual(block.scale, { kind: "sqrt", label: "By Area" });
    });

    it("takes the field's words from the session when the session has them", () => {
        const fixture = harness([betweennessColor()]);
        const blocks = buildLegend({
            ...fixture.legend,
            field: (): FieldWords => ({ plainName: "Betweenness", technicalName: "betweenness_centrality" }),
        });

        assert.deepEqual(blocks[0].field, {
            plainName: "Betweenness",
            technicalName: "betweenness_centrality",
            path: "results.betweenness.value",
        });
    });

    it("reads the blocks bottom first, the same order the layer list is in", () => {
        const blocks = buildLegend(
            harness([
                betweennessColor(),
                {
                    name: "Highlight",
                    kind: "highlight",
                    selector: { match: "everything" },
                    set: { "node.outline": "#ff9900" },
                },
            ]).legend,
        );

        assert.deepEqual(
            blocks.map((block) => block.layerId),
            ["l0", "l1"],
        );
    });
});

describe("the departures are what stop a legend implying something the picture does not say", () => {
    it("prints the percentiles a clamp cut the extent at, in the domain and in the departures", () => {
        const block = onlyBlock([
            betweennessColor({
                encode: { "node.color": { by: "results.betweenness.value", clamp: [2, 98], palette: "viridis" } },
            }),
        ]);

        assert.deepEqual(block.domain?.clamped, { from: "p2", to: "p98" });
        assert.include(block.departures, "clamped at p2/p98");
    });

    it("counts the elements the run never measured", () => {
        const block = onlyBlock([betweennessColor()]);

        assert.include(block.departures, "not measured (1)");
    });

    it("says how many values a logarithmic scale has no place for", () => {
        const block = onlyBlock([
            betweennessColor({
                encode: { "node.color": { by: "results.betweenness.value", scale: "log", palette: "viridis" } },
            }),
        ]);

        assert.include(block.departures, "1 not plottable on a log scale");
    });

    it("says when a layer above paints the same channel over everything", () => {
        const blocks = buildLegend(
            harness([
                betweennessColor(),
                {
                    name: "Washout",
                    kind: "custom",
                    selector: { match: "everything" },
                    set: { "node.color": "#cccccc" },
                },
            ]).legend,
        );

        assert.include(blocks[0].departures, 'painted over by "Washout"');
        assert.deepEqual(blocks[1].departures, []);
    });

    it("says nothing about a layer above that paints the same channel over only some elements", () => {
        const blocks = buildLegend(
            harness([
                betweennessColor(),
                {
                    name: "Chosen",
                    kind: "highlight",
                    selector: { match: "ids", nodes: ["n0"] },
                    set: { "node.color": "#cccccc" },
                },
            ]).legend,
        );

        assert.deepEqual(blocks[0].departures, ["not measured (1)"]);
    });
});

describe("the swatches are read out of the encoding, whatever shape it has", () => {
    it("samples a continuous ramp across its domain", () => {
        const block = onlyBlock([betweennessColor()]);

        assert.strictEqual(block.swatches.length, 7);
        assert.strictEqual(swatchAt(block, 0).label, "0");
        assert.strictEqual(swatchAt(block, 6).label, "100");
        assert.notStrictEqual(swatchAt(block, 0).color, swatchAt(block, 6).color);

        for (const swatch of block.swatches) {
            assert.match(String(swatch.color), /^#[\da-f]{6}$/u);
        }
    });

    it("gives a grouping by equal counts one swatch per group, labelled with the values in it", () => {
        const block = onlyBlock([
            betweennessColor({
                encode: { "node.color": { by: "results.betweenness.value", scale: "quantile", palette: "viridis" } },
            }),
        ]);

        assert.strictEqual(block.swatches.length, 4);
        assert.strictEqual(block.swatches[0].label.startsWith("0 - "), true);
        assert.strictEqual(new Set(block.swatches.map((swatch) => swatch.color)).size, 4);
    });

    it("gives a categorical encoding one swatch per category, largest group first", () => {
        const block = onlyBlock([
            {
                name: "Communities",
                kind: "encoding",
                selector: { match: "has", path: "results.louvain.group" },
                encode: { "node.color": { by: "results.louvain.group", scale: "ordinal", palette: "okabe-ito" } },
            },
        ]);

        assert.strictEqual(block.kind, "categorical");
        assert.deepEqual(
            block.swatches.map((swatch) => swatch.value),
            ["a", "b", "c"],
        );
        assert.isUndefined(block.overflow);
    });

    it("caps the swatches at twelve and counts the rest", () => {
        const rows: readonly Row[] = Array.from({ length: 14 }, (_unused, at) => ({
            "results.louvain.group": `g${String(at)}`,
        }));
        const block = onlyBlock(
            [
                {
                    name: "Communities",
                    kind: "encoding",
                    selector: { match: "has", path: "results.louvain.group" },
                    encode: { "node.color": { by: "results.louvain.group", scale: "ordinal", palette: "viridis" } },
                },
            ],
            rows,
        );

        assert.strictEqual(block.swatches.length, 12);
        assert.deepEqual(block.overflow, { hidden: 2 });
    });

    it("carries a size encoding's numbers rather than pretending they are colours", () => {
        const block = onlyBlock([
            betweennessColor({
                encode: { "node.size": { by: "results.betweenness.value", range: [1, 5] } },
            }),
        ]);

        assert.isUndefined(block.palette);
        assert.strictEqual(block.swatches[0].size, 1);
        assert.strictEqual(block.swatches[block.swatches.length - 1].size, 5);
        assert.isUndefined(block.swatches[0].color);
    });

    it("carries the shape a shape encoding paints, which is neither a colour nor a size", () => {
        const block = onlyBlock([
            {
                name: "Shapes",
                kind: "encoding",
                selector: { match: "has", path: "results.louvain.group" },
                encode: { "node.shape": { by: "results.louvain.group", scale: "ordinal" } },
            },
        ]);

        assert.strictEqual(block.swatches.length, 3);

        for (const swatch of block.swatches) {
            assert.strictEqual(typeof swatch.paints, "string");
        }

        assert.strictEqual(new Set(block.swatches.map((swatch) => swatch.paints)).size, 3);
    });
});

describe("what a legend leaves out, and why", () => {
    it("leaves out the base layers, which are what the picture looks like before anything is said", () => {
        const blocks = buildLegend(
            harness([
                {
                    name: "Default",
                    kind: "base",
                    source: { by: "element", reason: "default" },
                    selector: { match: "everything" },
                    set: { "node.color": "#333333" },
                },
                betweennessColor(),
            ]).legend,
        );

        assert.deepEqual(
            blocks.map((block) => block.layerId),
            ["l1"],
        );
        assert.strictEqual(blocks[0].channel, "node.color");
    });

    it("leaves out a disabled layer, which paints nothing", () => {
        const blocks = buildLegend(harness([betweennessColor({ enabled: false })]).legend);

        assert.deepEqual(blocks, []);
    });

    it("describes a fixed value with no field, no scale and no domain, because it has none", () => {
        const block = onlyBlock([
            {
                name: "Selected",
                kind: "highlight",
                selector: { match: "ids", nodes: ["n0"] },
                set: { "node.color": "#ff9900" },
            },
        ]);

        assert.strictEqual(block.kind, "highlight");
        assert.isUndefined(block.field);
        assert.isUndefined(block.scale);
        assert.isUndefined(block.domain);
        assert.deepEqual(block.swatches, [{ label: "Selected", value: "#ff9900", color: "#ff9900" }]);
    });

    it("gives one block per channel a layer paints, fixed values first and rules second", () => {
        const blocks = buildLegend(
            harness([
                betweennessColor({
                    set: { "node.outline": "#ffffff" },
                    encode: { "node.color": { by: "results.betweenness.value", palette: "viridis" } },
                }),
            ]).legend,
        );

        assert.deepEqual(
            blocks.map((block) => [block.channel, block.kind]),
            [
                ["node.outline", "literal"],
                ["node.color", "sequential"],
            ],
        );
    });
});

describe("explain answers why one element looks the way it does", () => {
    const stack: readonly LayerSpec[] = [
        {
            name: "Default",
            kind: "base",
            source: { by: "element", reason: "default" },
            selector: { match: "everything" },
            set: { "node.color": "#333333", "node.size": 1 },
        },
        betweennessColor(),
        {
            name: "My outline",
            kind: "custom",
            selector: { match: "everything" },
            set: { "node.outline": "#ff9900" },
        },
    ];

    it("merges the stack for one element, topmost writer of each channel standing", () => {
        const { explain } = harness(stack);
        const why = explainStyle({ node: "n3" }, explain);

        assert.strictEqual(why.merged["node.size"], 1);
        assert.strictEqual(why.merged["node.outline"]?.hex, "#ff9900");
        assert.notStrictEqual(why.merged["node.color"]?.hex, "#333333");
    });

    it("says which layer contributed which properties, bottom first", () => {
        const { explain } = harness(stack);
        const why = explainStyle({ node: "n3" }, explain);

        assert.deepEqual(
            why.contributions.map((entry) => entry.name),
            ["Default", "Betweenness - Node Colour", "My outline"],
        );
        assert.deepEqual(contributionOf(why, "Default").properties, ["node.color", "node.size"]);
        assert.deepEqual(contributionOf(why, "Betweenness - Node Colour").properties, ["node.color"]);
        assert.deepEqual(contributionOf(why, "My outline").properties, ["node.outline"]);
    });

    it("leaves out a layer whose selector does not match the element", () => {
        const { explain } = harness(stack);
        const why = explainStyle({ node: "n4" }, explain);

        assert.deepEqual(
            why.contributions.map((entry) => entry.name),
            ["Default", "My outline"],
        );
        assert.strictEqual(why.merged["node.color"]?.hex, "#333333");
    });

    it("refuses an element this session does not hold", () => {
        const { explain } = harness(stack);

        assert.strictEqual(
            codeOf(() => explainStyle({ node: "n99" }, explain)),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => explainStyle({ edge: "e0" }, explain)),
            "E_BAD_COMMAND",
        );
    });

    it("answers nothing at all for an element no layer paints", () => {
        const { explain } = harness([betweennessColor()]);
        const why = explainStyle({ node: "n4" }, explain);

        assert.deepEqual(why.merged, {});
        assert.deepEqual(why.contributions, []);
        assert.deepEqual(why.channels, []);
    });
});

describe("explain says whether a channel can be edited where it is, and why not", () => {
    /** The entry for one channel of an explanation. */
    function channelOf(why: StyleExplanation, channel: Channel): ChannelExplanation {
        const found = why.channels.find((entry) => entry.channel === channel);

        assert.isDefined(found, `expected an entry for ${channel}`);

        return found;
    }

    const stack: readonly LayerSpec[] = [
        {
            name: "Default",
            kind: "base",
            source: { by: "element", reason: "default" },
            selector: { match: "everything" },
            set: { "node.size": 1 },
        },
        betweennessColor(),
        {
            name: "My outline",
            kind: "custom",
            selector: { match: "everything" },
            set: { "node.outline": "#ff9900" },
        },
    ];

    it("offers a control for a fixed value on a layer the consumer owns", () => {
        const why = explainStyle({ node: "n3" }, harness(stack).explain);
        const outline = channelOf(why, "node.outline");

        assert.strictEqual(outline.mode, "static");
        assert.strictEqual(outline.editable, true);
        assert.isUndefined(outline.reason);
    });

    it("refuses a control for a channel the layer works out from the data, and names the path", () => {
        const why = explainStyle({ node: "n3" }, harness(stack).explain);
        const color = channelOf(why, "node.color");

        assert.strictEqual(color.mode, "encoded");
        assert.strictEqual(color.editable, false);
        assert.include(color.reason, "results.betweenness.value");
        assert.include(color.reason, "would be replaced");
    });

    it("refuses a control on an element-owned layer, whatever the channel is", () => {
        const why = explainStyle({ node: "n3" }, harness(stack).explain);
        const size = channelOf(why, "node.size");

        assert.strictEqual(size.mode, "static");
        assert.strictEqual(size.editable, false);
        assert.include(size.reason, "belongs to the element");
    });

    it("lists the channels in the channel table's order, not in paint order", () => {
        const why = explainStyle({ node: "n3" }, harness(stack).explain);

        assert.deepEqual(
            why.channels.map((entry) => entry.channel),
            ["node.color", "node.size", "node.outline"],
        );
    });
});

describe("resolveToStatic turns a rule into a fixed value a person can then edit", () => {
    const rule: LayerSpec = betweennessColor({
        encode: {
            "node.color": { by: "results.betweenness.value", palette: "viridis" },
            "node.size": { by: "results.betweenness.value", range: [1, 5] },
        },
    });

    it("answers the value the rule paints for the element it is asked about", () => {
        const { explain } = harness([rule]);
        const at: ExplainTarget = { node: "n3" };
        const resolved: StaticResolution = resolveToStatic("l0", "node.color", explain, at);
        const why = explainStyle(at, explain);

        assert.strictEqual(resolved.value, why.merged["node.color"]?.hex);
        assert.strictEqual(resolved.channel, "node.color");
        assert.strictEqual(resolved.layerId, "l0");
    });

    it("answers a value the rule really measured when no element is named", () => {
        const { explain } = harness([rule]);
        const resolved = resolveToStatic("l0", "node.size", explain);

        assert.strictEqual(resolved.value, 3);
    });

    it("hands back a patch that moves the channel from the rules to the fixed values", () => {
        const { explain } = harness([rule]);
        const resolved = resolveToStatic("l0", "node.color", explain, { node: "n3" });

        assert.deepEqual(resolved.patch.set, { "node.color": resolved.value });
        assert.deepEqual(Object.keys(resolved.patch.encode ?? {}), ["node.size"]);
    });

    it("clears the rules entirely when it took the last one", () => {
        const { explain } = harness([betweennessColor()]);
        const resolved = resolveToStatic("l0", "node.color", explain, { node: "n3" });

        assert.strictEqual("encode" in resolved.patch, true);
        assert.isUndefined(resolved.patch.encode);
    });

    it("refuses a layer the element owns", () => {
        const { explain } = harness([
            {
                name: "Default",
                kind: "base",
                source: { by: "element", reason: "default" },
                selector: { match: "everything" },
                set: { "node.color": "#333333" },
            },
        ]);

        assert.strictEqual(
            codeOf(() => resolveToStatic("l0", "node.color", explain)),
            "E_PROTECTED",
        );
    });

    it("refuses a channel that is already a fixed value, and a layer that is not there", () => {
        const { explain } = harness([
            {
                name: "Mine",
                kind: "custom",
                selector: { match: "everything" },
                set: { "node.color": "#ff9900" },
            },
        ]);

        assert.strictEqual(
            codeOf(() => resolveToStatic("l0", "node.color", explain)),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => resolveToStatic("l9", "node.color", explain)),
            "E_BAD_COMMAND",
        );
    });
});

describe("a layer that reads what this session cannot answer is reported, never swallowed", () => {
    const directory: PathDirectory = { answers: (path: Path) => path === "results.betweenness.value" };

    /** A layer reading a column this session does not hold. */
    const missing: LayerSpec = {
        name: "Publication",
        kind: "encoding",
        selector: { match: "has", path: "data.logFC" },
        encode: { "node.color": { by: "data.logFC", palette: "blue-orange" } },
    };

    it("names the layer, the reason and the paths it needs", () => {
        const { explain } = harness([betweennessColor(), missing], NODES, directory);
        const unbound: readonly UnboundLayer[] = unboundLayers(explain);

        assert.strictEqual(unbound.length, 1);
        assert.strictEqual(unbound[0].layerId, "l1");
        assert.deepEqual(unbound[0].needs, ["data.logFC"]);
        assert.include(unbound[0].reason, "nothing in this session answers");
    });

    it("reports nothing at all when the session has no directory, rather than reporting everything", () => {
        const { explain } = harness([betweennessColor(), missing]);

        assert.deepEqual(unboundLayers(explain), []);
    });

    it("leaves alone a layer that reads nothing", () => {
        const { explain } = harness(
            [{ name: "Mine", kind: "custom", selector: { match: "everything" }, set: { "node.color": "#ff9900" } }],
            NODES,
            directory,
        );

        assert.deepEqual(unboundLayers(explain), []);
    });
});

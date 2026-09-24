import { assert, describe, it } from "vitest";

import {
    type FieldDescriptor,
    type LayerSpec,
    RESULT_SHAPES,
    type ResultShape,
    type RunId,
} from "../../../src/catalog/types";
import type { RunRef } from "../../../src/session/results/types";
import { ManagedRun, type RunDefinition, type RunSurroundings } from "../../../src/session/runs";
import { DEFAULT_SIZE_RANGE } from "../../../src/session/styles/derive";
import { planEncoding } from "../../../src/session/styles/EncodingSpec";
import {
    type EncodingRun,
    type EncodingSource,
    type EncodingSuggestion,
    type HighlightSuggestion,
    type StyleSuggestion,
    suggestStyles,
} from "../../../src/session/styles/index";
import { CAVEATS, ENGINE, FakeGraph, finishAtOnce } from "../runs/harness";

/** One published field, spelled out so a test can say exactly what a run offers. */
function field(
    name: string,
    kind: FieldDescriptor["kind"],
    type: FieldDescriptor["type"],
    runId: RunId,
): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/**
 * A run that publishes the fields it is given.
 * @param id - The run id, which is the path segment under `results`.
 * @param shape - The shape, which is what the derivation reads.
 * @param fields - What it published.
 * @returns The run.
 */
function runOf(id: RunId, shape: ResultShape, fields: readonly FieldDescriptor[]): EncodingRun {
    return { id, label: `The ${id} run`, algorithm: id, params: {}, shape, fields };
}

/** A centrality run: one number per node, and the graph half nothing paints. */
const BETWEENNESS = runOf("betweenness", "node-metric", [
    field("value", "node", "number", "betweenness"),
    field("rank", "node", "integer", "betweenness"),
    field("max", "graph", "number", "betweenness"),
]);

/** An edge measurement, which paints the other half of the graph. */
const EDGE_BETWEENNESS = runOf("edgebetweenness", "edge-metric", [
    field("value", "edge", "number", "edgebetweenness"),
    field("max", "graph", "number", "edgebetweenness"),
]);

/** A partition: a group per node, which is a label rather than a measurement. */
const LOUVAIN = runOf("louvain", "community", [
    field("group", "node", "integer", "louvain"),
    field("groupSize", "node", "integer", "louvain"),
    field("groupCount", "graph", "integer", "louvain"),
]);

/** A route: membership on the nodes AND on the edges. */
const ROUTE = runOf("route", "path", [
    field("onPath", "node", "boolean", "route"),
    field("order", "node", "integer", "route"),
    field("onPath", "edge", "boolean", "route"),
]);

/** A chosen set of nodes, which paints one half only. */
const INFLUENCERS = runOf("influencers", "node-set", [field("in", "node", "boolean", "influencers")]);

/** A chosen set of edges, which paints the other half only. */
const BRIDGES = runOf("bridges", "edge-set", [field("in", "edge", "boolean", "bridges")]);

/** A table of scored pairs: nothing per element, so nothing to paint. */
const PREDICTIONS = runOf("predictions", "pair-list", [field("pairs", "graph", "table", "predictions")]);

/** Every run these tests look up, for the plan that turns a suggestion into a layer. */
const RUNS: readonly EncodingRun[] = [BETWEENNESS, EDGE_BETWEENNESS, LOUVAIN, ROUTE, INFLUENCERS, BRIDGES];

/** Where a suggestion's run is looked up when it is planned into a layer. */
const RUN_SOURCE: EncodingSource = {
    run: (ref: RunRef): EncodingRun | undefined => RUNS.find((entry) => entry.id === ref),
    runIds: (): readonly RunId[] => RUNS.map((entry) => entry.id),
};

/**
 * The one suggestion a run makes, insisting that it made exactly one.
 * @param run - The run.
 * @returns Its suggestion.
 */
function onlySuggestion(run: EncodingRun): StyleSuggestion {
    const suggestions = suggestStyles(run);

    assert.lengthOf(suggestions, 1, `${run.id} suggests one thing`);

    return suggestions[0];
}

/**
 * The encoding a run suggests, insisting that it suggested an encoding.
 * @param run - The run.
 * @returns The encoding suggestion.
 */
function encodingOf(run: EncodingRun): EncodingSuggestion {
    const suggestion = onlySuggestion(run);

    if (suggestion.as !== "encoding") {
        throw new Error(`${run.id} suggests a ${suggestion.as} rather than an encoding.`);
    }

    return suggestion;
}

/**
 * The highlight a run suggests, insisting that it suggested a highlight.
 * @param run - The run.
 * @returns The highlight suggestion.
 */
function highlightOf(run: EncodingRun): HighlightSuggestion {
    const suggestion = onlySuggestion(run);

    if (suggestion.as !== "highlight") {
        throw new Error(`${run.id} suggests an ${suggestion.as} rather than a highlight.`);
    }

    return suggestion;
}

/**
 * The layer one encoding suggestion turns into.
 * @param run - The run that suggested it.
 * @returns The layer, as the styles API would add it.
 */
function layerFor(run: EncodingRun): LayerSpec {
    return planEncoding(encodingOf(run).spec, RUN_SOURCE);
}

describe("what a run suggests be drawn from it", () => {
    it("binds a node measurement to a colour over the nodes it measured", () => {
        const { spec, channels } = encodingOf(BETWEENNESS);

        assert.strictEqual(spec.channel, "node.color");
        assert.strictEqual(spec.run, "betweenness");
        assert.strictEqual(spec.field, "value");
        assert.deepStrictEqual([...channels], ["node.color"]);
    });

    it("paints the other half of the graph for an edge measurement", () => {
        const { spec, channels } = encodingOf(EDGE_BETWEENNESS);

        assert.strictEqual(spec.channel, "edge.color");
        assert.deepStrictEqual([...channels], ["edge.color"]);
    });

    it("reads a partition's group as the field to colour by", () => {
        const { spec } = encodingOf(LOUVAIN);

        assert.strictEqual(spec.field, "group");
        assert.strictEqual(spec.channel, "node.color");
    });

    it("suggests a highlight for a route, on both halves it runs through", () => {
        const { spec, channels } = highlightOf(ROUTE);

        assert.strictEqual(spec.run, "route");
        assert.strictEqual(spec.field, "onPath");
        assert.deepStrictEqual([...channels], ["node.color", "edge.color"]);
    });

    it("names only the half a chosen set actually chose", () => {
        assert.deepStrictEqual([...highlightOf(INFLUENCERS).channels], ["node.color"]);
        assert.deepStrictEqual([...highlightOf(BRIDGES).channels], ["edge.color"]);
    });

    it("suggests nothing for a result that is read rather than painted", () => {
        assert.lengthOf(suggestStyles(PREDICTIONS), 0);
        assert.lengthOf(suggestStyles(runOf("timeline", "temporal", [])), 0);
        assert.lengthOf(suggestStyles(runOf("diameter", "fact", [])), 0);
    });

    it("suggests nothing when the run never published the field its shape declares primary", () => {
        // A run that stopped before it measured anything, or an algorithm that fills fewer fields
        // than it declares. A suggestion naming a field nothing carries would be refused on
        // application and paint nothing either way, so it is not made.
        const empty = runOf("halted", "node-metric", [field("max", "graph", "number", "halted")]);

        assert.lengthOf(suggestStyles(empty), 0);
    });

    it("has an answer for every result shape the element publishes", () => {
        // A new shape with no entry here is a shape whose runs quietly paint nothing. The table
        // is the assertion: it fails to compile if a shape is missing and fails to pass if the
        // derivation disagrees with it.
        const expected: Record<ResultShape, "encoding" | "highlight" | "nothing"> = {
            "node-metric": "encoding",
            "edge-metric": "encoding",
            community: "encoding",
            "layered-grouping": "encoding",
            "category-table": "encoding",
            path: "highlight",
            "node-set": "highlight",
            "edge-set": "highlight",
            "pair-list": "nothing",
            temporal: "nothing",
            fact: "nothing",
        };

        for (const shape of RESULT_SHAPES) {
            // Every shape gets a run publishing every field name it could want, on both halves,
            // so what comes out is decided by the shape rather than by what this test filled in.
            const names = ["value", "group", "level", "category", "onPath", "in", "series", "pairs"];
            const fields = names.flatMap((name) => [
                field(name, "node", "number", "any"),
                field(name, "edge", "number", "any"),
            ]);
            const suggestions = suggestStyles(runOf("any", shape, fields));
            const outcome = suggestions.length === 0 ? "nothing" : suggestions[0].as;

            assert.strictEqual(outcome, expected[shape], shape);
        }
    });
});

describe("the layer a suggestion becomes", () => {
    it("is scoped to the elements carrying that run's value and nothing else", () => {
        // THE rule this replaces: ten of the hand-written blocks used an empty selector, which
        // matched every node and every edge, so an algorithm painted elements it had measured
        // nothing about. A suggestion cannot express that: it names no selector at all, and the
        // one the plan writes is a presence test on this run's own column.
        const layer = layerFor(BETWEENNESS);

        assert.deepStrictEqual(layer.selector, { match: "has", path: "results.betweenness.value" });
        assert.strictEqual(layer.target, "node");
        assert.strictEqual(layer.kind, "encoding");
    });

    it("carries no selector, no scale and no palette of its own", () => {
        // The taste is settled in one place, by the plan, from the shape. A suggestion that
        // restated any of it would be a second opinion, and the first time the two disagreed the
        // picture would stop matching its own legend.
        const { spec } = encodingOf(LOUVAIN);
        const stated = Object.keys(spec).sort((left, right) => (left < right ? -1 : 1));

        assert.deepStrictEqual(stated, ["channel", "field", "run"]);
    });

    it("reads a measurement continuously and a grouping categorically", () => {
        const measured = layerFor(BETWEENNESS).encode?.["node.color"];
        const grouped = layerFor(LOUVAIN).encode?.["node.color"];

        assert.isDefined(measured);
        assert.isDefined(grouped);
        assert.deepStrictEqual(measured, {
            by: "results.betweenness.value",
            scale: "linear",
        });
        // A grouping carries the default overflow policy, so a run that finds more groups than the
        // palette has colours folds the smallest into one grey rather than being refused.
        assert.deepStrictEqual(grouped, {
            by: "results.louvain.group",
            scale: "ordinal",
            overflow: "other",
        });
    });

    it("names no palette, so the one that gets painted can fit the groups the run found", () => {
        // The scale is settled here because the SHAPE settles it -- a partition is categorical
        // however many groups it turns out to hold. The palette is not, because it depends on a
        // number nothing knows yet: how many groups there are. Writing one in anyway is what
        // planted an eight-colour palette on a ten-community result, which the capacity check
        // then refused, leaving a layer that was in the stack, enabled, and painting nothing.
        const grouped = layerFor(LOUVAIN).encode?.["node.color"];
        const measured = layerFor(BETWEENNESS).encode?.["node.color"];

        assert.notProperty(grouped, "palette");
        assert.notProperty(measured, "palette");
    });

    it("records the run, the algorithm and the parameters that produced it", () => {
        const layer = layerFor(EDGE_BETWEENNESS);

        assert.deepStrictEqual(layer.source, {
            by: "run",
            runId: "edgebetweenness",
            algorithm: "edgebetweenness",
            params: {},
        });
    });
});

describe("the run object that makes the suggestion", () => {
    it("suggests what its own shape and fields call for", () => {
        // The wiring, rather than the derivation: a run answers this itself, so a consumer that
        // wants to show what WOULD be painted -- or to paint it at another moment -- asks the
        // object it was handed rather than reaching for a helper.
        const definition: RunDefinition = {
            id: "louvain",
            algorithm: "louvain",
            params: {},
            seed: null,
            exact: null,
            sample: null,
            timeBoxMs: null,
            style: true,
            shape: "community",
            fields: LOUVAIN.fields,
            engine: ENGINE,
            caveats: CAVEATS,
            execute: finishAtOnce,
        };
        const surroundings: RunSurroundings = {
            label: () => "Communities",
            queuePosition: () => null,
            stale: () => null,
            resolveScope: () => new FakeGraph().resolve("graph"),
            enqueue: () => ({ cancel: () => undefined }),
        };
        const run = new ManagedRun(definition, surroundings);
        const suggestions = run.suggestEncodings();

        assert.lengthOf(suggestions, 1);
        assert.strictEqual(suggestions[0].as, "encoding");
        assert.deepStrictEqual(suggestions[0].spec, {
            run: "louvain",
            field: "group",
            channel: "node.color",
        });
    });

    it("suggests nothing from a run whose result is a table", () => {
        const definition: RunDefinition = {
            id: "predictions",
            algorithm: "adamic-adar",
            params: {},
            seed: null,
            exact: null,
            sample: null,
            timeBoxMs: null,
            style: true,
            shape: "pair-list",
            fields: PREDICTIONS.fields,
            engine: ENGINE,
            caveats: CAVEATS,
            execute: finishAtOnce,
        };
        const surroundings: RunSurroundings = {
            label: () => "Link prediction",
            queuePosition: () => null,
            stale: () => null,
            resolveScope: () => new FakeGraph().resolve("graph"),
            enqueue: () => ({ cancel: () => undefined }),
        };

        assert.lengthOf(new ManagedRun(definition, surroundings).suggestEncodings(), 0);
    });
});

describe("sizing by the run's measurement, asked for with style: { size }", () => {
    const sizeOf = (suggestions: readonly StyleSuggestion[]): EncodingSuggestion | undefined =>
        suggestions.find(
            (entry): entry is EncodingSuggestion => entry.as === "encoding" && entry.channels.includes("node.size"),
        );

    it("adds nothing for true or false, which are the colour suggestion alone and none", () => {
        assert.isUndefined(sizeOf(suggestStyles(BETWEENNESS, true)));
        assert.isUndefined(sizeOf(suggestStyles(BETWEENNESS, false)));
        assert.isUndefined(sizeOf(suggestStyles(BETWEENNESS)));
    });

    it("adds a node size over the same field, in the default range, for size: true", () => {
        const suggestions = suggestStyles(BETWEENNESS, { size: true });

        assert.lengthOf(suggestions, 2, "the colour is still suggested");
        assert.deepStrictEqual(sizeOf(suggestions)?.spec, {
            run: "betweenness",
            field: "value",
            channel: "node.size",
            range: [...DEFAULT_SIZE_RANGE],
        });
    });

    it("uses the range it was given", () => {
        assert.deepStrictEqual(sizeOf(suggestStyles(BETWEENNESS, { size: [2, 6] }))?.spec.range, [2, 6]);
    });

    it("adds nothing when size is false in the object", () => {
        assert.lengthOf(suggestStyles(BETWEENNESS, { size: false }), 1);
    });

    it("ignores size for a result that is not a node measurement", () => {
        assert.isUndefined(sizeOf(suggestStyles(LOUVAIN, { size: true })));
        assert.isUndefined(sizeOf(suggestStyles(EDGE_BETWEENNESS, { size: true })));
        assert.isUndefined(sizeOf(suggestStyles(ROUTE, { size: true })));
    });

    it("produces a layer scoped to the elements carrying the value", () => {
        const spec = sizeOf(suggestStyles(BETWEENNESS, { size: true }))?.spec;
        const layer = spec === undefined ? undefined : planEncoding(spec, RUN_SOURCE);

        assert.deepStrictEqual(layer?.selector, { match: "has", path: "results.betweenness.value" });
    });
});

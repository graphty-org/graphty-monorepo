import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import type { FieldDescriptor } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors/GraphtyError";
import {
    createRunResult,
    type ResultElementValues,
    type RunResultInit,
    SUMMARY_GROUP_LIMIT,
    SUMMARY_TOP_LIMIT,
} from "../../../src/session/results/RunResult";
import { RESULT_SHAPE_CONTRACTS, type RunResult } from "../../../src/session/results/types";
import type { Caveats } from "../../../src/session/runs/types";

const CAVEATS: Caveats = {
    exact: true,
    direction: "undirected",
    precision: "f64",
    method: "degree",
    notes: [],
};

/** A field descriptor with the path a catalogue descriptor would have written. */
function field(spec: Omit<FieldDescriptor, "path">): FieldDescriptor {
    return { ...spec, path: `results.$.${spec.name}` };
}

/** The uniform field list a metric shape publishes, per element and per graph. */
function metricFields(kind: "node" | "edge", normalization?: string): readonly FieldDescriptor[] {
    const value: Omit<FieldDescriptor, "path"> = {
        name: "value",
        plainName: "Connections",
        technicalName: "degree",
        kind,
        type: "number",
    };

    return [
        field(normalization === undefined ? value : { ...value, normalization }),
        field({ name: "rank", plainName: "Rank", technicalName: "rank", kind, type: "integer" }),
        field({ name: "percentile", plainName: "Percentile", technicalName: "percentile", kind, type: "number" }),
        field({ name: "min", plainName: "Lowest", technicalName: "min", kind: "graph", type: "number" }),
        field({ name: "max", plainName: "Highest", technicalName: "max", kind: "graph", type: "number" }),
        field({ name: "median", plainName: "Middle", technicalName: "median", kind: "graph", type: "number" }),
        field({ name: "mean", plainName: "Average", technicalName: "mean", kind: "graph", type: "number" }),
        field({ name: "measured", plainName: "Measured", technicalName: "measured", kind: "graph", type: "integer" }),
        field({
            name: "normalization",
            plainName: "Normalization",
            technicalName: "normalization",
            kind: "graph",
            type: "string",
        }),
        field({ name: "tiedAtMin", plainName: "Tied", technicalName: "tiedAtMin", kind: "graph", type: "integer" }),
    ];
}

/** One node-metric result over the given per-node values. */
function metricResult(values: readonly number[], init?: Partial<RunResultInit>): RunResult {
    const nodes: ResultElementValues[] = values.map((value, index) => ({ id: `n${index}`, values: { value } }));

    return createRunResult({
        runId: "degree",
        shape: "node-metric",
        fields: metricFields("node"),
        measured: { nodes: values.length, edges: 0 },
        nodes,
        caveats: CAVEATS,
        durationMs: 12,
        ...init,
    });
}

/** How big a summary is once it has been serialised. */
function summaryBytes(result: RunResult): number {
    return JSON.stringify(result.summary()).length;
}

describe("a node-metric result", () => {
    it("gives every element its place without the algorithm computing one", () => {
        const result = metricResult([1, 9, 5]);

        assert.deepStrictEqual(result.node("n1"), { value: 9, rank: 1, percentile: 1 });
        assert.strictEqual(result.node("n2")?.rank, 2);
        assert.strictEqual(result.node("n0")?.rank, 3);
        assert.strictEqual(result.node("n0")?.percentile, 1 / 3);
    });

    it("publishes the graph-level range every metric promises, including the ones that did not", () => {
        // Betweenness and closeness published no min or max, which is the defect a consumer
        // worked around by scanning the data manager for itself.
        const result = metricResult([2, 4, 4, 10]);

        assert.strictEqual(result.graph.min, 2);
        assert.strictEqual(result.graph.max, 10);
        assert.strictEqual(result.graph.median, 4);
        assert.strictEqual(result.graph.mean, 5);
        assert.strictEqual(result.graph.measured, 4);
        assert.strictEqual(result.graph.tiedAtMin, 1);
        assert.strictEqual(result.graph.normalization, "none");
    });

    it("counts how many elements sit at the lowest value", () => {
        // The number that says whether a colour ramp is about to paint most of the graph one
        // colour.
        assert.strictEqual(metricResult([0, 0, 0, 0, 7]).graph.tiedAtMin, 4);
        assert.strictEqual(metricResult([0, 0, 0, 0, 7]).summary().tiedAtMin, 4);
    });

    it("keeps what the algorithm published rather than replacing it with an inference", () => {
        const result = createRunResult({
            runId: "degree",
            shape: "node-metric",
            fields: metricFields("node"),
            measured: { nodes: 2, edges: 0 },
            nodes: [
                { id: "a", values: { value: 1, rank: 7 } },
                { id: "b", values: { value: 2 } },
            ],
            graph: { max: 99, normalization: "max" },
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.strictEqual(result.node("a")?.rank, 7);
        assert.strictEqual(result.graph.max, 99);
        assert.strictEqual(result.graph.min, 1);
        assert.strictEqual(result.summary().normalization, "max");
    });

    it("reads the scaling its own field declares when the run published none", () => {
        const result = createRunResult({
            runId: "pagerank",
            shape: "node-metric",
            fields: metricFields("node", "min-max"),
            measured: { nodes: 2, edges: 0 },
            nodes: [
                { id: "a", values: { value: 1 } },
                { id: "b", values: { value: 2 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.strictEqual(result.graph.normalization, "min-max");
        assert.strictEqual(result.summary().normalization, "min-max");
    });
});

describe("a result that measured nothing", () => {
    it("claims no range at all", () => {
        const result = metricResult([]);

        assert.strictEqual(result.graph.measured, 0);
        assert.strictEqual(result.graph.min, undefined);
        assert.strictEqual(result.graph.max, undefined);
        assert.strictEqual(result.graph.tiedAtMin, 0);
    });

    it("answers every reading question with nothing rather than with zero", () => {
        const result = metricResult([]);
        const summary = result.summary();

        assert.strictEqual(result.column("value").length, 0);
        assert.isNaN(result.column("value").min);
        assert.deepStrictEqual(result.ranking("value"), []);
        assert.deepStrictEqual(result.histogram("value").bins, []);
        assert.strictEqual(result.histogram("value").binning, "empty");
        assert.strictEqual(summary.min, null);
        assert.strictEqual(summary.max, null);
        assert.strictEqual(summary.median, null);
        assert.strictEqual(summary.mean, null);
        assert.strictEqual(summary.measured, 0);
        assert.deepStrictEqual(summary.top, []);
    });
});

describe("a result with one element", () => {
    it("ranks it first and draws it as one bar", () => {
        const result = metricResult([4]);

        assert.deepStrictEqual(result.ranking("value"), [{ id: "n0", value: 4, rank: 1, percentile: 1 }]);
        assert.deepStrictEqual(result.histogram("value").bins, [{ from: 4, to: 4, count: 1 }]);
        assert.strictEqual(result.summary().min, 4);
        assert.strictEqual(result.summary().max, 4);
    });
});

describe("a result where every value is identical", () => {
    it("puts every element at rank 1 and reports all of them tied at the minimum", () => {
        const result = metricResult([3, 3, 3, 3]);

        assert.deepStrictEqual(
            result.ranking("value").map((entry) => entry.rank),
            [1, 1, 1, 1],
        );
        assert.strictEqual(result.summary().tiedAtMin, 4);
        assert.strictEqual(result.summary().min, 3);
        assert.strictEqual(result.summary().max, 3);
        assert.deepStrictEqual(result.histogram("value").bins, [{ from: 3, to: 3, count: 4 }]);
    });
});

describe("a result spanning many orders of magnitude", () => {
    it("draws a distribution a reader can see, on the scale asked for", () => {
        const values = [
            ...Array.from({ length: 800 }, (_unused, index) => 0.001 + index / 100000),
            ...Array.from({ length: 200 }, (_unused, index) => 10 ** (index % 4) + index / 10),
        ];
        const result = metricResult(values);
        const log = result.histogram("value", { bins: 20, scale: "log" });
        const linear = result.histogram("value", { bins: 20, scale: "linear" });

        assert.strictEqual(
            log.bins.reduce((total, bin) => total + bin.count, 0),
            1000,
        );
        assert.isBelow(log.bins[0].count, linear.bins[0].count);
        assert.strictEqual(log.scale, "log", "the scale asked for was the scale applied");
        assert.strictEqual(linear.scale, "linear");
        assert.strictEqual(log.binning, "banded");
    });

    /**
     * WHAT A CAPTION IS ALLOWED TO CLAIM.
     *
     * A logarithmic layout needs positive values spanning more than one magnitude. A column with
     * neither is drawn linearly rather than refused, because refusing to draw a distribution is
     * worse than drawing it on the other axis -- but a caption written from the REQUEST then says
     * "log scale" over a linear chart, and nothing a consumer can read would contradict it. So
     * the histogram reports the scale it applied, and that is what a caption reads.
     */
    it("says linear when a log layout was asked for and could not be built", () => {
        // Nothing positive, so there is no logarithm to take: a column of debts, a column of
        // offsets from a baseline. Two hundred distinct values, so it bands rather than taking
        // the bar-per-value path, which is the case where the scale is a real choice.
        const result = metricResult(Array.from({ length: 200 }, (_unused, index) => -index / 100));
        const asked = result.histogram("value", { bins: 20, scale: "log" });

        assert.strictEqual(asked.binning, "banded", "the case where a scale is applied at all");
        assert.strictEqual(asked.scale, "linear", "a column with no positive values has no logarithmic layout");
        assert.strictEqual(asked.suggestedScale, "linear", "and it does not argue for one either");
        assert.isNotEmpty(asked.bins, "it is still drawn, rather than refused");
    });

    it("takes the scale the column argues for when asked for auto", () => {
        const values = [
            ...Array.from({ length: 800 }, (_unused, index) => 0.001 + index / 100000),
            ...Array.from({ length: 200 }, (_unused, index) => 10 ** (index % 4) + index / 10),
        ];
        const result = metricResult(values);
        const auto = result.histogram("value", { bins: 20, scale: "auto" });

        assert.strictEqual(auto.suggestedScale, "log", "this spread collapses onto one bar linearly");
        assert.strictEqual(auto.scale, "log", "and auto applied what it suggested");
    });

    it("reports a per-value layout as neither axis, because it has no bands to space", () => {
        const result = metricResult([1, 1, 2, 3, 3, 3]);
        const drawn = result.histogram("value", { bins: 20, scale: "log" });

        assert.strictEqual(drawn.binning, "per-value");
        assert.strictEqual(drawn.scale, "linear", "a bar per value is not on a logarithmic axis");
        assert.deepStrictEqual(
            drawn.bins.map((bin) => bin.count),
            [2, 1, 3],
        );
    });
});

describe("reading a result", () => {
    it("computes a column's figures once and hands back the same view", () => {
        const result = metricResult([1, 2, 3]);

        assert.strictEqual(result.column("value"), result.column("value"));
        assert.strictEqual(result.column("value").mean, 2);
    });

    it("returns the whole ranking when no limit is given and a slice when one is", () => {
        const result = metricResult([1, 2, 3, 4, 5]);

        assert.strictEqual(result.ranking("value").length, 5);
        assert.strictEqual(result.ranking("value", 2).length, 2);
        assert.strictEqual(result.ranking("value", 0).length, 0);
        assert.strictEqual(result.ranking("value", 99).length, 5);
    });

    it("refuses a ranking limit that is not a whole number of entries", () => {
        const result = metricResult([1, 2]);

        for (const limit of [-1, 1.5]) {
            try {
                result.ranking("value", limit);
                assert.fail(`a limit of ${limit} should have been refused`);
            } catch (error) {
                assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_OPTION_RANGE");
            }
        }
    });

    it("reports an unknown field with the fields that would have worked", () => {
        const result = metricResult([1, 2]);

        try {
            result.column("valu");
            assert.fail("an unknown field should have been refused");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (!isGraphtyError(error)) {
                return;
            }

            assert.strictEqual(error.code, "E_UNKNOWN_ATTRIBUTE");
            assert.deepStrictEqual(error.details.candidates, ["value", "rank", "percentile"]);
        }
    });

    it("says where to read a graph-level field instead of pretending it is a column", () => {
        const result = metricResult([1, 2]);

        try {
            result.column("min");
            assert.fail("a graph field should not be readable as a column");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_BAD_COMMAND");
        }
    });

    it("refuses to read a field that does not carry numbers", () => {
        const result = createRunResult({
            runId: "louvain",
            shape: "community",
            fields: [
                field({ name: "group", plainName: "Group", technicalName: "group", kind: "node", type: "string" }),
                field({
                    name: "groupSize",
                    plainName: "Group size",
                    technicalName: "groupSize",
                    kind: "node",
                    type: "integer",
                }),
            ],
            measured: { nodes: 2, edges: 0 },
            nodes: [
                { id: "a", values: { group: "left" } },
                { id: "b", values: { group: "left" } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });

        try {
            result.column("group");
            assert.fail("a string field should not be readable as a column");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_BAD_COMMAND");
        }
    });

    it("hands back nothing for an element the run never published", () => {
        const result = metricResult([1]);

        assert.strictEqual(result.node("nobody"), undefined);
        assert.strictEqual(result.edge("nobody"), undefined);
    });

    it("is immutable once built", () => {
        const result = metricResult([1, 2]);

        assert.isTrue(Object.isFrozen(result.graph));
        assert.isTrue(Object.isFrozen(result.node("n0")));
    });
});

describe("a summary", () => {
    it("stays the same size however large the graph is", () => {
        const small = metricResult(Array.from({ length: 10 }, (_unused, index) => index));
        const large = metricResult(Array.from({ length: 5000 }, (_unused, index) => index));

        assert.strictEqual(large.summary().top.length, SUMMARY_TOP_LIMIT);
        assert.strictEqual(large.summary().count, 5000);
        assert.strictEqual(large.summary().measured, 5000);
        assert.isBelow(summaryBytes(large), summaryBytes(small) + 200);
    });

    it("carries the run's own qualifications and cost", () => {
        const summary = metricResult([1, 2]).summary();

        assert.strictEqual(summary.caveats, CAVEATS);
        assert.strictEqual(summary.durationMs, 12);
    });

    it("names an element the way a reader would, falling back to its id", () => {
        const result = metricResult([1, 2], {
            labelOf: (id) => (id === "n1" ? "Grand Central" : undefined),
        });
        const [top, next] = result.summary().top;

        assert.strictEqual(top.label, "Grand Central");
        assert.strictEqual(next.label, "n0");
    });

    it("is computed once and kept", () => {
        const result = metricResult([1, 2]);

        assert.strictEqual(result.summary(), result.summary());
    });
});

describe("a community result", () => {
    it("fills in each node's group size and the graph's group table", () => {
        const result = createRunResult({
            runId: "louvain",
            shape: "community",
            fields: [
                field({ name: "group", plainName: "Group", technicalName: "group", kind: "node", type: "integer" }),
                field({
                    name: "groupSize",
                    plainName: "Group size",
                    technicalName: "groupSize",
                    kind: "node",
                    type: "integer",
                }),
            ],
            measured: { nodes: 5, edges: 4 },
            nodes: [
                { id: "a", values: { group: 0 } },
                { id: "b", values: { group: 0 } },
                { id: "c", values: { group: 0 } },
                { id: "d", values: { group: 1 } },
                { id: "e", values: { group: 1 } },
            ],
            caveats: CAVEATS,
            durationMs: 3,
        });

        assert.strictEqual(result.node("a")?.groupSize, 3);
        assert.strictEqual(result.node("d")?.groupSize, 2);
        assert.strictEqual(result.graph.groupCount, 2);
        assert.deepStrictEqual(result.graph.sizes, [
            { group: 0, size: 3 },
            { group: 1, size: 2 },
        ]);
        assert.deepStrictEqual(result.summary().groups, [
            { group: 0, size: 3 },
            { group: 1, size: 2 },
        ]);
        assert.strictEqual(result.summary().count, 5);
        assert.strictEqual(result.summary().measured, 5);
        assert.strictEqual(result.summary().min, null);
    });

    it("bounds the groups a summary carries", () => {
        const result = createRunResult({
            runId: "components",
            shape: "community",
            fields: [
                field({ name: "group", plainName: "Group", technicalName: "group", kind: "node", type: "integer" }),
                field({
                    name: "groupSize",
                    plainName: "Group size",
                    technicalName: "groupSize",
                    kind: "node",
                    type: "integer",
                }),
            ],
            measured: { nodes: 400, edges: 0 },
            nodes: Array.from({ length: 400 }, (_unused, index) => ({
                id: `n${index}`,
                values: { group: index % 100 },
            })),
            caveats: CAVEATS,
            durationMs: 3,
        });

        assert.strictEqual(result.graph.groupCount, 100);
        assert.strictEqual(result.summary().groups?.length, SUMMARY_GROUP_LIMIT);
    });
});

describe("a layered grouping result", () => {
    it("fills in each node's level size and summarises the levels", () => {
        const result = createRunResult({
            runId: "bfs",
            shape: "layered-grouping",
            fields: [
                field({ name: "level", plainName: "Level", technicalName: "level", kind: "node", type: "integer" }),
                field({
                    name: "levelSize",
                    plainName: "Level size",
                    technicalName: "levelSize",
                    kind: "node",
                    type: "integer",
                }),
            ],
            measured: { nodes: 4, edges: 3 },
            nodes: [
                { id: "a", values: { level: 0 } },
                { id: "b", values: { level: 1 } },
                { id: "c", values: { level: 1 } },
                { id: "d", values: { level: 2 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.strictEqual(result.node("b")?.levelSize, 2);
        assert.strictEqual(result.graph.levelCount, 3);
        assert.strictEqual(result.summary().min, 0);
        assert.strictEqual(result.summary().max, 2);
        assert.deepStrictEqual(result.summary().groups, [
            { group: 1, size: 2 },
            { group: 0, size: 1 },
            { group: 2, size: 1 },
        ]);
    });

    it("still summarises when the run did not declare the field its shape calls primary", () => {
        // A field list missing its primary field is a defect in the run. The summary says what it
        // can about the result rather than refusing to describe it at all.
        const result = createRunResult({
            runId: "bfs",
            shape: "layered-grouping",
            fields: [
                field({
                    name: "levelSize",
                    plainName: "Level size",
                    technicalName: "levelSize",
                    kind: "node",
                    type: "integer",
                }),
            ],
            measured: { nodes: 2, edges: 1 },
            nodes: [
                { id: "a", values: { level: 0 } },
                { id: "b", values: { level: 1 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });
        const summary = result.summary();

        assert.strictEqual(summary.min, null);
        assert.strictEqual(summary.measured, 2);
        assert.deepStrictEqual(summary.top, []);
    });
});

describe("a path result", () => {
    it("counts the route without the algorithm restating its own length", () => {
        const result = createRunResult({
            runId: "shortest-path",
            shape: "path",
            fields: [
                field({ name: "onPath", plainName: "On route", technicalName: "onPath", kind: "node", type: "boolean" }),
                field({ name: "order", plainName: "Step", technicalName: "order", kind: "node", type: "integer" }),
                field({ name: "onPath", plainName: "On route", technicalName: "onPath", kind: "edge", type: "boolean" }),
            ],
            measured: { nodes: 4, edges: 3 },
            nodes: [
                { id: "a", values: { onPath: true, order: 0 } },
                { id: "b", values: { onPath: true, order: 1 } },
                { id: "c", values: { onPath: true, order: 2 } },
                { id: "d", values: { onPath: false } },
            ],
            edges: [
                { id: "a->b", values: { onPath: true } },
                { id: "b->c", values: { onPath: true } },
                { id: "c->d", values: { onPath: false } },
            ],
            graph: { cost: 4.5 },
            caveats: CAVEATS,
            durationMs: 2,
        });

        assert.strictEqual(result.graph.length, 3);
        assert.strictEqual(result.graph.hops, 2);
        assert.strictEqual(result.graph.cost, 4.5, "a weighted cost is the algorithm's to publish");
        assert.strictEqual(result.summary().count, 7);
        assert.strictEqual(result.summary().min, null);
        assert.deepStrictEqual(result.summary().top, []);
    });
});

describe("a set result", () => {
    it("counts what it selected", () => {
        const result = createRunResult({
            runId: "k-core",
            shape: "node-set",
            fields: [
                field({ name: "in", plainName: "In the core", technicalName: "in", kind: "node", type: "boolean" }),
                field({ name: "count", plainName: "Size", technicalName: "count", kind: "graph", type: "integer" }),
            ],
            measured: { nodes: 3, edges: 0 },
            nodes: [
                { id: "a", values: { in: true } },
                { id: "b", values: { in: false } },
                { id: "c", values: { in: true } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.strictEqual(result.graph.count, 2);
        assert.strictEqual(result.summary().count, 3);
        assert.strictEqual(result.summary().measured, 3);
    });
});

describe("an edge-metric result", () => {
    it("reads the edge half of the result", () => {
        const result = createRunResult({
            runId: "edge-betweenness",
            shape: "edge-metric",
            fields: metricFields("edge"),
            measured: { nodes: 0, edges: 3 },
            edges: [
                { id: "a->b", values: { value: 1 } },
                { id: "b->c", values: { value: 5 } },
                { id: "c->a", values: { value: 3 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.strictEqual(result.column("value").length, 3);
        assert.strictEqual(result.edge("b->c")?.rank, 1);
        assert.strictEqual(result.graph.max, 5);
        assert.strictEqual(result.summary().count, 3);
    });
});

describe("the plain-language reading", () => {
    /**
     * This verb used to throw on every call of the shipped element: it took a generator and no
     * caller supplied one, so a published member could not be used. The element brings its own
     * now, and a host that wants different words still replaces it.
     */
    it("writes a sentence out of the element's own generator", () => {
        const sentence = metricResult([1, 2, 9]).reading();

        assert.isNotEmpty(sentence);
        // The figures in the sentence are the result's own, so a reader can check it against the
        // chart beside it. Nothing here is rounded to make the phrase read better.
        assert.include(sentence, "9", "the highest value it measured");
        assert.include(sentence, "2", "and the middle one");
    });

    it("says that nothing was measured rather than reporting zeros", () => {
        const sentence = metricResult([]).reading();

        assert.include(sentence.toLowerCase(), "nothing was measured");
    });

    it("hands the installed generator the finished result", () => {
        const result = metricResult([1, 2], {
            reading: (built, options) => `${built.runId}:${built.summary().max ?? 0}:${options.audience ?? "plain"}`,
        });

        assert.strictEqual(result.reading(), "degree:2:plain");
        assert.strictEqual(result.reading({ audience: "technical" }), "degree:2:technical");
    });
});

describe("the fields a shape declares", () => {
    it("are all filled for a run built from the catalogue's own descriptor", () => {
        const descriptor = BUILT_IN_ALGORITHMS.find((entry) => entry.key === "degree");
        assert.isDefined(descriptor);
        if (descriptor === undefined) {
            return;
        }

        const result = createRunResult({
            runId: "degree",
            shape: descriptor.shape,
            fields: descriptor.fields,
            measured: { nodes: 3, edges: 2 },
            nodes: [
                { id: 1, values: { value: 2, inDegree: 1, outDegree: 1 } },
                { id: 2, values: { value: 1, inDegree: 1, outDegree: 0 } },
                { id: 3, values: { value: 1, inDegree: 0, outDegree: 1 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });
        const contract = RESULT_SHAPE_CONTRACTS[descriptor.shape];

        for (const name of contract.graphFields) {
            assert.isDefined(result.graph[name], `the graph half should carry "${name}"`);
        }

        for (const name of contract.nodeFields) {
            assert.isDefined(result.node(1)?.[name], `every node should carry "${name}"`);
        }
    });
});

describe("the top of a ranking, cut only between tie groups", () => {
    /** The cat fixture's degrees: 3 nodes of degree 4, 12 of degree 3 and 5 of degree 2. */
    const CAT_DEGREES = [...Array.from({ length: 3 }, () => 4), ...Array.from({ length: 12 }, () => 3), ...Array.from({ length: 5 }, () => 2)];

    it("takes a tie group only when the whole group fits inside n", () => {
        const top = metricResult(CAT_DEGREES).top("value", 5);

        assert.deepStrictEqual(
            top.entries.map((entry) => entry.value),
            [4, 4, 4],
            "the twelve nodes of degree 3 would make fifteen, so none of them is taken",
        );
        assert.deepStrictEqual(top.leftOut, { value: 3, count: 12 });
        assert.match(top.reason ?? "", /12 tie at 3/);
    });

    it("takes nothing from a regular graph whose one tie group is larger than n, and says why", () => {
        const top = metricResult([3, 3, 3, 3, 3, 3]).top("value", 2);

        assert.deepStrictEqual(top.entries, []);
        assert.deepStrictEqual(top.leftOut, { value: 3, count: 6 });
        assert.isString(top.reason);
    });

    it("takes a tie group that ends exactly at n, and everything when n covers the ranking", () => {
        assert.strictEqual(metricResult(CAT_DEGREES).top("value", 15).entries.length, 15);
        assert.strictEqual(metricResult(CAT_DEGREES).top("value", 15).leftOut, null);
        assert.strictEqual(metricResult([3, 3, 3, 3]).top("value", 50).entries.length, 4);
        assert.strictEqual(metricResult([3, 3, 3, 3]).top("value", 50).reason, null);
    });

    it("refuses an n that is not a whole number of entries", () => {
        for (const n of [-1, 1.5]) {
            try {
                metricResult([1, 2]).top("value", n);
                assert.fail(`an n of ${n} should have been refused`);
            } catch (error) {
                assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_OPTION_RANGE");
            }
        }
    });
});

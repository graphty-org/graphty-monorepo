import { assert, describe, it } from "vitest";

import type { FieldDescriptor, ResultShape } from "../../../src/catalog/types";
import {
    createResultsApi,
    nearestNames,
    type ResultsRegistry,
    type ResultsRunEntry,
    suggestResultPaths,
} from "../../../src/session/results/ResultsApi";
import { createRunResult } from "../../../src/session/results/RunResult";
import type { ResultRoot, RunResult } from "../../../src/session/results/types";
import type { Caveats, Run } from "../../../src/session/runs/types";

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

/** A finished node-metric result over two nodes. */
function metricResult(runId: string): RunResult {
    return createRunResult({
        runId,
        shape: "node-metric",
        fields: [
            field({ name: "value", plainName: "Connections", technicalName: "degree", kind: "node", type: "number" }),
            field({ name: "rank", plainName: "Rank", technicalName: "rank", kind: "node", type: "integer" }),
            field({ name: "min", plainName: "Lowest", technicalName: "min", kind: "graph", type: "number" }),
        ],
        measured: { nodes: 2, edges: 0 },
        nodes: [
            { id: "a", values: { value: 1 } },
            { id: "b", values: { value: 2 } },
        ],
        caveats: CAVEATS,
        durationMs: 1,
    });
}

/** A registry over a fixed list of entries. */
function registryOf(entries: readonly ResultsRunEntry[]): ResultsRegistry {
    return {
        entry: (id) => entries.find((candidate) => candidate.id === id),
        entries: () => entries,
    };
}

/** A run reference carrying only what addressing reads off it. */
function runRef(id: string, shape: ResultShape): Run {
    return { id, shape } as unknown as Run;
}

const DEGREE = metricResult("degree");
const REGISTRY = registryOf([
    { id: "degree", label: "Connections", shape: "node-metric", result: DEGREE },
    { id: "louvain", label: "Communities", shape: "community", result: metricResult("louvain") },
    { id: "facts", label: "Facts", shape: "fact", result: metricResult("facts") },
    { id: "running", label: "Bridges", shape: "node-metric" },
]);

describe("addressing a result", () => {
    it("builds the path nobody should have to type", () => {
        const results = createResultsApi(REGISTRY);

        assert.strictEqual(results.path("degree", "value"), "results.degree.value");
    });

    it("defaults to the field the run's shape calls primary", () => {
        // A caller holding a run should not have to open the catalogue to learn that a
        // centrality's number is called "value" and a partition's is called "group".
        const results = createResultsApi(REGISTRY);

        assert.strictEqual(results.path("degree"), "results.degree.value");
        assert.strictEqual(results.path("louvain"), "results.louvain.group");
    });

    it("addresses the whole result for a shape with no primary field", () => {
        assert.strictEqual(createResultsApi(REGISTRY).path("facts"), "results.facts");
    });

    it("takes a run, its result or a bare id", () => {
        const results = createResultsApi(REGISTRY);

        assert.strictEqual(results.path(runRef("degree", "node-metric")), "results.degree.value");
        assert.strictEqual(results.path(DEGREE), "results.degree.value");
        assert.strictEqual(results.path("degree"), "results.degree.value");
    });

    it("reads the shape off the reference when the session holds no such run", () => {
        const results = createResultsApi(registryOf([]));

        assert.strictEqual(results.path(runRef("elsewhere", "community")), "results.elsewhere.group");
        assert.strictEqual(results.path("elsewhere"), "results.elsewhere");
    });
});

describe("finding a result", () => {
    it("hands back the result a finished run published", () => {
        const results = createResultsApi(REGISTRY);

        assert.strictEqual(results.get("degree"), DEGREE);
        assert.strictEqual(results.get(DEGREE), DEGREE);
    });

    it("hands back nothing for a run that has not finished or does not exist", () => {
        const results = createResultsApi(REGISTRY);

        assert.strictEqual(results.get("running"), undefined);
        assert.strictEqual(results.get("nowhere"), undefined);
    });

    it("answers whether a path would resolve", () => {
        const results = createResultsApi(REGISTRY);

        assert.isTrue(results.has("degree"));
        assert.isTrue(results.has("degree", "value"));
        assert.isTrue(results.has("degree", "min"), "a graph-level key resolves too");
        assert.isFalse(results.has("degree", "modularity"));
        assert.isFalse(results.has("running"));
        assert.isFalse(results.has("running", "value"));
    });
});

describe("what an expression editor completes from", () => {
    it("publishes one root per finished run, with the fields it carries", () => {
        const {roots} = createResultsApi(REGISTRY);

        assert.deepStrictEqual(
            roots.map((root) => root.runId),
            ["degree", "louvain", "facts"],
        );
        assert.strictEqual(roots[0].label, "Connections");
        assert.strictEqual(roots[0].fields, DEGREE.fields);
    });

    it("leaves out a run that has not published anything yet", () => {
        assert.isFalse(createResultsApi(REGISTRY).roots.some((root) => root.runId === "running"));
    });
});

describe("did you mean", () => {
    it("ranks the nearest names first", () => {
        assert.deepStrictEqual(nearestNames("valu", ["value", "rank", "percentile"]), [
            "value",
            "rank",
            "percentile",
        ]);
        assert.deepStrictEqual(nearestNames("PageRank", ["pagerank", "degree"], 1), ["pagerank"]);
    });

    it("returns nothing when nothing was asked for or nothing is on offer", () => {
        assert.deepStrictEqual(nearestNames("value", []), []);
        assert.deepStrictEqual(nearestNames("value", ["value"], 0), []);
    });

    it("suggests published paths for a results path that resolved to nothing", () => {
        const {roots} = createResultsApi(REGISTRY);
        const suggested = suggestResultPaths("results.degre.value", roots, 1);

        assert.deepStrictEqual(suggested, ["results.degree.value"]);
    });

    it("suggests nothing for a path that is not a results path", () => {
        const {roots} = createResultsApi(REGISTRY);

        assert.deepStrictEqual(suggestResultPaths("node.degree", roots), []);
    });

    it("suggests the run itself when a run published no fields", () => {
        const roots: readonly ResultRoot[] = [{ runId: "facts", label: "Facts", fields: [] }];

        assert.deepStrictEqual(suggestResultPaths("results.fact", roots, 1), ["results.facts"]);
    });
});

/**
 * WHAT GOES INTO AN EXPRESSION, as distinct from what goes into a selector's `path`.
 *
 * A run id carries its algorithm's name and ten of the catalogue's twenty-four algorithms are
 * hyphenated, while the expression grammar reads a bare hyphen as subtraction. A path pasted into
 * an expression unquoted is therefore a refused selector rather than a comparison -- and degree,
 * which has no hyphen, works right up until the metric changes.
 */
describe("addressing a result inside an expression", () => {
    it("quotes a hyphenated run id so the comparison is a comparison", () => {
        const api = createResultsApi({ entry: () => undefined, entries: () => [] });

        assert.strictEqual(api.term("shortest-path_3k1f", "value"), 'results."shortest-path_3k1f".value');
        assert.notInclude(api.term("shortest-path_3k1f", "value"), "results.shortest-path");
    });

    it("leaves a path that needs no quoting exactly as it is", () => {
        const api = createResultsApi({ entry: () => undefined, entries: () => [] });

        assert.strictEqual(api.term("degree", "value"), "results.degree.value");
    });

    it("names the same column its path verb names, so the two cannot drift", () => {
        const api = createResultsApi({ entry: () => undefined, entries: () => [] });

        assert.include(api.term("min-cut_2", "rank"), "rank");
        assert.strictEqual(api.term("min-cut_2", "rank"), 'results."min-cut_2".rank');
        assert.strictEqual(api.path("min-cut_2", "rank"), "results.min-cut_2.rank");
    });
});

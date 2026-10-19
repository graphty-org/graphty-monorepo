/**
 * @file A result's reading as a coded fact (`RunResult.readingFact()`), and the English sentence
 * the deprecated `reading()` words from it, unchanged from before the fact existed (#866).
 *
 * `reading-sentences.golden.json` holds what `reading()` returned for each case before the fact
 * was added.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import type { FieldDescriptor } from "../../../src/catalog/types";
import { createRunResult, type RunResultInit } from "../../../src/session/results/RunResult";
import type { ReadingOptions, RunResult } from "../../../src/session/results/types";
import type { Caveats } from "../../../src/session/runs/types";

const GOLDEN_PATH = new URL("reading-sentences.golden.json", import.meta.url);

const CAVEATS: Caveats = {
    exact: true,
    direction: "undirected",
    precision: "f64",
    method: "test",
    facts: [],
    notes: [],
};

function field(spec: Omit<FieldDescriptor, "path">): FieldDescriptor {
    return { ...spec, path: `results.$.${spec.name}` };
}

const LOUVAIN_FIELDS = BUILT_IN_ALGORITHMS.find((entry) => entry.key === "louvain")?.fields ?? [];

function result(init: Partial<RunResultInit> & Pick<RunResultInit, "shape" | "fields">): RunResult {
    return createRunResult({
        runId: "run",
        measured: { nodes: 0, edges: 0 },
        caveats: CAVEATS,
        durationMs: 1,
        ...init,
    });
}

function metric(values: readonly number[], options: { unit?: string; scope?: number } = {}): RunResult {
    return result({
        shape: "node-metric",
        fields: [
            field({
                name: "value",
                plainName: "Connections",
                technicalName: "degree",
                kind: "node",
                type: "number",
                ...(options.unit === undefined ? {} : { unit: options.unit }),
            }),
        ],
        measured: { nodes: options.scope ?? values.length, edges: 0 },
        nodes: values.map((value, index) => ({ id: `n${index}`, values: { value } })),
        labelOf: (id) => (id === "n0" ? "Alice" : undefined),
    });
}

const GROUP_FIELD = field({ name: "group", plainName: "Group", technicalName: "group", kind: "node", type: "integer" });

const CASES: Readonly<Record<string, () => RunResult>> = {
    metric: () => metric([9, 2, 1, 0.5]),
    "metric with unit, ties and unmeasured": () => metric([3, 0, 0, 0, 1, 1, 2, 0], { unit: "links", scope: 10 }),
    "metric one link": () => metric([1], { unit: "links" }),
    "metric fractional": () => metric([0.12345, 1234.5678, 2]),
    "metric empty": () => metric([]),
    "edge metric": () =>
        result({
            shape: "edge-metric",
            fields: [
                field({
                    name: "value",
                    plainName: "Bridging",
                    technicalName: "edge betweenness",
                    kind: "edge",
                    type: "number",
                }),
            ],
            measured: { nodes: 0, edges: 2 },
            edges: [
                { id: "a->b", values: { value: 4 } },
                { id: "b->c", values: { value: 1 } },
            ],
        }),
    "community scored": () =>
        result({
            shape: "community",
            fields: LOUVAIN_FIELDS,
            measured: { nodes: 3, edges: 2 },
            nodes: [
                { id: "a", values: { group: 0 } },
                { id: "b", values: { group: 0 } },
                { id: "c", values: { group: 1 } },
            ],
            graph: { modularity: 0.447 },
        }),
    "community unscored": () =>
        result({
            shape: "community",
            fields: [GROUP_FIELD],
            measured: { nodes: 1, edges: 0 },
            nodes: [{ id: "a", values: { group: 0 } }],
        }),
    "community empty": () => result({ shape: "community", fields: [GROUP_FIELD] }),
    path: () =>
        result({
            shape: "path",
            fields: [
                field({
                    name: "onPath",
                    plainName: "On route",
                    technicalName: "onPath",
                    kind: "node",
                    type: "boolean",
                }),
            ],
            measured: { nodes: 2, edges: 1 },
            graph: { hops: 1, cost: 2.5 },
        }),
    "path many hops": () => result({ shape: "path", fields: [], graph: { hops: 3 } }),
    "path none": () => result({ shape: "path", fields: [] }),
    "node set": () =>
        result({
            shape: "node-set",
            fields: [field({ name: "in", plainName: "In", technicalName: "in", kind: "node", type: "boolean" })],
            measured: { nodes: 3, edges: 0 },
            nodes: [
                { id: "a", values: { in: true } },
                { id: "b", values: { in: false } },
                { id: "c", values: { in: true } },
            ],
        }),
    "edge set one": () => result({ shape: "edge-set", fields: [], graph: { count: 1 } }),
    "node set none": () => result({ shape: "node-set", fields: [], graph: { count: 0 } }),
    pairs: () =>
        result({
            shape: "pair-list",
            fields: [],
            graph: {
                pairs: [
                    ["a", "b"],
                    ["b", "c"],
                ],
            },
        }),
    pair: () => result({ shape: "pair-list", fields: [], graph: { pairs: [["a", "b"]] } }),
    "no pairs": () => result({ shape: "pair-list", fields: [] }),
    series: () => result({ shape: "temporal", fields: [], graph: { steps: 5 } }),
    "series one": () => result({ shape: "temporal", fields: [], graph: { steps: 1 } }),
    "series empty": () => result({ shape: "temporal", fields: [] }),
    fact: () =>
        result({
            shape: "fact",
            fields: [],
            measured: { nodes: 4, edges: 0 },
            nodes: [{ id: "a", values: { value: 1 } }],
        }),
    "fact empty": () => result({ shape: "fact", fields: [] }),
};

const OPTIONS: Readonly<Record<string, ReadingOptions>> = {
    plain: { locale: "en-US" },
    technical: { audience: "technical", locale: "en-US" },
    german: { locale: "de-DE" },
};

describe("a result's reading", () => {
    it("words the deprecated sentence from its fact, as before (#866)", () => {
        const said: Record<string, string> = {};
        for (const [name, make] of Object.entries(CASES)) {
            for (const [optionName, options] of Object.entries(OPTIONS)) {
                said[`${name} / ${optionName}`] = make().reading(options);
            }
        }

        if (process.env.RECORD_READING_GOLDEN === "1") {
            writeFileSync(GOLDEN_PATH, `${JSON.stringify(said, null, 4)}\n`);
        }

        const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as Record<string, string>;
        assert.deepStrictEqual(said, golden);
    });
});

describe("readingFact()", () => {
    it("states a metric's figures, the leader by id and by label", () => {
        assert.deepStrictEqual(CASES["metric with unit, ties and unmeasured"]().readingFact(), {
            code: "reading.metric",
            params: {
                field: "value",
                leader: "n0",
                leaderLabel: "Alice",
                highest: 3,
                median: 0,
                lowest: 0,
                tiedAtLowest: 4,
                measured: 8,
                count: 10,
            },
        });
        assert.deepStrictEqual(CASES["metric empty"]().readingFact(), {
            code: "reading.metric-empty",
            params: { field: "value" },
        });
    });

    it("states a partition's groups, its modularity and the modularity's band id", () => {
        assert.deepStrictEqual(CASES["community scored"]().readingFact(), {
            code: "reading.groups",
            params: { groups: 2, largest: 2, measured: 3, modularity: 0.447, band: "clear" },
        });
        assert.deepStrictEqual(CASES["community unscored"]().readingFact(), {
            code: "reading.groups",
            params: { groups: 1, largest: 1, measured: 1, modularity: null, band: null },
        });
        assert.deepStrictEqual(CASES["community empty"]().readingFact(), { code: "reading.groups-empty", params: {} });
    });

    it("states a route, a set, pairs, a series and coverage", () => {
        assert.deepStrictEqual(CASES.path().readingFact(), { code: "reading.path", params: { hops: 1, cost: 2.5 } });
        assert.deepStrictEqual(CASES["path many hops"]().readingFact(), {
            code: "reading.path",
            params: { hops: 3, cost: null },
        });
        assert.deepStrictEqual(CASES["node set"]().readingFact(), {
            code: "reading.set",
            params: { count: 2, element: "node" },
        });
        assert.deepStrictEqual(CASES["edge set one"]().readingFact(), {
            code: "reading.set",
            params: { count: 1, element: "edge" },
        });
        assert.deepStrictEqual(CASES.pairs().readingFact(), { code: "reading.pairs", params: { count: 2 } });
        assert.deepStrictEqual(CASES["series empty"]().readingFact(), { code: "reading.series", params: { steps: 0 } });
        assert.deepStrictEqual(CASES.fact().readingFact(), {
            code: "reading.coverage",
            params: { measured: 0, count: 0 },
        });
    });

    it("is the same frozen fact on every read, and survives structuredClone", () => {
        const read = CASES.metric();
        const fact = read.readingFact();

        assert.strictEqual(read.readingFact(), fact);
        assert.isTrue(Object.isFrozen(fact));
        assert.deepStrictEqual(structuredClone(fact), fact);
    });
});

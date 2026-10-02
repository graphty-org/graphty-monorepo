/**
 * The id an unnamed run gets: the name its algorithm suggests, never a hash.
 *
 * `results.<id>.value` is what a reader sees in a style selector, so the id is the algorithm's
 * plain name (`degree`) or the name it suggests from the run's settings (`louvain_resolution_1_5`).
 * The same computation started again is the same run; a different computation that would take the
 * same name gets `_2`, `_3`, ... A name the caller passes with `as` still wins.
 */

import { afterEach, assert, describe, it } from "vitest";

import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../../src/catalog/registry";
import type { AlgorithmDescriptor, SuggestedName } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createRunsApi, RUN_ID_PATTERN, type SessionRunsApi } from "../../../src/session/runs";
import { assertRunId } from "../../../src/session/runs/runId";
import { CAVEATS, descriptor, ENGINE, FakeGraph, FakeQueue, spyExecutor } from "./harness";

const DEGREE = descriptor({
    options: [{ name: "weighted", plainName: "Weighted", type: "boolean", default: false }],
});

const LOUVAIN = descriptor({
    key: "louvain",
    plainName: "Communities",
    technicalName: "louvain",
    shape: "community",
    options: [
        { name: "resolution", plainName: "Resolution", type: "number", default: 1 },
        { name: "maxIterations", plainName: "Iterations", type: "integer", default: 100 },
    ],
});

const PAGERANK = descriptor({
    key: "pagerank",
    plainName: "Influence",
    technicalName: "pagerank",
    options: [{ name: "dampingFactor", plainName: "Damping", type: "number", default: 0.85 }],
});

const SHORTEST_PATH = descriptor({ key: "shortest-path", plainName: "Shortest route", shape: "path" });

const PLUGIN = descriptor({
    key: "acme-reach",
    plainName: "Acme reach",
    options: [{ name: "hops", plainName: "Hops", type: "integer", default: 2 }],
});

function harness(algorithms: readonly AlgorithmDescriptor[] = [DEGREE, LOUVAIN, PAGERANK, SHORTEST_PATH]): {
    runs: SessionRunsApi;
    queue: FakeQueue;
} {
    const graph = new FakeGraph(4);
    const queue = new FakeQueue();
    const runs = createRunsApi({
        queue,
        catalog: { algorithms: () => algorithms },
        resolveScope: graph.resolve,
        execute: spyExecutor().execute,
        engine: ENGINE,
        defaultCaveats: CAVEATS,
    });

    return { runs, queue };
}

function registerPlugin(suggestedName: (options: Readonly<Record<string, unknown>>) => SuggestedName | undefined): void {
    publishAlgorithmDescriptor({ descriptor: PLUGIN, namespace: "acme", type: PLUGIN.key, suggestedName });
}

afterEach(() => {
    clearRegisteredAlgorithmsForTesting();
});

describe("the id of an unnamed run", () => {
    it("is the plain algorithm name when the algorithm suggests nothing", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("degree").id, "degree");
    });

    it("writes a hyphenated algorithm key with underscores, so a selector can name it unquoted", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("shortest-path", {}).id, "shortest_path");
    });

    it("is the plain name while a built-in's named setting keeps its default", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("louvain").id, "louvain");
        assert.strictEqual(runs.start("pagerank").id, "pagerank");
    });

    it("names the setting a built-in suggests, once it differs from its default", () => {
        const { runs } = harness();
        const louvain = runs.start("louvain", { resolution: 1.5 });
        const pagerank = runs.start("pagerank", { dampingFactor: 0.9 });

        assert.strictEqual(louvain.id, "louvain_resolution_1_5");
        assert.strictEqual(louvain.label, "Communities (resolution 1.5)");
        assert.strictEqual(pagerank.id, "pagerank_damping_0_9");
        assert.strictEqual(pagerank.label, "Influence (damping 0.9)");
    });

    it("takes the id and label a registered algorithm suggests", () => {
        registerPlugin((options) => ({ id: `acme_reach_${String(options.hops)}`, label: `Reach in ${String(options.hops)} hops` }));
        const { runs } = harness([PLUGIN]);
        const run = runs.start("acme-reach", { hops: 3 });

        assert.strictEqual(run.id, "acme_reach_3");
        assert.strictEqual(run.label, "Reach in 3 hops");
        assert.isTrue(runs.isDerivedId(run.id));
    });

    it("refuses a suggested id a selector could not carry", () => {
        registerPlugin(() => ({ id: "Acme Reach", label: "Reach" }));
        const { runs } = harness([PLUGIN]);

        try {
            runs.start("acme-reach");
            assert.fail("a bad suggested id must be refused");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_BAD_COMMAND");
        }
    });

    it("lets a name the caller passes win over the suggestion", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("louvain", { resolution: 1.5 }, { as: "my_groups" }).id, "my_groups");
    });
});

describe("two runs that would take the same id", () => {
    it("are one run when they are the same computation", () => {
        const { runs } = harness();
        const first = runs.start("louvain", { resolution: 1.5 });

        assert.strictEqual(runs.start("louvain", { resolution: 1.5 }), first);
        assert.strictEqual(runs.list().length, 1);
    });

    it("count up from _2 when the computations differ", () => {
        const { runs } = harness();
        const whole = runs.start("degree", {}, { scope: "graph" });
        const largest = runs.start("degree", {}, { scope: "largest-component" });
        const sampled = runs.start("degree", {}, { scope: "graph", sample: 2 });

        assert.deepStrictEqual([whole.id, largest.id, sampled.id], ["degree", "degree_2", "degree_3"]);
        assert.strictEqual(runs.start("degree", {}, { scope: "largest-component" }), largest, "found again by what it is");
        for (const run of runs.list()) {
            assert.match(run.id, RUN_ID_PATTERN);
        }
    });

    it("count past an id the caller took by name", () => {
        const { runs } = harness();
        runs.start("degree", {}, { as: "degree", scope: "largest-component" });

        assert.strictEqual(runs.start("degree").id, "degree_2");
    });

    it("are separate runs when the setting the algorithm names differs", () => {
        const { runs } = harness();
        const one = runs.start("louvain");
        const other = runs.start("louvain", { resolution: 1.5 });

        assert.notStrictEqual(other, one);
        assert.deepStrictEqual(
            runs.list().map((run) => run.id),
            ["louvain", "louvain_resolution_1_5"],
        );
    });
});

describe("an id, once given", () => {
    it("survives a re-run with a setting the name does not carry", async () => {
        const { runs, queue } = harness();
        const first = runs.start("louvain", { resolution: 1.5 });
        await queue.drain();
        await first;

        const again = runs.start("louvain", { resolution: 1.5, maxIterations: 50 });
        await queue.drain();
        await again;

        assert.strictEqual(again, first);
        assert.strictEqual(first.id, "louvain_resolution_1_5", "a selector bound to the id keeps reading it");
        assert.strictEqual(first.params.maxIterations, 50);
    });

    it("from a file saved before readable ids still loads and does not collide", async () => {
        const { runs, queue } = harness();
        const old = runs.start("degree", {}, { as: assertRunId("degree_0bkzd1n0p2dnik") });
        await queue.drain();
        await old;

        assert.strictEqual(runs.get("degree_0bkzd1n0p2dnik"), old);
        assert.strictEqual(runs.start("degree", {}, { scope: "largest-component" }).id, "degree");
    });
});

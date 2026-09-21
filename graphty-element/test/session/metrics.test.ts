/**
 * @file What `session.catalog.metrics()` answers: which analysis a graph can support, what each
 * would cost, and which of them have already been run.
 *
 * The graph under test is the Les Miserables co-appearance network from the GEXF corpus, parsed
 * by the data source the element parses that format with. A real dataset rather than a fixture,
 * because every number in a metric listing comes off the graph's actual shape.
 */

import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { type Harness, loadGexfCorpus, makeSession } from "./helpers";

/** The corpus file every test here loads: 77 characters, 254 weighted co-appearances. */
const LES_MISERABLES = "lesmiserables.gexf";

/**
 * An executor that publishes a degree-shaped result, so a test can have a run to find.
 *
 * A session with no renderer has no algorithm of its own to call, which is why the executor is
 * handed in rather than found. What it computes does not matter here -- only that a run exists
 * and carries the algorithm key it was started under.
 * @param context - What the run handed the work.
 * @returns The outcome.
 */
function publishNothingMuch(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Connections",
                    technicalName: "degree",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 0, edges: 0 },
            graph: { normalization: "none" },
            nodes: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", notes: [] },
            durationMs: 1,
        }),
    });
}

/**
 * A session over the Les Miserables network.
 * @param directed - The direction policy the store is built with.
 * @returns The harness, loaded.
 */
async function lesMiserables(directed: boolean | "auto"): Promise<Harness> {
    const harness = makeSession({ directed, runs: { execute: publishNothingMuch } });
    await loadGexfCorpus(harness, LES_MISERABLES);

    return harness;
}

describe("the metrics a graph can support", () => {
    it("lists every algorithm the catalogue ships, in catalogue order", async () => {
        const harness = await lesMiserables("auto");

        const metrics = harness.session.catalog.metrics();
        const algorithms = harness.session.catalog.algorithms();

        assert.isAbove(algorithms.length, 0, "the catalogue ships algorithms to list");
        assert.deepStrictEqual(
            metrics.map((metric) => metric.key),
            algorithms.map((algorithm) => algorithm.key),
            "one entry per algorithm, in the order the catalogue declares them",
        );
        assert.deepStrictEqual(
            metrics.map((metric) => metric.plainName),
            algorithms.map((algorithm) => algorithm.plainName),
            "the names are the catalogue's rather than a second set written here",
        );
        harness.session.dispose();
    });

    it("quotes the same seconds the estimate behind a Run button would quote", async () => {
        const harness = await lesMiserables("auto");

        // ONE COST MODEL, CONSULTED TWICE. A listing that carried its own arithmetic could say
        // "about 2 s" beside a button whose own estimate refused the click, and nothing between
        // the two would notice.
        for (const metric of harness.session.catalog.metrics()) {
            const estimate = harness.session.estimate({ op: "algo.run", algorithm: metric.key });

            assert.strictEqual(metric.estimateSeconds, estimate.seconds, `${metric.key} seconds`);
            assert.strictEqual(metric.costClass, estimate.costClass, `${metric.key} cost class`);
            assert.strictEqual(metric.available, estimate.available, `${metric.key} availability`);
        }

        harness.session.dispose();
    });

    it("keeps a metric this graph cannot support in the list, and says why", async () => {
        // The store is told the graph is directed, so every algorithm whose catalogue entry
        // requires an undirected graph is unavailable on it.
        const harness = await lesMiserables(true);

        const metrics = harness.session.catalog.metrics();
        const refused = metrics.filter((metric) => !metric.available);

        assert.isAbove(refused.length, 0, "a directed graph cannot support every algorithm");

        for (const metric of refused) {
            assert.isString(metric.reason, `${metric.key} says why it is unavailable`);
            assert.isAbove((metric.reason ?? "").length, 0, `${metric.key}'s reason is a sentence`);
            assert.isTrue(
                metrics.some((candidate) => candidate.key === metric.key),
                "an unavailable metric is listed rather than dropped, so a card can explain itself",
            );
        }

        for (const metric of metrics.filter((candidate) => candidate.available)) {
            assert.isUndefined(metric.reason, `${metric.key} carries no reason while it is available`);
        }

        harness.session.dispose();
    });

    it("turns those same metrics available once the graph meets what they require", async () => {
        const directed = await lesMiserables(true);
        const undirected = await lesMiserables(false);

        const refusedWhenDirected = directed.session.catalog
            .metrics()
            .filter((metric) => !metric.available)
            .map((metric) => metric.key);
        const availableWhenUndirected = new Set(
            undirected.session.catalog
                .metrics()
                .filter((metric) => metric.available)
                .map((metric) => metric.key),
        );

        assert.isAbove(refusedWhenDirected.length, 0, "the directed reading refuses something");

        for (const key of refusedWhenDirected) {
            assert.isTrue(
                availableWhenUndirected.has(key),
                `${key} is refused on a directed graph because it needs an undirected one`,
            );
        }

        directed.session.dispose();
        undirected.session.dispose();
    });

    it("reports nothing as run before anything has run, and names the runs afterwards", async () => {
        const harness = await lesMiserables("auto");

        for (const metric of harness.session.catalog.metrics()) {
            assert.isFalse(metric.hasRun, `${metric.key} has not been run yet`);
            assert.deepStrictEqual(metric.runIds, [], `${metric.key} names no run yet`);
        }

        await harness.session.runs.start("degree", undefined, { as: "degree" });

        const afterwards = harness.session.catalog.metrics();
        const degree = afterwards.find((metric) => metric.key === "degree");

        assert.isDefined(degree);
        assert.isTrue(degree?.hasRun, "the metric that ran says so");
        assert.deepStrictEqual(degree?.runIds, ["degree"], "and names the run, which is how a panel offers the result");
        assert.isTrue(
            afterwards.every((metric) => metric.key === "degree" || !metric.hasRun),
            "no other metric is marked as run",
        );
        harness.session.dispose();
    });

    it("answers about this graph, while the static tables stay the same data for every session", async () => {
        const loaded = await lesMiserables("auto");
        const empty = makeSession();

        // The tables say what the element CAN do and do not depend on a graph, so they are the
        // same arrays for both sessions. `metrics()` says what it can do to THIS graph, so it is
        // not, and the two sessions' answers differ in the numbers.
        assert.strictEqual(loaded.session.catalog.algorithms(), empty.session.catalog.algorithms());
        assert.strictEqual(loaded.session.catalog.layouts(), empty.session.catalog.layouts());
        assert.strictEqual(loaded.session.catalog.formats(), empty.session.catalog.formats());
        assert.strictEqual(loaded.session.catalog.palettes(), empty.session.catalog.palettes());
        assert.strictEqual(loaded.session.catalog.scales(), empty.session.catalog.scales());

        const onLoaded = loaded.session.catalog.metrics();
        const onEmpty = empty.session.catalog.metrics();

        assert.strictEqual(onLoaded.length, onEmpty.length, "both list every algorithm");
        assert.isTrue(
            onLoaded.some((metric, index) => metric.estimateSeconds !== onEmpty[index].estimateSeconds),
            "a graph with 77 nodes in it does not cost what an empty one costs",
        );

        loaded.session.dispose();
        empty.session.dispose();
    });

    it("stays plain enough to serialise, which is what a worker and a saved document need", async () => {
        const harness = await lesMiserables("auto");

        const metrics = harness.session.catalog.metrics();
        const round = JSON.parse(JSON.stringify(metrics)) as { key: string; hasRun: boolean }[];

        assert.strictEqual(round.length, metrics.length);
        assert.strictEqual(round[0].key, metrics[0].key);
        assert.strictEqual(round[0].hasRun, metrics[0].hasRun);
        harness.session.dispose();
    });
});

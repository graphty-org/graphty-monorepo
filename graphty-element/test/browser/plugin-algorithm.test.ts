/**
 * @file A third party's algorithm, and whether the element treats it as a real one.
 *
 * WHAT WAS WRONG. `Algorithm.register` got a class registered and callable, and that was the end
 * of it. The run machinery resolves a key through the catalogue; the catalogue was a frozen table
 * of the element's own twenty; so a key nothing in that table carried was refused. A plugin could
 * therefore compute something and nothing could ask for it -- no progress, no cancellation, no
 * cost estimate before the click, no ranking, no histogram, no summary, no plain-language
 * reading, and no picture derived from the result's shape. Every capability the run model exists
 * to provide was available to the built-ins and to nobody else. A plugin's only route was to
 * scribble on node records and hope a style layer read them.
 *
 * WHAT DECIDES IT NOW. A class that declares a `descriptor` is published to the catalogue when it
 * registers, so it resolves by key like any other algorithm. A class that declares none is
 * exactly as capable as it was before -- registered, callable through the 1.10 address, invisible
 * to the catalogue -- which is the trade its author made by not declaring one. Both are asserted
 * here, because "the plugin path still works" is half of what this change must not break.
 *
 * The assertions below are about CAPABILITY, not about arithmetic: what the plugin computes is
 * two lines of counting, and what matters is that the element carries it through the same
 * machinery it carries its own.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Algorithm } from "../../src/algorithms/Algorithm";
import { DeclaredAlgorithm } from "../../src/algorithms/results/DeclaredAlgorithm";
import type { AlgorithmOutput, AlgorithmRunContext } from "../../src/algorithms/results/types";
import type { AlgorithmDescriptor } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";

/** Four nodes and three edges, so a per-node count has more than one answer. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** A line with one chord, giving degrees 2, 2, 1, 1. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "a", dst: "d" },
];

/**
 * What a plugin publishes about itself.
 *
 * The `shape` is the load-bearing field: field NAMES are fixed by the shape rather than by the
 * algorithm, which is what lets a consumer read `results.<runId>.value` on ANY node metric
 * without opening the catalogue first. Declaring "node-metric" is therefore a promise about the
 * names below, not a label.
 */
const COUNTING_DESCRIPTOR: AlgorithmDescriptor = {
    key: "neighbour-count",
    plainName: "Neighbours",
    technicalName: "neighbour count",
    description: "How many edges touch each node.",
    category: "centrality",
    shape: "node-metric",
    fields: [
        {
            name: "value",
            plainName: "Neighbours",
            technicalName: "neighbour count",
            kind: "node",
            type: "integer",
            path: "results.$.value",
        },
    ],
    options: [],
    costClass: "instant",
    complexity: "O(n + m)",
};

/** A plugin that publishes a result, which is what declaring a descriptor buys. */
class NeighbourCount extends DeclaredAlgorithm {
    static override type = "neighbour-count";

    static override namespace = "test-plugin";

    static descriptor = COUNTING_DESCRIPTOR;

    /**
     * Count the edges touching each node.
     * @param context - What the element gave the run.
     * @returns The per-node counts.
     */
    override compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const counts = new Map<string, number>();

        for (const node of this.graph.getNodes()) {
            counts.set(String(node.id), 0);
        }

        for (const edge of this.graph.getDataManager().edges.values()) {
            counts.set(String(edge.srcId), (counts.get(String(edge.srcId)) ?? 0) + 1);
            counts.set(String(edge.dstId), (counts.get(String(edge.dstId)) ?? 0) + 1);
        }

        context.report({ completed: counts.size, total: counts.size });

        return Promise.resolve({
            shape: "node-metric",
            fields: [{ name: "value", kind: "node", type: "integer" }],
            nodes: [...counts].map(([id, value]) => ({ id, values: { value } })),
            caveats: {
                exact: true,
                seed: null,
                direction: "as-loaded",
                weight: null,
                precision: "f64",
                method: "neighbour count",
                notes: [],
            },
        });
    }
}

/** A plugin that declares nothing, which must stay exactly as capable as it was. */
class SilentMarker extends Algorithm {
    static override type = "silent-marker";

    static override namespace = "test-plugin";

    /**
     * Write one attribute onto every node, which is all an undeclared plugin can do.
     * @param graph - The graph to mark.
     */
    override run(graph: Graph): Promise<void> {
        for (const node of graph.getNodes()) {
            (node.data as Record<string, unknown>).marked = true;
        }

        return Promise.resolve();
    }
}

Algorithm.register(NeighbourCount);
Algorithm.register(SilentMarker);

describe("a third party's algorithm", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    describe("when it declares a catalogue descriptor", () => {
        it("appears in the catalogue beside the element's own", () => {
            const keys = graph.getSession().catalog.algorithms().map((entry) => entry.key);

            assert.include(keys, "neighbour-count", "a consumer listing what it can run finds it");
            assert.include(keys, "degree", "and the element's own are still there");
        });

        it("starts as a run, addressed by its key", async () => {
            const run = graph.getSession().runs.start("neighbour-count");

            assert.strictEqual(run.algorithm, "neighbour-count");

            const result = await run;

            assert.strictEqual(run.status, "succeeded");
            assert.strictEqual(result.shape, "node-metric");
        });

        it("publishes a result the element can read like any other", async () => {
            const result = await graph.getSession().runs.start("neighbour-count");
            const summary = result.summary();

            // Degrees are 2, 2, 1, 1 over the four nodes above.
            assert.strictEqual(summary.measured, NODES.length);
            assert.strictEqual(summary.max, 2);
            assert.strictEqual(summary.min, 1);
            assert.deepStrictEqual(
                result.ranking("value").map((entry) => entry.value),
                [2, 2, 1, 1],
            );
        });

        it("gets the statistics and the sentence the element writes for every result", async () => {
            const result = await graph.getSession().runs.start("neighbour-count");

            assert.isNotEmpty(result.histogram("value").bins, "a distribution, without the plugin drawing one");
            assert.isNotEmpty(result.reading(), "and a sentence, from the shape it declared");
        });

        it("can be painted from, because the element derives the picture from the shape", async () => {
            const session = graph.getSession();
            const run = session.runs.start("neighbour-count");
            await run;

            const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

            assert.isDefined(session.styles.get(layer.id));
            assert.isNotEmpty(session.styles.legend(), "and the legend explains what it painted");
        });

        it("can be asked what it would cost before anybody clicks", () => {
            const estimate = graph.getSession().estimate({ op: "algo.run", algorithm: "neighbour-count" });

            assert.isNumber(estimate.seconds);
        });
    });

    describe("when it declares none", () => {
        it("stays out of the catalogue", () => {
            const keys = graph.getSession().catalog.algorithms().map((entry) => entry.key);

            assert.notInclude(keys, "silent-marker");
        });

        it("still runs through the 1.10 address, which is the trade its author made", async () => {
            await graph.runAlgorithm("test-plugin", "silent-marker");
            await graph.operationQueue.waitForCompletion();

            for (const node of graph.getNodes()) {
                assert.isTrue((node.data as Record<string, unknown>).marked === true);
            }
        });
    });
});

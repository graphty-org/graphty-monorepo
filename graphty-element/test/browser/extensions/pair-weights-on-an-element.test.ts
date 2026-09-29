/**
 * @file The deprecated `pairWeights` helper, read by a plugin layout running inside a real element.
 *
 * A `SimpleLayoutEngine` subclass calls `this.pairWeights(this.edges)` and gets, per ordered pair
 * of nodes, the sum of the weights of every edge between them. The helper reaches the element's
 * graph store through each edge's parent graph and reads the weight at the edge's `index`, so what
 * this file pins is that a real edge still gets there: a broken path answers null rather than
 * throwing, and only a real element can tell a broken path from a graph with no weights.
 */
import { afterEach, assert, describe, it } from "vitest";

import { type AuthoredLayoutDescriptor, type Edge, LayoutEngine, SimpleLayoutEngine } from "../../../extend";
import { Graph } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";

/** A plugin layout that records what the helper told it on its one pass. */
class WeightReadingLayout extends SimpleLayoutEngine {
    static type = "test-pair-weights";
    static maxDimensions = 3;
    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-pair-weights",
        plainName: "Pair weights",
        technicalName: "Pair weight reader",
        description: "Records the summed weight of each ordered pair of nodes.",
        family: "special",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-pair-weights",
        options: [],
    };

    /** The helper's answer, by pair of node ids. */
    seen: Record<string, number> | null = null;

    /** Read the weights, then put every node at the origin. */
    doLayout(): void {
        const edges = [...this.edges] as Edge[];
        const weights = this.pairWeights(edges);
        this.seen = null;
        if (weights !== null) {
            this.seen = {};
            for (const e of edges) {
                this.seen[`${e.srcId}->${e.dstId}`] = weights.get(this.pairWeightKey(e.srcId, e.dstId)) ?? Number.NaN;
            }
        }

        this.positions = {};
        for (const node of this.nodes) {
            this.positions[node.id] = [0, 0, 0];
        }
    }
}

LayoutEngine.register(WeightReadingLayout);

describe("the deprecated pairWeights helper inside a real element", () => {
    let container: HTMLDivElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    /**
     * Load the edges into a fresh element and lay it out with the plugin.
     * @param edges - the edge records to load
     * @returns what the plugin's helper answered
     */
    async function weightsSeen(
        edges: readonly { src: string; dst: string; weight?: number }[],
    ): Promise<Record<string, number> | null> {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([...edges]);
        await graph.setLayout("test-pair-weights");
        await operationQueueOf(graph).waitForCompletion();

        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, WeightReadingLayout, "the element built the plugin's engine");
        return engine.seen;
    }

    it("sums the weights of parallel edges between two nodes", async () => {
        const seen = await weightsSeen([
            { src: "a", dst: "b", weight: 2 },
            { src: "a", dst: "b", weight: 3 },
            { src: "b", dst: "c", weight: 4 },
        ]);

        assert.deepStrictEqual(seen, { "a->b": 5, "b->c": 4 });
    });

    it("answers null when no edge carries a weight", async () => {
        const seen = await weightsSeen([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);

        assert.isNull(seen);
    });
});

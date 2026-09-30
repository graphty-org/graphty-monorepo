/**
 * @file `Algorithm.algorithmGraph()` and `AlgorithmGraphView`, deprecated in graphty-element 3.1
 * and removed in 4.0: a plugin written against 3.0.0 keeps compiling against `./extend` and keeps
 * reading the same graph it read then.
 */

import { assert, describe, it } from "vitest";

import {
    type AlgorithmGraphMode,
    type AlgorithmGraphView,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    metricFieldSpecs,
} from "../../../extend";
import { detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import { createMockGraph } from "../../helpers/mockGraph";

/** A helper of the plugin's own that names the element's input type, as 3.0.0 allowed. */
function neighbourCounts(graph: AlgorithmGraphView): Map<string | number, number> {
    return new Map([...graph.nodes()].map((node) => [node.id, [...graph.neighbors(node.id)].length]));
}

/** A 3.0.0-style plugin: it reads its input through `this.algorithmGraph()` in `compute`. */
class NeighbourCount extends DeclaredAlgorithm {
    static override namespace = "acme";

    static override type = "neighbour-count";

    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        context.signal.throwIfAborted();
        const counts = neighbourCounts(this.algorithmGraph("undirected"));

        return Promise.resolve({
            shape: "node-metric",
            fields: metricFieldSpecs("node", "integer"),
            nodes: [...counts].map(([id, value]) => ({ id, values: { value } })),
            caveats: declaredCaveats({ direction: "undirected", method: "neighbour count" }),
        });
    }

    /** Expose the protected accessor to the assertions below. */
    read(mode: AlgorithmGraphMode): AlgorithmGraphView {
        return this.algorithmGraph(mode);
    }
}

/** A triangle, declared one way round: A -> B -> C -> A. */
async function triangle(): Promise<Graph> {
    return createMockGraph({
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
            { srcId: "A", dstId: "B", value: 2 },
            { srcId: "B", dstId: "C", value: 3 },
            { srcId: "C", dstId: "A", value: 4 },
        ],
    });
}

describe("deprecated Algorithm.algorithmGraph()", () => {
    it("runs a plugin written against 3.0.0", async () => {
        const output = await new NeighbourCount(await triangle()).compute(detachedRunContext());

        assert.deepStrictEqual(output?.nodes, [
            { id: "A", values: { value: 2 } },
            { id: "B", values: { value: 2 } },
            { id: "C", values: { value: 2 } },
        ]);
    });

    it("undirected keeps the reader's edge count and the record weights", async () => {
        const built = new NeighbourCount(await triangle()).read("undirected");

        assert.isFalse(built.isDirected);
        assert.strictEqual(built.nodeCount, 3);
        assert.strictEqual(built.totalEdgeCount, 3);
        assert.strictEqual(built.getEdge("B", "A")?.weight, 2);
        assert.strictEqual(built.getEdge("C", "A")?.weight, 4);
    });

    it("undirected collapses a reciprocal pair into one edge", async () => {
        const graph = await createMockGraph({
            nodes: [{ id: "A" }, { id: "B" }],
            edges: [
                { srcId: "A", dstId: "B" },
                { srcId: "B", dstId: "A" },
            ],
        });
        const built = new NeighbourCount(graph).read("undirected");

        assert.strictEqual(built.totalEdgeCount, 1);
        assert.strictEqual(built.degree("A"), 1);
    });

    it("directed keeps the declared orientation", async () => {
        const built = new NeighbourCount(await triangle()).read("directed");

        assert.isTrue(built.isDirected);
        assert.strictEqual(built.totalEdgeCount, 3);
        assert.isTrue(built.hasEdge("A", "B"));
        assert.isFalse(built.hasEdge("B", "A"));
        assert.strictEqual(built.outDegree("A"), 1);
        assert.strictEqual(built.inDegree("A"), 1);
    });

    it("includes an edge whose endpoint never arrived as a node record", async () => {
        const graph = await createMockGraph({ nodes: [{ id: "A" }], edges: [{ srcId: "A", dstId: "ghost" }] });
        const built = new NeighbourCount(graph).read("undirected");

        assert.strictEqual(built.nodeCount, 2);
        assert.isTrue(built.hasNode("ghost"));
    });
});

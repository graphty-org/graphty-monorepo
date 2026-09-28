import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { detachedRunContext } from "../../../src/algorithms/results";
import { GraphtyError } from "../../../src/errors";
import { createMockGraph } from "../../helpers/mockGraph";

/**
 * Undirected-style data: a path declared A-B, C-B, so no directed path runs from A to C, and the
 * first and last nodes in insertion order are A and C.
 */
const UNDIRECTED = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
    edges: [
        { srcId: "A", dstId: "B" },
        { srcId: "C", dstId: "B" },
    ],
};

describe("MaxFlowAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'max-flow'", () => {
            const MaxFlowClass = Algorithm.getClass("graphty", "max-flow");
            assert.ok(MaxFlowClass);
            assert.strictEqual(MaxFlowClass, MaxFlowAlgorithm);
            assert.strictEqual(MaxFlowClass.namespace, "graphty");
            assert.strictEqual(MaxFlowClass.type, "max-flow");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(MaxFlowAlgorithm.namespace, "graphty");
            assert.strictEqual(MaxFlowAlgorithm.type, "max-flow");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "max-flow");
            assert.strictEqual(AlgClass, MaxFlowAlgorithm);
        });
    });

    describe("Configuration", () => {
        it("can be configured with source and sink", () => {
            const algo = new MaxFlowAlgorithm({} as never);
            assert.ok(typeof algo.configure === "function");
        });
    });

    describe("Source and sink", () => {
        for (const option of ["source", "sink"] as const) {
            it(`rejects a ${option} that is not in the graph with E_OPTION_RANGE`, async () => {
                const graph = await createMockGraph(UNDIRECTED);
                const algo = new MaxFlowAlgorithm(graph, { source: "A", sink: "B", [option]: "nope" });

                const error = await algo.compute(detachedRunContext()).then(
                    () => undefined,
                    (e: unknown) => e,
                );

                assert.instanceOf(error, GraphtyError);
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.strictEqual(error.details.option, option);
                assert.strictEqual(error.details.value, "nope");
            });
        }

        it("rejects a source and sink that are one node with E_OPTION_RANGE", async () => {
            const graph = await createMockGraph(UNDIRECTED);
            const algo = new MaxFlowAlgorithm(graph, { source: "B", sink: "B" });

            const error = await algo.compute(detachedRunContext()).then(
                () => undefined,
                (e: unknown) => e,
            );

            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_OPTION_RANGE");
            assert.strictEqual(error.details.option, "sink");
        });

        it("has nothing to measure on a single node with a self-loop", async () => {
            const graph = await createMockGraph({ nodes: [{ id: "A" }], edges: [{ srcId: "A", dstId: "A" }] });

            assert.isNull(await new MaxFlowAlgorithm(graph).compute(detachedRunContext()));
        });

        it("says when the ends were chosen automatically and when no flow path exists", async () => {
            const graph = await createMockGraph(UNDIRECTED);
            const output = await new MaxFlowAlgorithm(graph).compute(detachedRunContext());

            assert.ok(output);
            assert.strictEqual(output.graph?.maxFlow, 0);
            const notes = output.caveats.notes.join("\n");
            assert.match(notes, /chosen automatically/);
            assert.match(notes, /no directed path from A to C/i);
        });

        it("adds neither note when both ends are given and flow exists", async () => {
            const graph = await createMockGraph(UNDIRECTED);
            const output = await new MaxFlowAlgorithm(graph, { source: "A", sink: "B" }).compute(detachedRunContext());

            assert.ok(output);
            assert.strictEqual(output.graph?.maxFlow, 1);
            const notes = output.caveats.notes.join("\n");
            assert.notMatch(notes, /chosen automatically/);
            assert.notMatch(notes, /no directed path/i);
        });
    });

    describe("Capacity", () => {
        it("adds up parallel capacities, a negative one included, before the flow runs", async () => {
            const graph = await createMockGraph({
                nodes: [{ id: "s" }, { id: "t" }],
                edges: [
                    { srcId: "s", dstId: "t", capacity: 5 },
                    { srcId: "s", dstId: "t", capacity: -3 },
                ],
            });
            const output = await new MaxFlowAlgorithm(graph, { source: "s", sink: "t" }).compute(detachedRunContext());

            assert.ok(output);
            assert.strictEqual(output.graph?.maxFlow, 2);
            for (const edge of output.edges ?? []) {
                assert.deepStrictEqual(edge.values, { value: 2, capacity: 2, utilization: 1 });
            }
        });

        it("counts a lone negative capacity as none", async () => {
            const graph = await createMockGraph({
                nodes: [{ id: "s" }, { id: "t" }],
                edges: [{ srcId: "s", dstId: "t", capacity: -3 }],
            });
            const output = await new MaxFlowAlgorithm(graph, { source: "s", sink: "t" }).compute(detachedRunContext());

            assert.ok(output);
            assert.strictEqual(output.graph?.maxFlow, 0);
            assert.deepStrictEqual(output.edges?.[0].values, { value: 0, capacity: 0, utilization: 0 });
        });
    });
});

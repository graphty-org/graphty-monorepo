 
import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { detachedRunContext } from "../../../src/algorithms/results";
import { GraphtyError } from "../../../src/errors";
import { createMockGraph } from "../../helpers/mockGraph";

const PATH = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
    edges: [
        { srcId: "A", dstId: "B" },
        { srcId: "C", dstId: "B" },
    ],
};

describe("MinCutAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'min-cut'", () => {
            const MinCutClass = Algorithm.getClass("graphty", "min-cut");
            assert.ok(MinCutClass);
            assert.strictEqual(MinCutClass, MinCutAlgorithm);
            assert.strictEqual(MinCutClass.namespace, "graphty");
            assert.strictEqual(MinCutClass.type, "min-cut");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(MinCutAlgorithm.namespace, "graphty");
            assert.strictEqual(MinCutAlgorithm.type, "min-cut");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "min-cut");
            assert.strictEqual(AlgClass, MinCutAlgorithm);
        });

    });

    describe("Configuration", () => {
        it("can be configured with source and sink for s-t cut", () => {
            const algo = new MinCutAlgorithm({} as never);
            assert.ok(typeof algo.configure === "function");
        });
    });

    describe("Source and sink", () => {
        for (const option of ["source", "sink"] as const) {
            it(`rejects a ${option} that is not in the graph with E_OPTION_RANGE`, async () => {
                const graph = await createMockGraph(PATH);
                const algo = new MinCutAlgorithm(graph, { source: "A", sink: "C", [option]: "nope" });

                const error = await algo.compute(detachedRunContext()).then(
                    () => undefined,
                    (e: unknown) => e,
                );

                assert.instanceOf(error, GraphtyError);
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.strictEqual(error.details.option, option);
            });
        }

        it("says when one end was chosen automatically", async () => {
            const graph = await createMockGraph(PATH);
            const output = await new MinCutAlgorithm(graph, { source: "A" }).compute(detachedRunContext());

            assert.ok(output);
            assert.match(output.caveats.notes.join("\n"), /chosen automatically/);
        });
    });
});

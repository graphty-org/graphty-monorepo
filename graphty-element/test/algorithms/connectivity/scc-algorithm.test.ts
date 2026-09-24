import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";

describe("StronglyConnectedComponentsAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'scc'", () => {
            const SCCClass = Algorithm.getClass("graphty", "scc");
            assert.ok(SCCClass);
            assert.strictEqual(SCCClass, StronglyConnectedComponentsAlgorithm);
            assert.strictEqual(SCCClass.namespace, "graphty");
            assert.strictEqual(SCCClass.type, "scc");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(StronglyConnectedComponentsAlgorithm.namespace, "graphty");
            assert.strictEqual(StronglyConnectedComponentsAlgorithm.type, "scc");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "scc");
            assert.strictEqual(AlgClass, StronglyConnectedComponentsAlgorithm);
        });

    });
});

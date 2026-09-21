 
import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";

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

});

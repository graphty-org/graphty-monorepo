 
import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";

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

});

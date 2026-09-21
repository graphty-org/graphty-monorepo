import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";

describe("LabelPropagationAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'label-propagation'", () => {
            const LabelPropagationClass = Algorithm.getClass("graphty", "label-propagation");
            assert.ok(LabelPropagationClass);
            assert.strictEqual(LabelPropagationClass, LabelPropagationAlgorithm);
            assert.strictEqual(LabelPropagationClass.namespace, "graphty");
            assert.strictEqual(LabelPropagationClass.type, "label-propagation");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(LabelPropagationAlgorithm.namespace, "graphty");
            assert.strictEqual(LabelPropagationAlgorithm.type, "label-propagation");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "label-propagation");
            assert.strictEqual(AlgClass, LabelPropagationAlgorithm);
        });

    });
});

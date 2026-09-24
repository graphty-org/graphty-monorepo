import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";

describe("LeidenAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'leiden'", () => {
            const LeidenClass = Algorithm.getClass("graphty", "leiden");
            assert.ok(LeidenClass);
            assert.strictEqual(LeidenClass, LeidenAlgorithm);
            assert.strictEqual(LeidenClass.namespace, "graphty");
            assert.strictEqual(LeidenClass.type, "leiden");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(LeidenAlgorithm.namespace, "graphty");
            assert.strictEqual(LeidenAlgorithm.type, "leiden");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "leiden");
            assert.strictEqual(AlgClass, LeidenAlgorithm);
        });

    });
});

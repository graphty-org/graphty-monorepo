import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";

describe("KruskalAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'kruskal'", () => {
            const KruskalClass = Algorithm.getClass("graphty", "kruskal");
            assert.ok(KruskalClass);
            assert.strictEqual(KruskalClass, KruskalAlgorithm);
            assert.strictEqual(KruskalClass.namespace, "graphty");
            assert.strictEqual(KruskalClass.type, "kruskal");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(KruskalAlgorithm.namespace, "graphty");
            assert.strictEqual(KruskalAlgorithm.type, "kruskal");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "kruskal");
            assert.strictEqual(AlgClass, KruskalAlgorithm);
        });

    });

});

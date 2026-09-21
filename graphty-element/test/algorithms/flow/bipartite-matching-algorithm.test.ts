import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";

describe("BipartiteMatchingAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'bipartite-matching'", () => {
            const BipartiteClass = Algorithm.getClass("graphty", "bipartite-matching");
            assert.ok(BipartiteClass);
            assert.strictEqual(BipartiteClass, BipartiteMatchingAlgorithm);
            assert.strictEqual(BipartiteClass.namespace, "graphty");
            assert.strictEqual(BipartiteClass.type, "bipartite-matching");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(BipartiteMatchingAlgorithm.namespace, "graphty");
            assert.strictEqual(BipartiteMatchingAlgorithm.type, "bipartite-matching");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "bipartite-matching");
            assert.strictEqual(AlgClass, BipartiteMatchingAlgorithm);
        });

    });

});

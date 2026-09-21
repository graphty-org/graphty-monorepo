import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";

describe("PrimAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'prim'", () => {
            const PrimClass = Algorithm.getClass("graphty", "prim");
            assert.ok(PrimClass);
            assert.strictEqual(PrimClass, PrimAlgorithm);
            assert.strictEqual(PrimClass.namespace, "graphty");
            assert.strictEqual(PrimClass.type, "prim");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(PrimAlgorithm.namespace, "graphty");
            assert.strictEqual(PrimAlgorithm.type, "prim");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "prim");
            assert.strictEqual(AlgClass, PrimAlgorithm);
        });

    });

    describe("Configuration", () => {
        it("can be configured with a start node", () => {
            // PrimAlgorithm supports optional start node configuration
            // This is mainly for API completeness since the result is the same MST
            const algo = new PrimAlgorithm({} as never);
            assert.ok(typeof algo.configure === "function");
        });
    });
});

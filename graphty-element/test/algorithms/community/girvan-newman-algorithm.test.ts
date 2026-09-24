import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
// Import will be created in implementation
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";

describe("GirvanNewmanAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'girvan-newman'", () => {
            const GirvanNewmanClass = Algorithm.getClass("graphty", "girvan-newman");
            assert.ok(GirvanNewmanClass);
            assert.strictEqual(GirvanNewmanClass, GirvanNewmanAlgorithm);
            assert.strictEqual(GirvanNewmanClass.namespace, "graphty");
            assert.strictEqual(GirvanNewmanClass.type, "girvan-newman");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(GirvanNewmanAlgorithm.namespace, "graphty");
            assert.strictEqual(GirvanNewmanAlgorithm.type, "girvan-newman");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "girvan-newman");
            assert.strictEqual(AlgClass, GirvanNewmanAlgorithm);
        });

    });
});

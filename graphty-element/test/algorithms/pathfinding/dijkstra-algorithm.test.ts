import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";

describe("DijkstraAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'dijkstra'", () => {
            const DijkstraClass = Algorithm.getClass("graphty", "dijkstra");
            assert.ok(DijkstraClass);
            assert.strictEqual(DijkstraClass, DijkstraAlgorithm);
            assert.strictEqual(DijkstraClass.namespace, "graphty");
            assert.strictEqual(DijkstraClass.type, "dijkstra");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(DijkstraAlgorithm.namespace, "graphty");
            assert.strictEqual(DijkstraAlgorithm.type, "dijkstra");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "dijkstra");
            assert.strictEqual(AlgClass, DijkstraAlgorithm);
        });

    });

});

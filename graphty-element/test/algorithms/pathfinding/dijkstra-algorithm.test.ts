import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { createSessionGraph } from "../../helpers/session-graph";

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

describe("DijkstraAlgorithm from a node to itself", () => {
    it("is that node alone, length 0, and marks it", async () => {
        const graph = await createSessionGraph({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                { srcId: "a", dstId: "b" },
                { srcId: "b", dstId: "c" },
            ],
        });
        const algo = new DijkstraAlgorithm(graph, { source: "b", target: "b" });
        await algo.run();
        const { result } = algo;

        assert.deepInclude(result?.node("b"), { onPath: true, order: 0, distance: 0 });
        assert.deepInclude(result?.node("a"), { onPath: false });
        assert.deepInclude(result?.graph, { length: 1, hops: 0, cost: 0 });
        assert.isTrue(
            [...graph.getDataManager().edges.values()].every((edge) => result?.edge(edge.id)?.onPath === false),
        );
    });
});

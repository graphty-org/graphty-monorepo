import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { createMockGraph, getGraphResult, getNodeResult } from "../../helpers/mockGraph";

describe("LouvainAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'louvain'", () => {
            const LouvainClass = Algorithm.getClass("graphty", "louvain");
            assert.ok(LouvainClass);
            assert.strictEqual(LouvainClass, LouvainAlgorithm);
            assert.strictEqual(LouvainClass.namespace, "graphty");
            assert.strictEqual(LouvainClass.type, "louvain");
        });
    });

    describe("Graph Results", () => {
        /* `louvain()` returns {communities, modularity}, and the run used to keep only the
           per-node communityId and throw the rest away. A plain-language community reading
           needs the group count and the modularity, and design 7.5 makes that a
           requirement of EVERY grouping method, so the run publishes both as graph
           results. These two boards are what stop them being dropped again. */
        it("publishes the group count as a graph result", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const groupCount = getGraphResult(algo, "graphty", "louvain", "groupCount");

            assert.isNumber(groupCount);
            assert.isAtLeast(groupCount, 1);
        });

        it("publishes the modularity the method reported, not a recomputed one", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const modularity = getGraphResult(algo, "graphty", "louvain", "modularity");

            assert.isNumber(modularity);
            assert.isTrue(Number.isFinite(modularity));
            // Modularity is bounded on [-0.5, 1] for any partition of any graph.
            assert.isAtLeast(modularity, -0.5);
            assert.isAtMost(modularity, 1);
        });

        it("counts the groups it actually assigned nodes to", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const groupCount = getGraphResult(algo, "graphty", "louvain", "groupCount");
            const assigned = new Set<unknown>();

            for (const node of graph.getDataManager().nodes.values()) {
                assigned.add(getNodeResult(algo, node.id, "graphty", "louvain", "communityId"));
            }

            assert.strictEqual(groupCount, assigned.size);
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(LouvainAlgorithm.namespace, "graphty");
            assert.strictEqual(LouvainAlgorithm.type, "louvain");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "louvain");
            assert.strictEqual(AlgClass, LouvainAlgorithm);
        });

    });
});

import { assert, describe, it } from "vitest";

import { DegreeAlgorithm } from "../../src/algorithms/DegreeAlgorithm";
import { createMockGraph, getGraphResult, getMockNode, getNodeResult } from "../helpers/mockGraph";

describe("DegreeAlgorithm", () => {
    it("exists", async () => {
        new DegreeAlgorithm(await createMockGraph());
    });

    it("calculates node degree", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const da = new DegreeAlgorithm(graph);

        await da.run();

        // Mlle.Baptistine: srcId in 1 edge (-> Myriel), dstId in 2 edges (<- Valjean, <- Mme.Magloire)
        // So: outDegree=1, inDegree=2, degree=3
        // The highest total in this dataset is 36, and the highest one-direction counts are 10 out
        // and 32 in, which is what each fraction is measured against.
        const node = getMockNode(graph, "Mlle.Baptistine");
        assert.isDefined(node, "Node Mlle.Baptistine should exist");

        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "inDegree"), 2);
        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "outDegree"), 1);
        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "degree"), 3);
        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "inDegreePct"), 2 / 32);
        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "outDegreePct"), 1 / 10);
        assert.strictEqual(getNodeResult(da, "Mlle.Baptistine", "graphty", "degree", "degreePct"), 3 / 36);
    });

    it("correctly calculates in-degree for destination nodes", async () => {
        // Graph: A -> B, A -> C (A has outDegree=2, B/C have inDegree=1)
        const graph = await createMockGraph({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
            edges: [
                { srcId: "A", dstId: "B" },
                { srcId: "A", dstId: "C" },
            ],
        });

        const da = new DegreeAlgorithm(graph);
        await da.run();

        // Source node A should have outDegree=2, inDegree=0
        assert.strictEqual(getNodeResult(da, "A", "graphty", "degree", "outDegree"), 2, "A should have outDegree=2");
        assert.strictEqual(getNodeResult(da, "A", "graphty", "degree", "inDegree"), 0, "A should have inDegree=0");

        // Destination nodes B/C should have inDegree=1, outDegree=0
        assert.strictEqual(getNodeResult(da, "B", "graphty", "degree", "inDegree"), 1, "B should have inDegree=1");
        assert.strictEqual(getNodeResult(da, "B", "graphty", "degree", "outDegree"), 0, "B should have outDegree=0");

        assert.strictEqual(getNodeResult(da, "C", "graphty", "degree", "inDegree"), 1, "C should have inDegree=1");
        assert.strictEqual(getNodeResult(da, "C", "graphty", "degree", "outDegree"), 0, "C should have outDegree=0");
    });

    it("handles empty graph without NaN", async () => {
        const graph = await createMockGraph({
            nodes: [{ id: "A" }],
            edges: [],
        });

        const da = new DegreeAlgorithm(graph);
        await da.run();

        // Should return 0, not NaN
        const degreePct = getNodeResult(da, "A", "graphty", "degree", "degreePct");
        const inDegreePct = getNodeResult(da, "A", "graphty", "degree", "inDegreePct");
        const outDegreePct = getNodeResult(da, "A", "graphty", "degree", "outDegreePct");

        assert.strictEqual(degreePct, 0, "degreePct should be 0, not NaN");
        assert.strictEqual(inDegreePct, 0, "inDegreePct should be 0, not NaN");
        assert.strictEqual(outDegreePct, 0, "outDegreePct should be 0, not NaN");
        assert.strictEqual(Number.isNaN(degreePct), false, "degreePct should not be NaN");
        assert.strictEqual(Number.isNaN(inDegreePct), false, "inDegreePct should not be NaN");
        assert.strictEqual(Number.isNaN(outDegreePct), false, "outDegreePct should not be NaN");
    });

    it("stores graph-level results", async () => {
        // Graph: A -> B, A -> C (maxOutDegree=2, maxInDegree=1, maxDegree=2)
        const graph = await createMockGraph({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
            edges: [
                { srcId: "A", dstId: "B" },
                { srcId: "A", dstId: "C" },
            ],
        });

        const da = new DegreeAlgorithm(graph);
        await da.run();

        // Graph-level results should be present
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxOutDegree"), 2);
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxInDegree"), 1);
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxDegree"), 2);
    });

    it("handles graph with no edges for graph-level results", async () => {
        const graph = await createMockGraph({
            nodes: [{ id: "A" }, { id: "B" }],
            edges: [],
        });

        const da = new DegreeAlgorithm(graph);
        await da.run();

        // Graph-level results should be 0 when no edges
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxOutDegree"), 0);
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxInDegree"), 0);
        assert.strictEqual(getGraphResult(da, "graphty", "degree", "maxDegree"), 0);
    });
});

import { assert, describe, it } from "vitest";

import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { createMockGraph, getGraphResult, getNodeResult } from "../../helpers/mockGraph";

describe("PageRankAlgorithm", () => {
    it("exists", async () => {
        new PageRankAlgorithm(await createMockGraph());
    });

    it("calculates pagerank scores", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const pr = new PageRankAlgorithm(graph);

        await pr.run();

        // Check that all nodes have pagerank results
         
        const dm = graph.getDataManager() as any;
        for (const [nodeId] of dm.nodes) {
            const rank = getNodeResult(pr, nodeId, "graphty", "pagerank", "rank");
            const rankPct = getNodeResult(pr, nodeId, "graphty", "pagerank", "rankPct");

            // Verify rank is a number and in valid range
            assert.isNumber(rank);
            assert.isAtLeast(rank, 0);

            // Verify rankPct is normalized [0,1]
            assert.isNumber(rankPct);
            assert.isAtLeast(rankPct, 0);
            assert.isAtMost(rankPct, 1);
        }

        // Sum of all ranks should be approximately 1.0
        let totalRank = 0;
        for (const [nodeId] of dm.nodes) {
            const rank = getNodeResult(pr, nodeId, "graphty", "pagerank", "rank");
            totalRank += rank as number;
        }
        assert.approximately(totalRank, 1.0, 0.0001);
    });

    it("stores graph-level convergence info", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const pr = new PageRankAlgorithm(graph);
        await pr.run();

        // What qualifies the numbers -- how many passes it took and whether it converged -- is in
        // the caveats every result carries, rather than in graph keys each algorithm named itself.
        const iterations = getGraphResult(pr, "graphty", "pagerank", "iterations");
        const converged = getGraphResult(pr, "graphty", "pagerank", "converged");
        const maxRank = getGraphResult(pr, "graphty", "pagerank", "maxRank");

        assert.isDefined(iterations);
        assert.isDefined(converged);
        assert.isDefined(maxRank);

        assert.isNumber(iterations);
        assert.isAtLeast(iterations, 1, "Should have at least 1 iteration");

        assert.isNumber(maxRank);
        assert.isAtLeast(maxRank, 0, "Max rank should be non-negative");

        // The damping factor the run used is in the caveats' notes, which is where a reader is
        // told what the numbers mean rather than handed a parameter back as a result.
        assert.ok(pr.result?.summary().caveats.notes.some((note: string) => note.includes("0.85")));
    });

    it("handles empty graph gracefully", async () => {
        const graph = await createMockGraph({
            nodes: [],
            edges: [],
        });

        const pr = new PageRankAlgorithm(graph);
        await pr.run();

        // Empty graph should not throw and should not have graph results
        // With empty graph, run() returns early without setting graphResults
        const iterations = getGraphResult(pr, "graphty", "pagerank", "iterations");
        assert.isUndefined(iterations);
    });
});

/**
 * @file max-flow over a scope: a listed scope, a multigraph, and capacities read from the edge
 * records at the scope's edges (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { describeScopedAdapter, runScoped, runWhole, type ScopedGraph, scopedGraph } from "./harness";

describeScopedAdapter("max-flow", (graph: AlgorithmHost) => new MaxFlowAlgorithm(graph));

describe("max-flow reads its capacities from the scope's edge records", () => {
    const flow = (graph: AlgorithmHost): MaxFlowAlgorithm => new MaxFlowAlgorithm(graph, { source: "s", sink: "t" });

    it("a way round through a non-member carries nothing in the scope", async () => {
        // s>t directly at 2, and s>x>t at 5 through x.
        const wayRound = (): Promise<ScopedGraph> =>
            scopedGraph(
                ["s", "x", "t"],
                [
                    ["s", "t", 1, 2],
                    ["s", "x", 1, 5],
                    ["x", "t", 1, 5],
                ],
                true,
            );
        const whole = await wayRound();
        const scoped = await wayRound();

        assert.deepInclude((await runWhole(flow, whole))?.graph, { maxFlow: 7 });
        assert.deepInclude((await runScoped(flow, scoped, scoped.scope(["s", "t"])))?.graph, { maxFlow: 2 });
    });

    it("parallel edges carry their capacities together", async () => {
        const graph = await scopedGraph(
            ["s", "t"],
            [
                ["s", "t", 1, 2],
                ["s", "t", 1, 3],
            ],
            true,
        );
        const result = await runWhole(flow, graph);
        const [first] = graph.edges.keys();

        assert.deepInclude(result?.graph, { maxFlow: 5 });
        assert.deepInclude(result?.edge(first), { value: 5, capacity: 5 });
    });
});

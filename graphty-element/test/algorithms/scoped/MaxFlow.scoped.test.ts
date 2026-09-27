/**
 * @file max-flow over a scope: a listed scope, a multigraph, and capacities read from the records
 * of the scope's edges (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { describeScopedAdapter, runScoped, runWhole } from "./harness";

describeScopedAdapter("max-flow", (graph: Graph) => new MaxFlowAlgorithm(graph));

/**
 * A graph whose edges carry capacities in their records, as a loaded edge does.
 * @param capacities - One per edge, in order.
 * @param graph - The graph.
 * @returns It.
 */
function withCapacities(capacities: readonly number[], graph: InputGraph): InputGraph {
    [...graph.edges.values()].forEach((edge, index) => {
        edge.data = { capacity: capacities[index] };
    });

    return graph;
}

describe("max-flow reads its capacities from the scope's edge records", () => {
    const flow = (graph: Graph): MaxFlowAlgorithm => new MaxFlowAlgorithm(graph, { source: "s", sink: "t" });

    it("a way round through a non-member carries nothing in the scope", async () => {
        // s>t directly at 2, and s>x>t at 5 through x.
        const whole = withCapacities(
            [2, 5, 5],
            new InputGraph(
                ["s", "x", "t"],
                [
                    ["s", "t"],
                    ["s", "x"],
                    ["x", "t"],
                ],
                true,
            ),
        );
        const scoped = withCapacities(
            [2, 5, 5],
            new InputGraph(
                ["s", "x", "t"],
                [
                    ["s", "t"],
                    ["s", "x"],
                    ["x", "t"],
                ],
                true,
            ),
        );

        assert.deepInclude((await runWhole(flow, whole))?.graph, { maxFlow: 7 });
        assert.deepInclude((await runScoped(flow, scoped, scoped.scope(["s", "t"])))?.graph, { maxFlow: 2 });
    });

    it("parallel edges carry their capacities together", async () => {
        const graph = withCapacities(
            [2, 3],
            new InputGraph(
                ["s", "t"],
                [
                    ["s", "t"],
                    ["s", "t"],
                ],
                true,
            ),
        );
        const result = await runWhole(flow, graph);

        assert.deepInclude(result?.graph, { maxFlow: 5 });
        assert.deepInclude(result?.edge("0"), { value: 5, capacity: 5 });
    });
});

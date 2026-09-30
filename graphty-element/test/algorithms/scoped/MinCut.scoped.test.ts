/**
 * @file min-cut over a scope: a listed scope, a multigraph, and the element's edge weights
 * (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { describeScopedAdapter, runScoped } from "./harness";

describeScopedAdapter("min-cut", (graph: Graph) => new MinCutAlgorithm(graph));

describe("min-cut over a scope", () => {
    it("cuts by the element's edge weights, parallel edges summed", async () => {
        // a and b held by two parallel edges of 2 and 3; b and c by one of 4; x outside.
        const graph = new InputGraph(
            ["a", "b", "c", "x"],
            [
                ["a", "b", 2],
                ["a", "b", 3],
                ["b", "c", 4],
                ["c", "x", 1],
            ],
        );
        const result = await runScoped((g) => new MinCutAlgorithm(g), graph, graph.scope(["a", "b", "c"]));

        assert.deepInclude(result?.graph, { cutValue: 4 });
        assert.deepStrictEqual(result?.edge("2"), { in: true });
    });
});

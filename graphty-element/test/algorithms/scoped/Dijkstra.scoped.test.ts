/**
 * @file Dijkstra over a scope: a listed scope, a multigraph, generated scopes and the default
 * source and target (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { assertOverGeneratedScopes, describeScopedAdapter, runScoped } from "./harness";

const build = (graph: Graph): DijkstraAlgorithm => new DijkstraAlgorithm(graph);

describeScopedAdapter("dijkstra", build);

describe("dijkstra over generated scopes", () => {
    it("equals the run on the scope's own graph, induced and listed", async () => {
        await assertOverGeneratedScopes(build);
    });
});

describe("dijkstra over a scope", () => {
    it("with no source or target, routes from the scope's first node to its last", async () => {
        const graph = new InputGraph(["x", "b", "c", "d", "y"], [["x", "b"], ["b", "c"], ["c", "d"], ["d", "y"]]);
        const result = await runScoped(build, graph, graph.scope(["b", "c", "d"]));

        assert.deepInclude(result?.node("b"), { onPath: true, order: 0, distance: 0 });
        assert.deepInclude(result?.node("d"), { onPath: true, order: 2 });
        assert.deepInclude(result?.graph, { length: 3, hops: 2 });
    });
});

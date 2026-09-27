/**
 * @file Dijkstra over a scope: a listed scope, a multigraph, generated scopes and the default
 * source and target (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { assertOverGeneratedScopes, describeScopedAdapter, runScoped, runWhole } from "./harness";

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

describe("dijkstra over a weighted multigraph takes the shortest of parallel edges", () => {
    /** a to b twice, at 1 and at 4, then b to c at 2; z outside any scope below. */
    const multigraph = (): InputGraph =>
        new InputGraph(["a", "b", "c", "z"], [["a", "b", 4], ["a", "b", 1], ["b", "c", 2], ["c", "z", 1]]);
    const route = (graph: Graph): DijkstraAlgorithm => new DijkstraAlgorithm(graph, { source: "a", target: "c" });

    it("over the whole graph", async () => {
        const graph = multigraph();
        const result = await runWhole(route, graph);

        assert.deepInclude(result?.node("c"), { distance: 3 });
        assert.deepInclude(result?.graph, { cost: 3 });
    });

    it("over a scope", async () => {
        const graph = multigraph();
        const result = await runScoped(route, graph, graph.scope(["a", "b", "c"]));

        assert.deepInclude(result?.node("c"), { distance: 3 });
        assert.deepInclude(result?.graph, { cost: 3 });
    });

    it("marks only the parallel edge the route took, so a path set names one edge per step", async () => {
        const result = await runWhole(route, multigraph());

        assert.deepStrictEqual(
            ["0", "1", "2", "3"].map((id) => result?.edge(id)?.onPath),
            [false, true, true, false],
            "a to b at 4 is not taken, a to b at 1 is",
        );
    });

    it("marks one edge of each direction of a reciprocal pair read undirected", async () => {
        const graph = new InputGraph(["a", "b", "c"], [["a", "b", 1], ["b", "a", 1], ["a", "b", 3], ["b", "c", 1]], true);
        const result = await runWhole(route, graph);

        assert.deepStrictEqual(
            ["0", "1", "2", "3"].map((id) => result?.edge(id)?.onPath),
            [true, true, false, true],
        );
    });
});

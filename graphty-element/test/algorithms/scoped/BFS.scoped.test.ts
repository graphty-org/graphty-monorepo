/**
 * @file Breadth-first search over a scope: a listed scope, a multigraph, generated scopes, the
 * default source, and the early-stop route (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { assertComputesOverScope, assertOverGeneratedScopes, describeScopedAdapter, runScoped } from "./harness";

const build = (graph: Graph): BFSAlgorithm => new BFSAlgorithm(graph);

describeScopedAdapter("bfs", build);

describe("bfs over generated scopes", () => {
    it("equals the run on the scope's own graph, induced and listed", async () => {
        await assertOverGeneratedScopes(build);
    });
});

describe("bfs over a scope", () => {
    it("with no source, walks from the scope's first node", async () => {
        const graph = new InputGraph(
            ["x", "b", "c"],
            [
                ["x", "b"],
                ["b", "c"],
            ],
        );
        const result = await runScoped(build, graph, graph.scope(["b", "c"]));

        assert.deepInclude(result?.node("b"), { level: 0 });
        assert.deepInclude(result?.node("c"), { level: 1 });
    });

    it("an early stop at a target walks only the scope", async () => {
        const graph = new InputGraph(
            ["a", "x", "b", "d", "c"],
            [
                ["a", "x"],
                ["x", "c"],
                ["a", "b"],
                ["b", "d"],
                ["d", "c"],
            ],
        );
        const result = await assertComputesOverScope(
            (g) => new BFSAlgorithm(g, { source: "a", targetNode: "c" }),
            graph,
            graph.scope(["a", "b", "d", "c"]),
        );

        assert.deepInclude(result?.node("c"), { level: 3 }, "through b and d; the way through x is outside the scope");
    });
});

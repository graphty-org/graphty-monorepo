/**
 * @file Connected components over a scope: a listed scope, a multigraph, generated scopes, and the
 * isolates a scope's edges leave (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import type { Graph } from "../../../src/Graph";
import { InputGraph } from "../input/harness";
import { assertComputesOverScope, assertOverGeneratedScopes, describeScopedAdapter } from "./harness";

const build = (graph: Graph): ConnectedComponentsAlgorithm => new ConnectedComponentsAlgorithm(graph);

describeScopedAdapter("connected-components", build);

describe("connected components over generated scopes", () => {
    it("equals the run on the scope's own graph, induced and listed", async () => {
        await assertOverGeneratedScopes(build);
    });
});

describe("connected components over a scope that keeps every node and drops edges", () => {
    it("each node left with no edge in the scope is its own component", async () => {
        const graph = new InputGraph(
            ["a", "b", "c", "d"],
            [
                ["a", "b", 5],
                ["b", "c", 1],
                ["c", "d", 1],
            ],
        );
        // Every node, and only the edges of weight above 2, as a visibility filter on weight reads.
        const heavy = graph.scope(["a", "b", "c", "d"], (_source, _target, row) => row === 0);
        const result = await assertComputesOverScope(build, graph, heavy);

        const groups = ["a", "b", "c", "d"].map((id) => result?.node(id)?.group);
        assert.strictEqual(groups[0], groups[1]);
        assert.strictEqual(new Set(groups).size, 3, "a-b, and c and d each alone");
    });
});

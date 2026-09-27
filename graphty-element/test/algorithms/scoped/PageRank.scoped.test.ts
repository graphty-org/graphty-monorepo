/**
 * @file PageRank over a scope: a listed scope, a multigraph, generated scopes, and the personalized
 * route (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { InputGraph } from "../input/harness";
import { assertComputesOverScope, assertOverGeneratedScopes, describeScopedAdapter } from "./harness";

describeScopedAdapter("pagerank", (graph) => new PageRankAlgorithm(graph));

describe("pagerank over generated scopes", () => {
    it("equals the run on the scope's own graph, induced and listed", async () => {
        await assertOverGeneratedScopes((graph) => new PageRankAlgorithm(graph));
    });
});

describe("pagerank over a scope, on the reference route", () => {
    it("a personalized run ranks over the scope, and its ranks sum to 1 across the scope", async () => {
        const graph = new InputGraph(["a", "x", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"], ["a", "x"], ["x", "c"]], true);
        const personalization = new Map([["a", 1]]);
        const scope = graph.scope(["a", "b", "c"]);
        const result = await assertComputesOverScope((g) => new PageRankAlgorithm(g, { personalization }), graph, scope);

        const ranks = ["a", "b", "c"].map((id) => Number(result?.node(id)?.value));
        assert.closeTo(ranks.reduce((sum, value) => sum + value, 0), 1, 1e-6);
        assert.strictEqual(result?.measured.nodes, 3);
    });
});

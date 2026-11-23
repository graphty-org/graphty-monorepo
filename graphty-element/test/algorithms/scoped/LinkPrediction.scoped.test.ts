/**
 * @file Link prediction over a scope: a listed scope, a multigraph, and pairs that stay inside the
 * scope and are never written into the graph (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { LinkPredictionAlgorithm } from "../../../src/algorithms/LinkPredictionAlgorithm";
import { describeScopedAdapter, runScoped, runWhole, type ScopedGraph, scopedGraph } from "./harness";

const predict = (graph: AlgorithmHost): LinkPredictionAlgorithm => new LinkPredictionAlgorithm(graph, { topK: 100 });

describeScopedAdapter("link-prediction", predict);

describe("link prediction over a scope", () => {
    /** a and c share b in the scope; x, outside it, is a neighbor a and c share with d too. */
    const build = (): Promise<ScopedGraph> =>
        scopedGraph(
            ["a", "b", "c", "x", "d"],
            [
                ["a", "b"],
                ["b", "c"],
                ["a", "x"],
                ["c", "x"],
                ["d", "x"],
            ],
            false,
        );

    const pairsOf = (graph: unknown): string[] =>
        (graph as { pairs: { source: unknown; target: unknown }[] }).pairs.map(({ source, target }) =>
            [String(source), String(target)].sort().join("-"),
        );

    it("pairs only nodes of the scope, over the scope's edges", async () => {
        const graph = await build();
        const result = await runScoped(predict, graph, graph.scope(["a", "b", "c", "d"]));

        assert.deepStrictEqual(pairsOf(result?.graph), ["a-c"]);
        assert.includeMembers(pairsOf((await runWhole(predict, await build()))?.graph), ["a-d", "c-d"]);
    });

    it("writes no predicted edge into the graph", async () => {
        const graph = await build();
        const before = [...graph.edges.values()].map((edge) => ({ ...edge }));
        const { edgeCount } = graph.snapshot();
        await runScoped(predict, graph, graph.scope(["a", "b", "c", "d"]));

        assert.deepStrictEqual([...graph.edges.values()], before);
        assert.strictEqual(graph.snapshot().edgeCount, edgeCount);
    });
});

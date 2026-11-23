/**
 * @file prim over a scope: a listed scope, a multigraph, and a scope in several pieces
 * (design/sets/sets-design.md 10.1).
 */

import { assert, describe, it } from "vitest";

import type { AlgorithmHost } from "../../../src/algorithms/host";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";
import { describeScopedAdapter, runScoped, runWhole, type ScopedGraph, scopedGraph } from "./harness";

const build = (graph: AlgorithmHost): PrimAlgorithm => new PrimAlgorithm(graph);

describeScopedAdapter("prim", build);

describe("prim over a graph in several pieces", () => {
    /** a - b - c and d - e, joined only through x. */
    const graph = (): Promise<ScopedGraph> =>
        scopedGraph(
            ["a", "b", "c", "x", "d", "e"],
            [
                ["a", "b", 1],
                ["b", "c", 2],
                ["c", "x", 1],
                ["x", "d", 1],
                ["d", "e", 3],
            ],
        );

    it("spans every piece of a scope that cuts the graph, as Kruskal does", async () => {
        const g = await graph();
        const result = await runScoped(build, g, g.scope(["a", "b", "c", "d", "e"]));

        assert.deepInclude(result?.graph, { totalWeight: 6 });
        assert.deepStrictEqual(
            ["0", "1", "4"].map((id) => result?.edge(id)),
            [{ in: true }, { in: true }, { in: true }],
            "a-b, b-c and d-e are the forest",
        );
    });

    it("spans every piece of a whole graph that is not connected", async () => {
        const g = await scopedGraph(
            ["a", "b", "c", "d"],
            [
                ["a", "b", 1],
                ["c", "d", 2],
            ],
        );
        const result = await runWhole(build, g);

        assert.deepInclude(result?.graph, { totalWeight: 3 });
    });

    it("grows the named start node's piece from it", async () => {
        const g = await graph();
        const result = await runScoped(
            (h) => new PrimAlgorithm(h, { startNode: "e" }),
            g,
            g.scope(["a", "b", "c", "d", "e"]),
        );

        assert.deepInclude(result?.graph, { totalWeight: 6 });
    });
});

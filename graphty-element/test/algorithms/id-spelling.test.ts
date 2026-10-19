/**
 * @file An algorithm option that names a node takes an integer id in either spelling: `34` names
 * node `"34"`, as every other node lookup in the element does.
 */

import { assert, describe, it } from "vitest";

import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { PageRankAlgorithm } from "../../src/algorithms/PageRankAlgorithm";
import { InputGraph } from "./input/harness";
import { runWhole } from "./scoped/harness";

/**
 * A directed chain `"34" -> "35" -> "36"`, its node ids held as text.
 * @returns The graph.
 */
const chain = (): InputGraph =>
    new InputGraph(
        ["34", "35", "36"],
        [
            ["34", "35"],
            ["35", "36"],
        ],
        true,
    );

describe("either spelling of an integer id in an algorithm option", () => {
    it("dijkstra's source and target find the node by the number it spells", async () => {
        const result = await runWhole((graph) => new DijkstraAlgorithm(graph, { source: 34, target: 36 }), chain());

        assert.deepInclude(result?.node("36"), { onPath: true, distance: 2 });
        assert.deepInclude(result?.node(36), { onPath: true, distance: 2 }, "the result answers either spelling too");
    });

    it("dijkstra refuses text that is not an id's decimal printing", async () => {
        const error: unknown = await runWhole(
            (graph) => new DijkstraAlgorithm(graph, { source: "34.0", target: "36" }),
            chain(),
        ).catch((rejection: unknown) => rejection);

        assert.include(String(error), "34.0");
    });

    it("pagerank's personalization keys find the node by the number it spells", async () => {
        const rankOf = async (personalization: Map<string | number, number>): Promise<unknown> =>
            (await runWhole((graph) => new PageRankAlgorithm(graph, { personalization }), chain()))?.node("34")?.value;

        assert.strictEqual(await rankOf(new Map([[34, 1]])), await rankOf(new Map([["34", 1]])));
        assert.notStrictEqual(await rankOf(new Map([[34, 1]])), await rankOf(new Map([["36", 1]])));
    });
});

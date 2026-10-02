/**
 * The layout stories generate their graphs with the algorithms stories' generators
 * (algorithms/stories/utils/graph-generators.ts). These pin what the layout stories rely on, so a
 * change made there for the algorithms stories cannot silently change the layout stories.
 */
import { assert, describe, it } from "vitest";

import { generateGraph as generateAlgorithmsGraph } from "../../algorithms/stories/utils/graph-generators.js";
import { generateGraph, type GraphType } from "../stories/utils/graph-generators.js";

const LAYOUT_STORY_TYPES: GraphType[] = [
    "tree",
    "random",
    "grid",
    "cycle",
    "complete",
    "star",
    "path",
    "bipartite",
    "multipartite",
];

describe("layout story graph generators", () => {
    it("generates every graph type the layout stories offer, deterministically", () => {
        for (const type of LAYOUT_STORY_TYPES) {
            const graph = generateGraph(type, 12, 7);
            assert.strictEqual(graph.nodes.length, 12, type);
            assert.deepStrictEqual(generateGraph(type, 12, 7), graph, type);
        }
    });

    it("scatters the random graph's nodes inside the canvas instead of running a force layout", () => {
        const graph = generateGraph("random", 20, 42, 500, 400);
        for (const node of graph.nodes) {
            assert.isTrue(node.x >= 40 && node.x <= 460, `x ${node.x}`);
            assert.isTrue(node.y >= 40 && node.y <= 360, `y ${node.y}`);
        }
        // The algorithms stories' random graph is force-directed, so its positions differ.
        assert.notDeepEqual(
            graph.nodes.map((n) => [n.x, n.y]),
            generateAlgorithmsGraph("random", 20, 42, 500, 400).nodes.map((n) => [n.x, n.y]),
        );
    });

    it("leaves the non-random graphs identical to the algorithms stories' graphs", () => {
        for (const type of LAYOUT_STORY_TYPES.filter((t) => t !== "random")) {
            assert.deepStrictEqual(generateGraph(type, 9, 3), generateAlgorithmsGraph(type, 9, 3), type);
        }
    });
});

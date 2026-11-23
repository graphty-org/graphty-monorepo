/**
 * The layout stories build their graphs from @graphty/graph-samples. This pins that every graph type they offer is
 * generated, with the asked node count, the same way for the same seed.
 */
import { assert, describe, it } from "vitest";

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
});

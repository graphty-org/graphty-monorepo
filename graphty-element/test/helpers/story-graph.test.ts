import { assert, describe, it } from "vitest";

import { storyGraph } from "./story-graph";

describe("storyGraph", () => {
    it("draws 250 distinct node pairs over 150 nodes, a reversed pair counting as a repeat", () => {
        const { nodes, edges } = storyGraph(150, 250);
        const pairs = new Set(edges.map(({ src, dst }) => [src, dst].sort().join("|")));

        assert.strictEqual(nodes.length, 150);
        assert.strictEqual(edges.length, 250);
        assert.strictEqual(pairs.size, 250);
    });
});

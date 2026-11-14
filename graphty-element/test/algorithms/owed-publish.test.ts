/**
 * @file A layout drawn from the card owes the positions lane its publish instead of writing it every
 * frame (design/rendering/row-renderer.md 4.5). The store's snapshot lends the lane by reference, so
 * an algorithm's input writes the owed publish before the run reads the graph.
 */

import { assert, describe, it } from "vitest";

import { DegreeAlgorithm } from "../../src/algorithms/DegreeAlgorithm";
import { WRITABLE_LANE } from "../../src/data/lane";
import { ElementPositions } from "../../src/data/positions";
import { createMockGraph } from "../helpers/mockGraph";

describe("an algorithm run while a layout's publish is owed", () => {
    it("writes the owed publish before it reads the graph", async () => {
        const graph = await createMockGraph({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [{ srcId: "a", dstId: "b" }],
        });
        const lane = new ElementPositions();
        let publishes = 0;
        lane.owe(() => {
            publishes++;
        });
        const manager = graph.getDataManager.bind(graph);
        Object.assign(graph, { getDataManager: () => Object.assign(manager(), { [WRITABLE_LANE]: lane }) });

        await new DegreeAlgorithm(graph).run();

        assert.strictEqual(publishes, 1);
    });
});

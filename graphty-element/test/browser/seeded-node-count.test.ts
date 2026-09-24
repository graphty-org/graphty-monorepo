/**
 * @file Whether the file placed these nodes, asked after a layout has started.
 *
 * WHAT THIS PROTECTS. Two different questions look like one: "how many nodes carry a coordinate"
 * and "how many nodes did the DATA arrive carrying a coordinate for". The position array answers
 * the first, and it is written by the importer AND by every running layout -- so one animation
 * frame after a file with no coordinates finishes loading, every node carries a position, because
 * the layout put it there.
 *
 * Anything deciding what to do BECAUSE the file placed the nodes must ask the second question.
 * The layout recommendation asks it, and when it read the first instead, a file that arrived with
 * no arrangement at all was told to keep the arrangement it arrived with: the graph froze at
 * whatever the first step of a force layout had reached, and no force layout ever ran.
 *
 * The timing is the whole test. Both counts agree at the instant data lands, which is why this
 * cannot be asserted synchronously -- it has to be read after a frame, where the app reads it.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { recommendLayout } from "../../src/session/layout";

/** How many nodes the fixture carries. */
const NODE_COUNT = 40;

/**
 * A GEXF file with nodes and edges and NO coordinates at all.
 * @returns the document.
 */
function unplacedGexf(): string {
    const nodes = Array.from({ length: NODE_COUNT }, (_unused, index) => `<node id="n${String(index)}" />`).join("\n");
    const edges = Array.from(
        { length: NODE_COUNT - 1 },
        (_unused, index) => `<edge id="e${String(index)}" source="n${String(index)}" target="n${String(index + 1)}" />`,
    ).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
<graph mode="static" defaultedgetype="undirected">
<nodes>${nodes}</nodes>
<edges>${edges}</edges>
</graph>
</gexf>`;
}

describe("how many nodes the data placed", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addDataFromSource("gexf", { data: unplacedGexf() });
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /** Let the render loop run, which is when a layout starts writing coordinates. */
    async function afterAFrame(): Promise<void> {
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    resolve();
                });
            });
        });
    }

    it("stays zero for a file that carried no coordinates, however long the layout runs", async () => {
        const session = graph.getSession();

        assert.strictEqual(session.seededNodeCount, 0, "the file placed nothing");

        await afterAFrame();

        assert.strictEqual(session.seededNodeCount, 0, "and a running layout does not change what the FILE did");
    });

    /**
     * The live count is not wrong -- it answers a different question correctly. This asserts the
     * divergence exists, because without it the test above would pass on a build where both
     * numbers were the same thing.
     */
    it("diverges from the live count once the layout has placed the nodes", async () => {
        await afterAFrame();

        assert.strictEqual(graph.getSession().positions.placedCount, NODE_COUNT, "the layout placed them");
        assert.strictEqual(graph.getSession().seededNodeCount, 0, "the file did not");
    });

    it("does not recommend keeping an arrangement the data never had", async () => {
        const session = graph.getSession();
        await afterAFrame();

        const arrangement = recommendLayout(session.data.statistics(), { placedNodes: session.seededNodeCount });

        assert.isDefined(arrangement);
        assert.notStrictEqual(
            arrangement.layout.id,
            "fixed",
            "a file with no coordinates must not be told to keep the ones it does not have",
        );
    });
});

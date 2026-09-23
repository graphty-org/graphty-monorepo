/**
 * @file `minDelta`, the settle threshold the element accepted and never read.
 *
 * `layoutBehavior` publishes four pacing settings. Three of them are read on every frame;
 * `layout.minDelta` was read by nothing at all, while the element's own JSDoc told a consumer it
 * paced the layout and eight test files set it believing that. A force layout that has stopped
 * moving kept being stepped for ever, and the one setting that could have said "close enough,
 * stop" did nothing.
 *
 * What it means here: once a whole frame moves every node less than `minDelta`, the layout has
 * arrived and stops. Zero -- the default -- switches the threshold off, which is the behaviour
 * every existing graph already has.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/**
 * Enough nodes that a force layout is still visibly moving them after a handful of frames.
 *
 * Six nodes settle on their own inside the window this test measures, which makes "did it stop?"
 * a question about the engine rather than about the threshold. Forty do not.
 */
const NODES = Array.from({ length: 40 }, (_unused, index) => ({ id: `n${String(index)}` }));

/** A path through them, so the layout has edges to pull along. */
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

/** How many frames to render before asking whether the layout is still going. */
const FRAMES = 4;

/** How long to leave between frames. */
const FRAME_MS = 10;

describe("the layout settle threshold", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render a handful of frames.
     */
    async function render(): Promise<void> {
        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }
    }

    it("keeps stepping when nobody has set one", async () => {
        await render();

        assert.isTrue(graph.getLayoutManager().running, "the default is to run until the engine says it is done");
    });

    it("stops the layout once a frame moves every node less than the threshold", async () => {
        // A threshold far larger than anything one frame of a force layout moves, so the first
        // measured frame is under it. What is being pinned is that the threshold is READ, not
        // what a particular engine's step size happens to be.
        graph.setLayoutBehavior({ layout: { minDelta: 1e6 } });

        await render();

        assert.isFalse(graph.getLayoutManager().running, "the layout arrived and stopped");
    });

    it("leaves the nodes where the layout put them", async () => {
        graph.setLayoutBehavior({ layout: { minDelta: 1e6 } });
        await render();

        const node = graph.getNode("n0");
        assert.isDefined(node);
        assert.isFalse(Number.isNaN(node.mesh.position.x), "stopping is not the same as unplacing");
    });
});

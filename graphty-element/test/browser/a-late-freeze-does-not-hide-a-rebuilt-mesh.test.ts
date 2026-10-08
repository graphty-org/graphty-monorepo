/**
 * @file A freeze Babylon puts off until the scene is ready must not land on a list that is stale.
 *
 * THE DEFECT. When a frame changes nothing, `UpdateManager.settleActiveMeshFreeze` freezes
 * Babylon's list of what is drawn. Babylon does not always freeze then: `freezeActiveMeshes` waits
 * for `executeWhenReady`, which polls every 100 ms while the scene is not ready (a shader still
 * compiling, a texture still loading, or another caller's poll already pending). The manager
 * recorded the freeze as done at once, and `unfreezeActiveMeshes` does not cancel a freeze that is
 * still waiting. So a change between the request and the poll unfroze nothing, the poll then
 * froze the list as it stood, and the manager -- believing the scene unfrozen -- never unfroze it
 * again. The next mesh the scene built was not on the list and was not drawn.
 *
 * WHAT A CONSUMER SAW. Removing a style layer that moved an edge to another source mesh rebuilds
 * the edge's line in a new batch. With the stale list in place the line vanished, and
 * `test/browser/a-layer-added-later-paints.test.ts` failed in CI with "Taking the layer away left
 * 847 pixels changed" for both arrow colours -- 847 being exactly the edge's line.
 *
 * Frames are pumped by hand so the test, not the machine's speed, decides when the poll lands.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** How many buckets the histogram has: four bits per channel, three channels. */
const BUCKETS = 16 * 16 * 16;

/** How many pixels may move before the picture counts as changed; see a-layer-added-later-paints. */
const PIXEL_CHANGE = 32;

describe("a freeze Babylon puts off", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes([
            { id: "a", position: { x: -4, y: 0, z: 0 } },
            { id: "b", position: { x: 4, y: 0, z: 0 } },
        ]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
        await session.styles.add({
            name: "caps",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 3 },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    }, 60000);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /** Run one frame the way the render loop does: the update pass, then the draw. */
    function pump(): void {
        graph.update();
        graph.scene.render();
    }

    /**
     * Count the pixels of the frame last drawn by colour.
     * @returns How many pixels fall in each coarse colour bucket.
     */
    async function histogram(): Promise<Uint32Array> {
        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        const counts = new Uint32Array(BUCKETS);

        for (let at = 0; at < pixels.length; at += 4) {
            counts[((pixels[at] >> 4) << 8) | ((pixels[at + 1] >> 4) << 4) | (pixels[at + 2] >> 4)]++;
        }

        return counts;
    }

    /**
     * How many pixels moved between two frames.
     * @param one - The earlier frame.
     * @param other - The later one.
     * @returns The number of pixels that changed bucket, counting each move once.
     */
    function moved(one: Uint32Array, other: Uint32Array): number {
        let total = 0;

        for (let bucket = 0; bucket < BUCKETS; bucket++) {
            total += Math.abs(one[bucket] - other[bucket]);
        }

        return total / 2;
    }

    it("still draws a mesh rebuilt after the freeze finally lands", async () => {
        const { scene } = graph;

        graph.engine.stopRenderLoop();
        pump();
        const before = await histogram();

        // The scene says it is not ready, so the freeze a quiet frame asks for is put off.
        const isReady = scene.isReady.bind(scene);
        scene.isReady = (): boolean => false;
        // Rebuilding the view matrix reads as a camera move, which unfreezes the list; the frame
        // after it is quiet and asks for the freeze.
        scene.activeCamera?.getViewMatrix(true);
        pump();
        pump();

        // A change while that freeze is waiting: the edge moves to another source mesh.
        const layer = await session.styles.add({
            name: "head colour",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadColor": "#ff00ff" },
        });
        pump();

        // The scene becomes ready and Babylon's next poll runs the freeze that was put off.
        scene.isReady = isReady;
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Taking the layer away rebuilds the edge's line in a batch that did not exist when the
        // list was taken.
        await session.styles.remove(layer.id);
        pump();
        const restored = await histogram();

        assert.isAtMost(
            moved(before, restored),
            PIXEL_CHANGE,
            "the edge's rebuilt line is drawn once the layer that moved it is taken away",
        );
    });
});

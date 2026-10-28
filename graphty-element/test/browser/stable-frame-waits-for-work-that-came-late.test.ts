/**
 * @file `waitForStableFrame()` waits for work that arrives while it is already waiting.
 *
 * Two ways it used to get this wrong:
 *
 * - It drained the operation queue once and then asked only whether the frame was stable, which
 *   knows nothing about the queue, so an operation queued just after the drain was not waited for
 *   (issue #3528).
 * - It waited for the `graph-frame-stable` event, which fires only when a drawn frame turns the
 *   picture final. A derivation pass that started and ended between two frames, painting nothing,
 *   turned nothing final: the waiter that attached while it ran heard nothing and waited out its
 *   30 s timeout (issue #3527).
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { OperationQueueManager } from "../../src/managers/OperationQueueManager.js";
import type { RenderManager } from "../../src/managers/RenderManager.js";
import type { UpdateManager } from "../../src/managers/UpdateManager.js";

const COUNT = 8;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % COUNT].id }));

interface Internals {
    operationQueue: OperationQueueManager;
    renderManager: RenderManager;
    updateManager: UpdateManager;
}

describe("a stable-frame wait and work that arrives while it waits", () => {
    let element: Graphty;

    beforeEach(async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "600px";
        element.style.height = "400px";
        document.body.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await element.waitForStableFrame();
    });

    afterEach(() => {
        element.remove();
    });

    it("waits for an operation queued after it drained the queue", async () => {
        const internals = element.graph as unknown as Internals;
        const queue = internals.operationQueue;
        const scene = element.graph.getScene();
        const drain = queue.waitForCompletion.bind(queue);
        let queued = false;
        let ran = false;

        // The first drain the wait makes is followed at once by a new operation, which takes a
        // drawn frame to finish.
        queue.waitForCompletion = async () => {
            await drain();
            if (!queued) {
                queued = true;
                queue.queueOperation("render-update", async () => {
                    await new Promise<void>((resolve) => {
                        scene.onAfterRenderObservable.addOnce(() => {
                            resolve();
                        });
                        internals.renderManager.requestFrame();
                    });
                    ran = true;
                });
            }
        };

        try {
            await element.waitForStableFrame();
        } finally {
            queue.waitForCompletion = drain;
        }

        assert.isTrue(queued, "an operation was queued after the drain");
        assert.isTrue(ran, "the wait resolved only after that operation had run");
    });

    it("resolves when a pass that paints nothing starts and ends between two frames", async () => {
        const internals = element.graph as unknown as Internals;
        const { updateManager, renderManager } = internals;
        const { deriving } = updateManager;
        let passing = true;
        let asked = 0;

        // No pass and no frame runs while held, so the pass below starts and ends between two.
        const release = renderManager.holdFrames();
        updateManager.deriving = () => {
            if (passing) {
                asked++;
                return true;
            }

            return deriving();
        };

        try {
            assert.isFalse(element.graph.isFrameStable, "the frame is not stable while the pass runs");
            const wait = element.waitForStableFrame();
            // A zero-delay yield: every step of the wait up to its check has run by then.
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            });
            assert.isAbove(asked, 1, "the wait looked while the pass ran");

            // The pass ends having painted nothing, and asks for a frame, as a real one does.
            passing = false;
            release();
            renderManager.requestFrame();
            await wait;
        } finally {
            release();
            updateManager.deriving = deriving;
        }

        assert.isTrue(element.graph.isFrameStable);
    });
});

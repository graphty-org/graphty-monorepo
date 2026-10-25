/**
 * @file A frame is called final only if the picture is still finished when it is drawn.
 *
 * The update pass decides whether the state it leaves is finished, and the frame is drawn after
 * it. Work that arrives between the two -- a load that brings nodes and starts the layout, then a
 * resize that says the view moved -- used to be drawn as a final frame on the pass's stale answer:
 * `graph-frame-stable` fired, `waitForStableFrame()` resolved, and every node still sat at the
 * hidden mesh template's position (issue #3517). Here the layout starts and the view moves inside
 * the frame, after its pass and before it is drawn, so the order is certain.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { LayoutManager } from "../../src/managers/LayoutManager.js";
import type { RenderManager } from "../../src/managers/RenderManager.js";
import type { UpdateManager } from "../../src/managers/UpdateManager.js";

const COUNT = 12;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % COUNT].id }));

describe("a stable frame after work that arrived behind the pass", () => {
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

    it("is not announced while the layout that work started is running", async () => {
        const { graph } = element;
        const internals = graph as unknown as {
            layoutManager: LayoutManager;
            renderManager: RenderManager;
            updateManager: UpdateManager;
        };
        const scene = graph.getScene();
        let announced = 0;
        const listener = graph.eventManager.addListener("graph-frame-stable", () => {
            announced++;
        });

        // After the frame's pass, before it is drawn: the layout starts and the view moves.
        await new Promise<void>((resolve) => {
            scene.onBeforeRenderObservable.addOnce(() => {
                internals.layoutManager.running = true;
                internals.updateManager.viewMoved();
                scene.onAfterRenderObservable.addOnce(() => {
                    resolve();
                });
            });
            internals.renderManager.requestFrame();
        });

        assert.strictEqual(announced, 0, "the frame drawn while the layout runs is not called final");
        graph.eventManager.removeListener(listener);
        await element.waitForStableFrame();
        assert.isFalse(internals.layoutManager.running, "the stable frame waited for the layout to rest");
    });
});

/**
 * @file A WebGL context lost and given back, as Safari does to a tab in the background: the
 * graph, edges included, is drawn again once the context returns.
 *
 * The loss and the return are the canvas's own `webglcontextlost` and `webglcontextrestored`
 * events, which is what Babylon and the element listen to. Babylon answers the return by
 * rebuilding every GPU buffer from the data it kept, and it keeps none for a thin-instance
 * buffer it was told about in part, so the edge batches came back empty and no edge was drawn
 * until it next moved. (Chromium in the test runner does not give a context back after
 * `WEBGL_lose_context.loseContext()`, so the events are dispatched here; the real loss and
 * return were checked by hand on the start page, where the stale GPU fence from the lost
 * context also stopped every frame.)
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * How many pixels around a point of the canvas differ from the canvas's corner.
 * @param canvas - The element's canvas.
 * @param at - The point, in CSS pixels.
 * @param at.x - Across.
 * @param at.y - Down.
 * @returns The count, in a 9 by 9 square.
 */
function inkAround(canvas: HTMLCanvasElement, at: { x: number; y: number }): number {
    const scale = canvas.width / canvas.clientWidth;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    if (context === null) {
        throw new Error("no 2D context");
    }
    context.drawImage(canvas, 0, 0);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    const { data } = context.getImageData(Math.round(at.x * scale) - 4, Math.round(at.y * scale) - 4, 9, 9);
    let inked = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) > 30) {
            inked++;
        }
    }
    return inked;
}

describe("a lost WebGL context", () => {
    it("draws the edges again once the context is given back", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([
            { id: "a", position: { x: -4, y: 0, z: 0 } },
            { id: "b", position: { x: 4, y: 0, z: 0 } },
        ]);
        await element.session.data.addEdges([{ src: "a", dst: "b" }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const scene = element.graph.getScene();
        const canvas = scene.getEngine().getRenderingCanvas();
        const a = element.nodeScreenPosition("a");
        const b = element.nodeScreenPosition("b");
        if (canvas === null || a === undefined || b === undefined) {
            throw new Error("the graph is not drawn");
        }
        // Halfway along the edge, where no node is.
        const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        await drawnFrames(scene, 2);
        assert.isAbove(inkAround(canvas, middle), 0, "the edge is drawn to start with");

        canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
        canvas.dispatchEvent(new Event("webglcontextrestored"));
        await drawnFrames(scene, 5);

        assert.isAbove(inkAround(canvas, middle), 0, "the edge is drawn again");
    });
});

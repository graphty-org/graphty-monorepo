/**
 * @file A WebGL context really lost (`WEBGL_lose_context.loseContext()`, which the browser never
 * gives back by itself): the element fires `render-lost` with a code, keeps the session as it
 * was, and `restartRenderer()` gets the same graph drawn again with nothing loaded again.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RenderLostEvent, RenderRestoredEvent } from "../../src/events";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { contextOf } from "../helpers/webgl-context";

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

/**
 * The next event of a name on the element.
 * @param element - The element.
 * @param name - The event.
 * @returns Its detail.
 */
function next<T>(element: Graphty, name: string): Promise<T> {
    return new Promise((resolve) => {
        element.addEventListener(
            name,
            (event) => {
                resolve((event as CustomEvent<T>).detail);
            },
            { once: true },
        );
    });
}

describe("a lost graphics device", () => {
    it("fires render-lost, keeps the session, and restartRenderer draws the graph again", async () => {
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
        // Nothing is lost yet: a restart has nothing to do.
        await element.restartRenderer();

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
        if (canvas === null || a === undefined) {
            throw new Error("the graph is not drawn");
        }
        await drawnFrames(scene, 2);
        assert.isAbove(inkAround(canvas, a), 0, "node a is drawn to start with");
        const camera = JSON.stringify(element.graph.getCameraState());
        assert.isTrue(element.session.canUndo, "the additions are undoable");

        const lost = next<RenderLostEvent>(element, "render-lost");
        const extension = contextOf(element.graph).getExtension("WEBGL_lose_context");
        assert.isNotNull(extension);
        extension.loseContext();
        const detail = await lost;

        assert.strictEqual(detail.code, "E_RENDER_LOST");
        assert.deepStrictEqual(detail.params, { renderer: "webgl" });
        assert.isFalse(element.rendererStatus?.drawing, "nothing is drawn while the context is lost");
        assert.strictEqual(element.session.status.counts.nodes, 2, "the nodes survive");
        assert.strictEqual(element.session.status.counts.edges, 1, "the edge survives");
        assert.isTrue(element.session.canUndo, "the undo history survives");

        const restored = next<RenderRestoredEvent>(element, "render-restored");
        await element.restartRenderer();
        assert.strictEqual((await restored).renderer, "webgl");
        assert.isTrue(element.rendererStatus?.drawing, "drawing again");
        await drawnFrames(scene, 5);

        assert.isAbove(inkAround(canvas, a), 0, "node a is drawn again");
        assert.strictEqual(JSON.stringify(element.graph.getCameraState()), camera, "the camera is where it was");
        assert.strictEqual(element.session.status.counts.nodes, 2);
        assert.isTrue(element.session.canUndo);
    });
});

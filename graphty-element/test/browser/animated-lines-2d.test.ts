/**
 * @file An animated straight solid line (`edge.animationSpeed`) moves in the 2D view too, on both render paths.
 *
 * In 2D every solid line used to go to the flat line renderer before the animated branch was asked, so
 * `edge.animationSpeed` drew nothing there: two frames of an animated edge were identical in 2D and differed in 3D.
 * This draws a few animated edges in 2D and compares two frames some counted frames apart (the mirror of the 3D case
 * in pulled-animated-lines.test.ts); at speed 0 the frames are the same.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** How many frames the loop draws between the two reads. */
const FRAMES_APART = 20;

const NODES = Array.from({ length: 4 }, (_, id) => ({
    id,
    position: { x: (id % 2) * 3 - 1.5, y: Math.floor(id / 2) * 3 - 1.5, z: 0 },
}));
const EDGES = [
    { src: 0, dst: 1 },
    { src: 1, dst: 3 },
    { src: 3, dst: 2 },
    { src: 2, dst: 0 },
];

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Mount an element in 2D on a render path with every edge a straight solid line at one speed.
 * @param path - The render path.
 * @param speed - The edges' animation speed.
 * @returns The element.
 */
async function loaded(path: RenderPath, speed: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    // Frames drawn continuously, so a still line at speed 0 is drawn the same counted frames apart as a moving one:
    // on demand, a still graph draws no frame at all and the two reads would be of one frame.
    element.renderOnDemand = false;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "animated",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.animationSpeed": speed, "edge.width": 6, "edge.arrowHead": "none", "edge.color": "#3355ff" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Resolve once the render loop has drawn some frames.
 * @param element - The element.
 * @param count - How many.
 */
async function framesDrawn(element: Graphty, count: number): Promise<void> {
    const scene = element.graph.getScene();
    await new Promise<void>((resolve) => {
        let drawn = 0;
        const observer = scene.onAfterRenderObservable.add(() => {
            drawn++;
            if (drawn >= count) {
                scene.onAfterRenderObservable.remove(observer);
                resolve();
            }
        });
    });
}

describe.each(["objects", "batched"] as const)("animated lines in 2D on the %s path", (path) => {
    it("moves an animated straight solid line from frame to frame", async () => {
        const element = await loaded(path, 3);
        const first: CanvasFrame = await readCanvas(element.graph);
        await framesDrawn(element, FRAMES_APART);
        const later = await readCanvas(element.graph);
        assert.isAbove(pixelsOverBar(first, later), 0, "the line's gradient moved between the frames");
    });

    it("draws the same frame twice at speed 0", async () => {
        const element = await loaded(path, 0);
        const first = await readCanvas(element.graph);
        await framesDrawn(element, FRAMES_APART);
        const later = await readCanvas(element.graph);
        assert.equal(pixelsOverBar(first, later), 0, "a line at speed 0 does not move");
    });
});

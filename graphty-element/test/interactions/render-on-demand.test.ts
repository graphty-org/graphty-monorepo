/**
 * @file `renderOnDemand`: a still graph draws no frames, and anything that changes the picture --
 * the reader's input, a style, the data -- draws it again.
 *
 * A still graph used to be drawn again on every animation frame. On a software GPU, which every
 * CI runner and headless browser has, each of those frames costs the page tens to hundreds of
 * milliseconds of its main thread, so a page holding a few still graphs answered a click slowly
 * (issue #1824). Frames are counted by the scene's own render id, and the
 * input is the browser's own (test/helpers/real-input.ts).
 *
 * Every test ends on {@link restsOnTheCurrentPicture}: once the element has stopped drawing, the
 * canvas must hold exactly what a fresh frame would draw. That is the failure a frame skipped too
 * early would cause -- a change made to the model and never put on screen.
 */

import "../../src/graphty-element";

import { MeshBuilder } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, drag, nextFrame, type Point, wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

/** How many animation frames in a row must pass undrawn for the graph to count as resting. */
const RESTING_FRAMES = 20;

/**
 * Draws across {@link RESTING_FRAMES} animation frames that count as drawing every frame: the
 * element's loop and the test's wait are separate animation-frame callbacks, so the first and
 * last frame may fall on either side of the count.
 */
const EVERY_FRAME = RESTING_FRAMES - 2;

/** Animation frames after which a still graph drawing on demand has come to rest. */
const SETTLING_FRAMES = 120;

/** How many animation frames a wait for rest may take before it gives up. */
const MAX_FRAMES = 1200;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn and final.
 * @param onDemand - Whether it draws on demand.
 * @param viewMode - The view mode; 3D unless named.
 * @returns The element.
 */
async function mounted(onDemand: boolean, viewMode: "2d" | "3d" = "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = onDemand;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "a", dst: "c" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Counts the frames the element draws from now on, by the scene's own render id, which every
 * drawn frame advances. Read rather than observed: a frame observer is itself something the loop
 * draws for.
 * @param element - The element.
 * @returns Reads the count so far.
 */
function countDraws(element: Graphty): { readonly count: () => number } {
    const { scene } = element.graph;
    const start = scene.getRenderId();
    return { count: () => scene.getRenderId() - start };
}

/**
 * Waits until the element has drawn nothing for {@link RESTING_FRAMES} animation frames in a row.
 * @param element - The element.
 * @returns How many animation frames it took.
 */
async function untilResting(element: Graphty): Promise<number> {
    const draws = countDraws(element);
    let quietSince = 0;
    for (let frame = 1; frame <= MAX_FRAMES; frame++) {
        const before = draws.count();
        await nextFrame();
        if (draws.count() !== before) {
            quietSince = frame;
        } else if (frame - quietSince >= RESTING_FRAMES) {
            return frame;
        }
    }

    throw new Error(`the element was still drawing after ${String(MAX_FRAMES)} animation frames`);
}

/**
 * Draws counted across some animation frames.
 * @param element - The element.
 * @param frames - How many animation frames.
 * @returns How many frames the element drew.
 */
async function drawsAcross(element: Graphty, frames: number): Promise<number> {
    const draws = countDraws(element);
    for (let i = 0; i < frames; i++) {
        await nextFrame();
    }

    return draws.count();
}

/**
 * Waits until the element rests, then checks that what it left on the canvas is what a frame drawn
 * now would show: nothing changed after its last frame went undrawn.
 * @param element - The element.
 */
async function restsOnTheCurrentPicture(element: Graphty): Promise<void> {
    await untilResting(element);
    const { canvas } = element.graph;
    const shown = canvas.toDataURL();
    element.graph.scene.render();
    assert.strictEqual(canvas.toDataURL(), shown, "the resting canvas shows the current picture");
}

/**
 * Where a node is drawn, read through the public API.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre on the canvas.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} has a screen position`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

describe("renderOnDemand", () => {
    it("is off by default, and a still graph is drawn on every frame", async () => {
        const element = await mounted(false);

        assert.isFalse(element.renderOnDemand);
        // Long enough for the same graph drawing on demand to have come to rest.
        await drawsAcross(element, SETTLING_FRAMES);
        assert.isAtLeast(await drawsAcross(element, RESTING_FRAMES), EVERY_FRAME, "the still graph is drawn again");
    });

    it("stops drawing a still graph", async () => {
        const element = await mounted(true);

        assert.isTrue(element.renderOnDemand);
        await restsOnTheCurrentPicture(element);
        assert.strictEqual(await drawsAcross(element, RESTING_FRAMES), 0, "a resting graph draws nothing");
    });

    it("draws while the reader turns the camera, then rests again", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const before = JSON.stringify(element.getCameraState());
        const draws = countDraws(element);

        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });
        await nextFrame();

        assert.notStrictEqual(JSON.stringify(element.getCameraState()), before, "the camera turned");
        assert.isAbove(draws.count(), 0, "the turn was drawn");
        await restsOnTheCurrentPicture(element);
    });

    it("draws a wheel zoom, then rests on the zoomed picture", async () => {
        const element = await mounted(true, "2d");
        await untilResting(element);
        const before = JSON.stringify(element.getCameraState());
        const draws = countDraws(element);

        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -200);
        await nextFrame();

        assert.notStrictEqual(JSON.stringify(element.getCameraState()), before, "the camera zoomed");
        assert.isAbove(draws.count(), 0, "the zoom was drawn");
        await restsOnTheCurrentPicture(element);
    });

    it("draws a click that selects a node, and the click that clears it", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);

        await click(element, at(element, "b"));
        await restsOnTheCurrentPicture(element);

        assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node");
        assert.isAbove(draws.count(), 0, "the selection was drawn");

        const cleared = countDraws(element);
        await click(element, EMPTY);
        await restsOnTheCurrentPicture(element);

        assert.isNull(element.getSelectedNode(), "the click on empty canvas cleared the selection");
        assert.isAbove(cleared.count(), 0, "the cleared selection was drawn");
    });

    it("draws the element at its new size after a resize", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);
        const width = element.graph.engine.getRenderWidth();

        element.style.width = `${String(WIDTH + 100)}px`;
        await restsOnTheCurrentPicture(element);

        assert.isAbove(element.graph.engine.getRenderWidth(), width, "the canvas grew");
        assert.isAbove(draws.count(), 0, "the new size was drawn");
    });

    it("draws a style change and still reaches a stable frame", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);

        await element.session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await element.waitForStableFrame();

        assert.isAbove(draws.count(), 0, "the new color was drawn");
        await restsOnTheCurrentPicture(element);
    });

    it("draws data added while resting", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);

        await element.session.data.addNodes([{ id: "d", position: { x: 0, y: -3, z: 0 } }]);
        await element.waitForStableFrame();

        assert.isAbove(draws.count(), 0, "the new node was drawn");
        assert.isDefined(element.nodeScreenPosition("d"), "the new node is placed");
        await restsOnTheCurrentPicture(element);
    });

    it("draws a mesh added through graph.scene once its shader is ready", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);

        MeshBuilder.CreateBox("added-from-outside", { size: 2 }, element.graph.scene);
        await restsOnTheCurrentPicture(element);
        assert.isAbove(draws.count(), 0, "the added mesh was drawn");
    });

    it("draws a selection style set while resting", async () => {
        const element = await mounted(true);
        await click(element, at(element, "b"));
        await untilResting(element);
        const restyled = countDraws(element);
        element.selectionStyle = { color: "#7CB342", scale: 2 };
        await restsOnTheCurrentPicture(element);
        assert.isAbove(restyled.count(), 0, "the new selection style was drawn");
    });

    it("draws a camera moved and animated through the API, then rests", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const moved = countDraws(element);

        await element.setCameraState({ position: { x: 0, y: 0, z: 40 }, target: { x: 0, y: 0, z: 0 } });
        await restsOnTheCurrentPicture(element);
        assert.isAbove(moved.count(), 0, "the camera move was drawn");

        const animated = countDraws(element);
        await element.setCameraState(
            { position: { x: 0, y: 30, z: 30 }, target: { x: 0, y: 0, z: 0 } },
            { animate: true, duration: 200 },
        );
        await restsOnTheCurrentPicture(element);
        assert.isAbove(animated.count(), 0, "the camera animation was drawn");
    });

    for (const animation of [
        { name: "an edge", target: "edge", set: { "edge.animationSpeed": 1 } },
        { name: "a label", target: "node", set: { "node.label": "LABEL", "node.labelStyle": { animation: "pulse" } } },
    ] as const) {
        it(`keeps drawing while ${animation.name} animates, and rests once it stops`, async () => {
            const element = await mounted(true);
            await untilResting(element);

            const layer = await element.session.styles.add({
                name: "moving",
                target: animation.target,
                selector: { match: "everything" },
                set: animation.set,
            });
            // Past the frames any edit draws while it settles, only the animation is left asking.
            await drawsAcross(element, SETTLING_FRAMES);
            assert.isAtLeast(await drawsAcross(element, RESTING_FRAMES), EVERY_FRAME, "the animation is drawn");

            await element.session.styles.remove(layer.id);
            await restsOnTheCurrentPicture(element);
        });
    }

    it("takes a screenshot of a resting graph, and rests again after it", async () => {
        const element = await mounted(true);
        await untilResting(element);

        const shot = await element.captureScreenshot({ multiplier: 1 });

        assert.isAbove(shot.blob.size, 0, "the screenshot holds an image");
        await restsOnTheCurrentPicture(element);
    });

    it("draws every frame of a video recording of a resting graph, and rests after it", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const draws = countDraws(element);

        const result = await element.graph.captureAnimation({ duration: 500, fps: 30, cameraMode: "stationary" });

        assert.isAbove(result.blob.size, 0, "the recording holds video");
        assert.isAbove(draws.count(), 5, "the still graph was drawn while it was recorded");
        await restsOnTheCurrentPicture(element);
    });

    it("switched off, draws every frame again", async () => {
        const element = await mounted(true);
        await untilResting(element);

        element.renderOnDemand = false;

        assert.isAtLeast(await drawsAcross(element, RESTING_FRAMES), EVERY_FRAME, "the still graph is drawn again");
    });
});

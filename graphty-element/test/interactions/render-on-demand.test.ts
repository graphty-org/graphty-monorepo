/**
 * @file `renderOnDemand`: a still graph draws no frames, and anything that changes the picture --
 * the reader's input, a style, the data -- draws it again.
 *
 * A still graph used to be drawn again on every animation frame. On a software GPU, which every
 * CI runner and headless browser has, each of those frames costs the page tens to hundreds of
 * milliseconds of its main thread, so a page holding a few still graphs answered a click slowly
 * (issue #1824). Frames are counted by the scene's own render id and by the render loop's own
 * count of its ticks, and the input is the browser's own (test/helpers/real-input.ts).
 *
 * Every test ends on {@link restsOnTheCurrentPicture}: once the element has stopped drawing, the
 * canvas must hold exactly what a fresh frame would draw. That is the failure a frame skipped too
 * early would cause -- a change made to the model and never put on screen.
 */

import "../../src/graphty-element";

import { CreateScreenshotAsync, MeshBuilder } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
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

/** How many of the loop's chances to draw in a row must pass undrawn for the graph to count as resting. */
const RESTING_TICKS = 20;

/** The loop's chances to draw after which a still graph drawing on demand has come to rest. */
const SETTLING_TICKS = 120;

/** How many frames a wait for rest lets the element draw before it gives up. */
const MAX_DRAWS = 1200;

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
 * What the element's render loop has done with its ticks: drawn a frame, or rested on the one
 * shown. A tick that waited for the GPU is neither, because it had no chance to draw; counting
 * the loop's chances rather than animation frames is what keeps these tests true on a machine
 * that skips or adds frames.
 * @param element - The element.
 * @returns The loop's running counts.
 */
function loopTicks(element: Graphty): { readonly drawn: number; readonly rested: number } {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager.ticks;
}

/**
 * Waits until the element has rested on {@link RESTING_TICKS} of its chances to draw in a row.
 * @param element - The element.
 */
async function untilResting(element: Graphty): Promise<void> {
    const ticks = loopTicks(element);
    const firstDraw = ticks.drawn;
    let lastDraw = ticks.drawn;
    let restedSince = ticks.rested;
    while (ticks.rested - restedSince < RESTING_TICKS) {
        if (ticks.drawn - firstDraw > MAX_DRAWS) {
            throw new Error(`the element was still drawing after ${String(MAX_DRAWS)} frames`);
        }

        await nextFrame();
        if (ticks.drawn !== lastDraw) {
            lastDraw = ticks.drawn;
            restedSince = ticks.rested;
        }
    }
}

/**
 * What the element did with some of its render loop's chances to draw.
 * @param element - The element.
 * @param chances - How many ticks that could draw to wait for.
 * @returns How many of them drew a frame and how many rested.
 */
async function ticksAcross(element: Graphty, chances: number): Promise<{ drawn: number; rested: number }> {
    const ticks = loopTicks(element);
    const { drawn, rested } = ticks;
    while (ticks.drawn - drawn + (ticks.rested - rested) < chances) {
        await nextFrame();
    }

    return { drawn: ticks.drawn - drawn, rested: ticks.rested - rested };
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
        await ticksAcross(element, SETTLING_TICKS);
        const drawing = await ticksAcross(element, RESTING_TICKS);
        assert.strictEqual(drawing.rested, 0, "the still graph is drawn again at every chance");
        assert.isAtLeast(drawing.drawn, RESTING_TICKS, "it drew at every chance it had");
    });

    it("stops drawing a still graph", async () => {
        const element = await mounted(true);

        assert.isTrue(element.renderOnDemand);
        await restsOnTheCurrentPicture(element);
        const resting = await ticksAcross(element, RESTING_TICKS);
        assert.strictEqual(resting.drawn, 0, "a resting graph draws nothing");
        assert.isAtLeast(resting.rested, RESTING_TICKS, "at every chance it had to draw");
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

    it("draws again after a resize that ends at the size it rested at", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const { canvas, engine } = element.graph;
        const width = engine.getRenderWidth();
        const draws = countDraws(element);

        // What a page that shrinks the window to 1 x 1 and restores it before the loop's next
        // tick does: the element's ResizeObserver resizes the engine at each size, and assigning
        // the canvas's width clears its drawing even when the size ends where it was. Driven
        // through the engine because a ResizeObserver cannot be made to report both sizes
        // between two of the loop's ticks.
        element.style.width = "1px";
        engine.resize();
        element.style.width = `${String(WIDTH)}px`;
        engine.resize();
        assert.strictEqual(engine.getRenderWidth(), width, "the canvas is back at its size");

        await restsOnTheCurrentPicture(element);
        assert.isAbove(draws.count(), 0, "the cleared canvas was drawn again");
        const copy = document.createElement("canvas");
        copy.width = canvas.width;
        copy.height = canvas.height;
        const context = copy.getContext("2d");
        assert.isNotNull(context);
        context.drawImage(canvas, 0, 0);
        const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
        assert.isTrue(
            pixels.some((value, i) => i % 4 === 3 && value !== 0),
            "the canvas is not empty",
        );
    });

    for (const onDemand of [true, false]) {
        it(`holds a drawn graph in the frame a resize is painted in (renderOnDemand ${String(onDemand)})`, async () => {
            const element = await mounted(onDemand);
            if (onDemand) {
                await untilResting(element);
            }

            const { canvas } = element.graph;
            // Created after the element's own ResizeObserver, so the browser delivers the same
            // size change to it right after the element's, in the same rendering step, before
            // that step paints and before any animation frame can draw: the drawing buffer read
            // here is exactly what the page shows for the resize (and what a full-page
            // screenshot, which resizes the page, captures).
            const height = HEIGHT + 100;
            const painted = new Promise<boolean>((resolve) => {
                const observer = new ResizeObserver(([entry]) => {
                    // The first delivery observes the size the element already had.
                    if (entry.contentRect.height !== height) {
                        return;
                    }

                    observer.disconnect();
                    const copy = document.createElement("canvas");
                    copy.width = canvas.width;
                    copy.height = canvas.height;
                    const context = copy.getContext("2d");
                    assert.isNotNull(context);
                    context.drawImage(canvas, 0, 0);
                    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
                    resolve(pixels.some((value, i) => i % 4 === 3 && value !== 0));
                });
                observer.observe(element);
                cleanups.push(() => {
                    observer.disconnect();
                });
            });
            element.style.height = `${String(height)}px`;

            assert.isTrue(await painted, "the canvas holds a frame, not the buffer the resize cleared");
        });
    }

    // A full-page screenshot on a software GPU (#3704): the screenshot shrinks the page and
    // restores it in two quick steps while the GPU is still drawing an earlier frame. The second
    // resize clears the canvas again, and the frame the screenshot caught was empty.
    describe("while the GPU is still drawing an earlier frame", () => {
        /**
         * Holds the element's GPU behind for the rest of the test, as a software GPU under load
         * is: what the fence of the last frame says cannot be made slow on purpose.
         * @param element - The element.
         */
        function gpuStaysBehind(element: Graphty): void {
            const manager = (element.graph as unknown as { renderManager: { gpuBehind: () => boolean } }).renderManager;
            const spy = vi.spyOn(manager, "gpuBehind").mockReturnValue(true);
            cleanups.push(() => {
                spy.mockRestore();
            });
        }

        /**
         * Whether the canvas's drawing buffer holds a frame rather than the empty buffer a resize
         * leaves.
         * @param canvas - The element's canvas.
         * @returns True when any pixel is drawn.
         */
        function holdsAFrame(canvas: HTMLCanvasElement): boolean {
            const copy = document.createElement("canvas");
            copy.width = canvas.width;
            copy.height = canvas.height;
            const context = copy.getContext("2d");
            assert.isNotNull(context);
            context.drawImage(canvas, 0, 0);
            return context
                .getImageData(0, 0, copy.width, copy.height)
                .data.some((value, i) => i % 4 === 3 && value !== 0);
        }

        it("holds a drawn graph in the frame of each of two resizes in a row", async () => {
            const element = await mounted(true);
            await untilResting(element);
            gpuStaysBehind(element);
            const { canvas } = element.graph;

            // Each size is read in the rendering step its resize is painted in, by an observer
            // created after the element's, so the element has resized (and drawn) first.
            for (const height of [HEIGHT - 100, HEIGHT]) {
                const painted = new Promise<boolean>((resolve) => {
                    const observer = new ResizeObserver(([entry]) => {
                        if (entry.contentRect.height !== height) {
                            return;
                        }

                        observer.disconnect();
                        resolve(holdsAFrame(canvas));
                    });
                    observer.observe(element);
                    cleanups.push(() => {
                        observer.disconnect();
                    });
                });
                element.style.height = `${String(height)}px`;

                assert.isTrue(await painted, `the canvas holds a frame at height ${String(height)}`);
                // The next size in the next rendering step, as the screenshot's restore comes.
                await nextFrame();
            }
        });

        it("holds a drawn graph after a resize the window's resize event makes", async () => {
            const element = await mounted(true);
            await untilResting(element);
            gpuStaysBehind(element);
            const { canvas, engine } = element.graph;
            const width = engine.getRenderWidth();

            // The window's resize event can reach the element before its ResizeObserver does,
            // and then it is the call that assigns the new size.
            element.style.width = `${String(WIDTH + 100)}px`;
            globalThis.dispatchEvent(new Event("resize"));

            assert.isAbove(engine.getRenderWidth(), width, "the window's resize event resized the canvas");
            assert.isTrue(holdsAFrame(canvas), "the canvas holds a frame, not the buffer the resize cleared");
        });
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

    it("draws a mesh added ready to draw in one frame, not again to check it", async () => {
        const element = await mounted(true);
        MeshBuilder.CreateBox("first-box", { size: 1 }, element.graph.scene);
        await untilResting(element);
        const before = loopTicks(element).drawn;

        // Its shader is the first box's, already compiled: the frame that adds it draws it whole.
        MeshBuilder.CreateBox("second-box", { size: 2 }, element.graph.scene);
        await untilResting(element);
        assert.strictEqual(loopTicks(element).drawn - before, 1, "one frame for the added mesh");
        await restsOnTheCurrentPicture(element);
    });

    // A frame drawn again only to check that the one before left nothing moving costs a software
    // GPU 200 to 800 ms of the page's main thread under load, and a reader's click waits behind it
    // (#3537). A change made outside a frame is drawn by one frame.
    it("draws a resize in one frame, not again to check it", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const before = loopTicks(element).drawn;

        element.style.height = `${String(HEIGHT - 60)}px`;
        await untilResting(element);
        assert.strictEqual(loopTicks(element).drawn - before, 1, "one frame for the new size");
        await restsOnTheCurrentPicture(element);
    });

    it("draws a camera moved through the API in one frame, not again to check it", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const before = loopTicks(element).drawn;

        await element.setCameraState({ position: { x: 0, y: 0, z: 40 }, target: { x: 0, y: 0, z: 0 } });
        await untilResting(element);
        assert.strictEqual(loopTicks(element).drawn - before, 1, "one frame for the moved camera");
        await restsOnTheCurrentPicture(element);
    });

    it("keeps drawing a camera that something moves inside each frame, until it stops", async () => {
        const element = await mounted(true);
        await untilResting(element);
        const { scene } = element.graph;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const STEPS = 10;
        let steps = 0;
        // Moves the camera only while a frame is drawn, as an inertia applied in onBeforeRender
        // does: no tick can see the move before the frame that makes it.
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (steps < STEPS) {
                steps++;
                camera.position.z -= 1;
            }
        });
        cleanups.push(() => {
            scene.onBeforeRenderObservable.remove(observer);
        });

        await restsOnTheCurrentPicture(element);
        assert.strictEqual(steps, STEPS, "every step of the move was drawn");
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
            await ticksAcross(element, SETTLING_TICKS);
            const drawing = await ticksAcross(element, RESTING_TICKS);
            assert.strictEqual(drawing.rested, 0, "the animation is drawn at every chance");
            assert.isAtLeast(drawing.drawn, RESTING_TICKS, "it drew at every chance it had");

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

    it("takes a see-through screenshot of a resting graph, at the size and quality asked for", async () => {
        const element = await mounted(true, "2d");
        await untilResting(element);
        // The real canvas read, not test/setup.ts's stand-in picture.
        const babylon = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
        vi.mocked(CreateScreenshotAsync).mockImplementationOnce(babylon.CreateScreenshotAsync);

        const shot = await element.captureScreenshot({
            format: "webp",
            quality: 0.5,
            width: 320,
            height: 240,
            transparentBackground: true,
        });

        // Quality is the encoder's: it does not shrink the picture.
        const picture = await createImageBitmap(shot.blob);
        assert.strictEqual(picture.width, 320);
        assert.strictEqual(picture.height, 240);
        // The resting graph drew a frame with the background cleared, rather than handing back its
        // last frame with the background in it.
        const corner = new OffscreenCanvas(1, 1).getContext("2d");
        assert.isNotNull(corner);
        corner.drawImage(picture, 0, 0);
        assert.strictEqual(corner.getImageData(0, 0, 1, 1).data[3], 0, "the corner is see-through");
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

        const drawing = await ticksAcross(element, RESTING_TICKS);
        assert.strictEqual(drawing.rested, 0, "the still graph is drawn again at every chance");
        assert.isAtLeast(drawing.drawn, RESTING_TICKS, "it drew at every chance it had");
    });
});

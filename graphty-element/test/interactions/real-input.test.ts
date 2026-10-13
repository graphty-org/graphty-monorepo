/**
 * @file The element under real input: the mouse, the wheel, the keyboard (Ctrl and Cmd), a
 * two-finger pinch and a high-DPI screen, every event made by the browser's own input pipeline
 * (test/helpers/real-input.ts), and every outcome read through the element's public API -- the
 * camera moved, a node selected and not pinned, a hover reported, a step undone.
 *
 * Nothing here calls `notifyObservers`, writes a controller's state or fires a synthetic DOM
 * event, so a removed listener, a lost `touch-action`, focus handling or a pixel-ratio mistake
 * fails here, where the older interaction tests (which reach their state through internals) pass.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import {
    click,
    drag,
    hover,
    nextFrame,
    pinch,
    type Point,
    touchDrag,
    wheel,
    withDevicePixelRatio,
} from "../helpers/real-input";

// Inside the test frame's 414-pixel-wide viewport.
const WIDTH = 400;
const HEIGHT = 300;

/**
 * Three nodes at fixed places, so each one's spot on screen is known before any input. Node c is
 * off the Z = 0 plane: a 2D view must put it on the plane (issue #1341).
 */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 4 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
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
 * Where a node is drawn, from the element's public API.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * How far apart nodes a and b are drawn, on screen or not: how zoomed in the view is.
 * @param element - The element.
 * @returns The distance in CSS pixels.
 */
function spread(element: Graphty): number {
    const a = element.nodeScreenPosition("a");
    const b = element.nodeScreenPosition("b");
    assert.isDefined(a);
    assert.isDefined(b);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * The camera as the element reports it, for comparing before and after.
 * @param element - The element.
 * @returns The camera state as a string.
 */
function camera(element: Graphty): string {
    return JSON.stringify(element.getCameraState());
}

/**
 * Let a few frames run, so input the element reads once a frame has landed.
 * @param frames - How many.
 */
async function frames(frames = 3): Promise<void> {
    for (let i = 0; i < frames; i++) {
        await nextFrame();
    }
}

describe("the mouse", () => {
    it("a drag across empty canvas turns the 3D camera", async () => {
        const element = await mounted("3d");
        const before = camera(element);

        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });
        await frames();

        assert.notStrictEqual(camera(element), before, "the camera turned");
        assert.isNull(element.getSelectedNode(), "a drag on empty canvas selects nothing");
    });

    it("a drag across empty canvas pans the 2D view, and the drawing follows the pointer", async () => {
        const element = await mounted("2d");
        const start = at(element, "a");

        await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
        await frames();

        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 60, 2, "the node moved right with the pointer");
        assert.closeTo(end.y - start.y, -30, 2, "the node moved up with the pointer");
    });

    it("the wheel zooms the 2D view", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -200);
        await frames();

        assert.isAbove(spread(element), gap, "scrolling up zoomed in");
    });

    describe.each(["2d", "3d"] as const)("in %s", (viewMode) => {
        it("a click on a node selects it and does not pin it", async () => {
            const element = await mounted(viewMode);

            await click(element, at(element, "b"));
            await frames();

            assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node under it");
            assert.isFalse(element.isPinned("b"), "a click is not a placement, so nothing is pinned");

            await click(element, EMPTY);
            await frames();
            assert.isNull(element.getSelectedNode(), "a click on empty canvas clears the selection");
        });

        it("dragging a node moves it to the pointer and pins it there", async () => {
            const element = await mounted(viewMode);
            const from = at(element, "c");
            const to = { x: from.x + 50, y: from.y + 40 };

            await drag(element, from, to);
            await frames();

            const now = at(element, "c");
            assert.closeTo(now.x, to.x, 3, "the node followed the pointer across");
            assert.closeTo(now.y, to.y, 3, "the node followed the pointer down");
            assert.isTrue(element.isPinned("c"), "a node the pointer placed is pinned");
        });

        it("pointing at a node reports the hover", async () => {
            const element = await mounted(viewMode);
            const hovered: unknown[] = [];
            element.addEventListener("graphty-node-hover", (event) => {
                hovered.push((event as CustomEvent<{ nodeId: unknown }>).detail.nodeId);
            });

            await hover(element, EMPTY);
            await frames(1);
            await hover(element, at(element, "a"));
            await frames(1);

            assert.deepStrictEqual(hovered, ["a"], "one hover, for the node under the pointer");
        });
    });
});

describe("the 2D view", () => {
    it("a graph laid out in 3D lies flat once the view is 2D, so its edges end at their nodes", async () => {
        // The reader loads in 3D and switches to 2D: the orthographic camera hides a leftover Z,
        // but an edge to that node is drawn as long as the 3D distance and runs past it.
        const element = await mounted("2d");

        for (const { id } of NODES) {
            assert.closeTo(element.getNode(id)?.getPosition().z ?? Number.NaN, 0, 1e-6, `node ${id} is on the plane`);
        }
    });
});

/**
 * Wait until the camera has stopped moving: two frames in a row with the same camera state.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    let last = camera(element);
    for (;;) {
        await nextFrame();
        const now = camera(element);
        if (now === last) {
            return;
        }

        last = now;
    }
}

/**
 * Hold a key for exactly `count` of the camera input's per-frame updates, then let the camera
 * coast to a stop.
 *
 * The frames are counted where the input runs, not as animation frames: the render loop skips a
 * tick while the GPU is still drawing the last frame, so 30 animation frames can bring 29 updates.
 * And the frames stop at the count: from the last one until the key-up arrives the render loop is
 * held, so however long the browser takes to deliver the key-up, the key moves the camera exactly
 * `count` times and never as far as a zoom limit. The key itself is real input; only the clock is
 * stopped.
 * @param element - The element.
 * @param key - The key, as userEvent names it.
 * @param name - The camera whose input reads the key: "orbit" (3D) or "2d".
 * @param count - How many frames to hold it for.
 */
async function hold(element: Graphty, key: string, name: "orbit" | "2d", count: number): Promise<void> {
    const { canvas } = element.graph;
    const input = (element.graph.camera as unknown as { inputs: Map<string, { update(): void }> }).inputs.get(name);
    assert.isDefined(input);
    const { renderManager } = element.graph as unknown as { renderManager: RenderManager };
    const update = input.update.bind(input);
    let held = false;
    let heldFrames = 0;
    let releaseFrames = (): void => undefined;
    input.update = (): void => {
        update();
        if (held && ++heldFrames === count) {
            releaseFrames = renderManager.holdFrames();
        }
    };
    // The controller's own key listeners were added first, so these run after it saw each key
    const press = (): void => {
        held = true;
    };
    const release = (): void => {
        held = false;
        releaseFrames();
    };
    canvas.addEventListener("keydown", press);
    canvas.addEventListener("keyup", release);
    cleanups.push(() => {
        releaseFrames();
        input.update = update;
        canvas.removeEventListener("keydown", press);
        canvas.removeEventListener("keyup", release);
    });

    await userEvent.keyboard(`{${key}>}`);
    while (heldFrames < count) {
        await nextFrame();
    }

    await userEvent.keyboard(`{/${key}}`);
    await settled(element);
    assert.strictEqual(heldFrames, count, "the key was held for the frames counted");
}

describe("the keyboard", () => {
    it("does not take focus from the page when it loads", async () => {
        const input = document.createElement("input");
        document.body.appendChild(input);
        cleanups.push(() => {
            input.remove();
        });
        input.focus();

        await mounted("3d");

        assert.strictEqual(document.activeElement, input, "the page's field kept its focus");
    });

    it.each([
        ["Ctrl", "Control"],
        ["Cmd", "Meta"],
    ])("%s+Z undoes, %s+Shift+Z redoes, after a click focused the canvas", async (_name, modifier) => {
        const element = await mounted("3d");
        // A click is how a reader gives the canvas the keyboard; it must take focus itself.
        await click(element, EMPTY);
        assert.isTrue(element.graph.canvas.matches(":focus"), "the click focused the canvas");
        const { position } = element.session.history;

        await userEvent.keyboard(`{${modifier}>}z{/${modifier}}`);
        assert.strictEqual(element.session.history.position, position - 1, "one step undone");

        await userEvent.keyboard(`{${modifier}>}{Shift>}z{/Shift}{/${modifier}}`);
        assert.strictEqual(element.session.history.position, position, "and redone");
    });

    it("holding an arrow key turns the 3D camera", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = camera(element);

        await hold(element, "ArrowLeft", "orbit", 5);

        assert.notStrictEqual(camera(element), before, "the camera turned");
    });

    // A and D spin by a fixed angle every frame they are held. A held arrow must turn at the same
    // angular speed and hold it, not keep speeding up (issue #2292): over the press and the coast
    // after it, the angle turned is the A and D rate times the frames held.
    it.each([
        ["a", "z", 1],
        ["d", "z", -1],
        ["ArrowLeft", "y", -1],
        ["ArrowRight", "y", 1],
        ["ArrowUp", "x", -1],
        ["ArrowDown", "x", 1],
    ] as const)("holding %s turns the 3D camera at the A and D rate", async (key, axis, sign) => {
        const element = await mounted("3d");
        await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
        await click(element, EMPTY);
        const before = element.getCameraState().pivotRotation?.[axis] ?? Number.NaN;

        const heldFrames = 30;
        await hold(element, key, "orbit", heldFrames);

        const after = element.getCameraState().pivotRotation?.[axis] ?? Number.NaN;
        const perFrame = (sign * (after - before)) / heldFrames;
        // 0.02 radians a frame is keyboardYawSpeed, A and D's rate
        assert.closeTo(perFrame, 0.02, 0.0004, `radians per frame held, about ${axis}`);
    });

    // The 2D view's + and - keys zoom by zoomFactorPerFrame (0.02 in log space) per frame held,
    // not by the many times that a velocity accumulated every frame reaches.
    it.each([
        ["=", 1],
        ["-", -1],
    ] as const)("holding %s zooms the 2D view by 0.02 (log) per frame held", async (key, sign) => {
        const element = await mounted("2d");
        await click(element, EMPTY);
        const before = element.getCameraState().zoom ?? Number.NaN;

        const heldFrames = 30;
        await hold(element, key, "2d", heldFrames);

        const after = element.getCameraState().zoom ?? Number.NaN;
        assert.closeTo((sign * Math.log(after / before)) / heldFrames, 0.02, 0.0004, "log zoom per frame held");
    });

    // W and S move the camera by the same fraction of its distance every frame they are held, so
    // the zoom is as quick far out as close in: 0.985 per frame, tenfold over the 157 frames A or
    // D take to spin half a turn.
    describe.each([
        ["close in", 6],
        ["far out", 600],
    ])("holding W or S, %s", (_where, start) => {
        it.each([
            ["W", 0.985],
            ["S", 1 / 0.985],
        ])("%s changes the 3D camera's distance by a factor of %f per frame", async (key, perFrame) => {
            const element = await mounted("3d");
            await element.setCameraState({ cameraDistance: start });
            await click(element, EMPTY);

            const before = element.getCameraState().cameraDistance ?? Number.NaN;
            assert.closeTo(before, start, 1e-6, "the camera starts at the distance set");

            const heldFrames = 10;
            await hold(element, key.toLowerCase(), "orbit", heldFrames);

            const after = element.getCameraState().cameraDistance ?? Number.NaN;
            assert.closeTo(after / before, perFrame ** heldFrames, 1e-9, "one factor per frame held");
        });
    });
});

describe("touch", () => {
    it("a finger dragged across the 2D view pans the drawing and does not scroll the page", async () => {
        // A page taller than the frame, so a finger the canvas did not claim (touch-action) would
        // scroll the page instead of reaching the element.
        const element = await mounted("2d");
        const spacer = document.createElement("div");
        spacer.style.height = "3000px";
        document.body.appendChild(spacer);
        cleanups.push(() => {
            spacer.remove();
            window.scrollTo(0, 0);
        });
        const start = at(element, "a");

        await touchDrag(element, EMPTY, { x: EMPTY.x + 40, y: EMPTY.y - 80 });
        await frames();

        assert.strictEqual(window.scrollY, 0, "the page did not scroll");
        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 40, 3, "the drawing followed the finger across");
        assert.closeTo(end.y - start.y, -80, 3, "the drawing followed the finger up");
    });

    it("spreading two fingers zooms the 2D view in", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await frames();

        assert.isAbove(spread(element), gap * 1.5, "the drawing grew with the fingers");
    });

    it("spreading two fingers zooms the 3D view in", async () => {
        const element = await mounted("3d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await frames();

        assert.isAbove(spread(element), gap, "the drawing grew with the fingers");
    });
});

describe("a high-DPI screen", () => {
    it.each(["2d", "3d"] as const)(
        "at a device pixel ratio of 2, in %s, a click lands on the node drawn under it and a drag follows the pointer",
        async (viewMode) => {
            await withDevicePixelRatio(2, async () => {
                assert.strictEqual(window.devicePixelRatio, 2);
                const element = await mounted(viewMode);

                await click(element, at(element, "b"));
                await frames();
                assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node drawn under it");

                const from = at(element, "c");
                const to = { x: from.x - 40, y: from.y + 30 };
                await drag(element, from, to);
                await frames();
                const now = at(element, "c");
                assert.closeTo(now.x, to.x, 3, "the dragged node is under the pointer");
                assert.closeTo(now.y, to.y, 3, "the dragged node is under the pointer");
            });
        },
    );
});

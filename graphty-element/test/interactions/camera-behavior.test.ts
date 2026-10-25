/**
 * @file `layoutBehavior.camera.autoRotate` and `layoutBehavior.camera.fitInsets`, and a tap on an
 * arrow key, driven through the browser's own input and read through the public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, type Point, press, release } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding a small graph at fixed places, drawn.
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
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
        { id: "c", position: { x: 0, y: 3, z: 4 } },
    ]);
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
 * The camera as the element reports it.
 * @param element - The element.
 * @returns The camera state as a string.
 */
function camera(element: Graphty): string {
    return JSON.stringify(element.getCameraState());
}

/**
 * The middle of the box the nodes are drawn in, in CSS pixels.
 * @param element - The element.
 * @returns Its center.
 */
function drawnCenter(element: Graphty): Point {
    const points = ["a", "b", "c"].map((id) => {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at);
        return at;
    });
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

describe("camera.autoRotate", () => {
    it("is off by default: frames pass and the camera stays put", async () => {
        const element = await mounted("3d");
        const before = camera(element);

        await drawnFrames(element.graph.getScene(), 10);

        assert.strictEqual(camera(element), before);
    });

    it("turns the 3D camera every frame, and the picture still settles", async () => {
        const element = await mounted("3d");
        const yaw = (): number => element.getCameraState().pivotRotation?.y ?? Number.NaN;
        element.autoRotate = 1;
        assert.strictEqual(element.autoRotate, 1);
        assert.strictEqual(element.layoutBehavior?.camera?.autoRotate, 1, "the same setting as layoutBehavior's");
        const before = yaw();

        await drawnFrames(element.graph.getScene(), 10);

        assert.notStrictEqual(yaw(), before, "the camera turned on its own");
        // The turning is not a picture still being finished.
        await element.waitForStableFrame();
    });

    it("waits while the reader holds the pointer down, and turns again after", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { autoRotate: 1 } };
        await drawnFrames(element.graph.getScene(), 2);

        await press(element, EMPTY);
        await drawnFrames(element.graph.getScene(), 2);
        const held = camera(element);
        await drawnFrames(element.graph.getScene(), 10);
        assert.strictEqual(camera(element), held, "no turning while the pointer is down");

        await release(element, EMPTY);
        await drawnFrames(element.graph.getScene(), 10);
        assert.notStrictEqual(camera(element), held, "turning again once it is let go");
    });

    it("never turns the 2D view", async () => {
        const element = await mounted("2d");
        element.layoutBehavior = { camera: { autoRotate: 1 } };
        const before = camera(element);

        await drawnFrames(element.graph.getScene(), 10);

        assert.strictEqual(camera(element), before);
    });
});

describe("camera.fitInsets", () => {
    it.each(["3d", "2d"] as const)("frames the %s graph in the area the insets leave", async (mode) => {
        const element = await mounted(mode);
        const centered = drawnCenter(element);
        assert.closeTo(centered.x, WIDTH / 2, 20, "framed in the whole canvas by default");

        element.fitInsets = { left: 200 };
        assert.deepStrictEqual(element.fitInsets, { top: 0, right: 0, bottom: 0, left: 200 });
        await drawnFrames(element.graph.getScene(), 1);
        await element.waitForStableFrame();

        const shifted = drawnCenter(element);
        assert.closeTo(shifted.x, 200 + (WIDTH - 200) / 2, 20, "centered in what the left inset leaves");
        for (const id of ["a", "b", "c"]) {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at);
            assert.isAbove(at.x, 200 - (at.radius ?? 0), `${id} is drawn right of the inset`);
        }
    });

    it("keeps the 3D graph in that area while it turns", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { fitInsets: { left: 200 }, autoRotate: 2 } };
        await drawnFrames(element.graph.getScene(), 1);
        await element.waitForStableFrame();

        await drawnFrames(element.graph.getScene(), 30);

        assert.isAbove(drawnCenter(element).x, 200, "the turning graph stays right of the inset");
    });
});

describe("pixelRatio", () => {
    it("draws the canvas at that many pixels per CSS pixel, and measures in CSS pixels", async () => {
        const element = await mounted("3d");
        const { canvas } = element.graph;
        assert.strictEqual(element.pixelRatio, 1, "one pixel per CSS pixel by default");
        assert.strictEqual(canvas.width, WIDTH);
        const before = element.nodeScreenPosition("a");
        assert.isDefined(before);

        element.pixelRatio = 2;
        await drawnFrames(element.graph.getScene(), 2);
        await element.waitForStableFrame();

        assert.strictEqual(canvas.width, WIDTH * 2, "the drawing buffer is twice as wide");
        assert.strictEqual(canvas.height, HEIGHT * 2, "and twice as tall");
        const after = element.nodeScreenPosition("a");
        assert.isDefined(after);
        assert.closeTo(after.x, before.x, 1, "a node is where it was, in CSS pixels");
        assert.closeTo(after.y, before.y, 1);
        assert.closeTo(after.radius, before.radius, 1, "and as big");

        // A click still lands on the node it is over.
        await click(element, { x: after.x, y: after.y });
        assert.deepStrictEqual(element.session.selection.nodes, ["a"], "the click selected the node");
    });
});

describe("the keyboard", () => {
    it("a tap on an arrow key turns the 3D camera, however short", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = camera(element);

        // Down and up with no frame between them.
        await userEvent.keyboard("{ArrowLeft}");
        await drawnFrames(element.graph.getScene(), 2);

        assert.notStrictEqual(camera(element), before, "the camera turned");
    });

    it("a tap on an arrow key turns the 3D camera by a step the reader can see", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = element.getCameraState();
        const turning = framesTurning(element);

        await userEvent.keyboard("{ArrowLeft}");
        await drawnFrames(element.graph.getScene(), 20);

        const after = element.getCameraState();
        const turned = Math.abs(angleAround(after) - angleAround(before));
        // Eight frames of 0.02 rad: 0.16 rad, about 9 degrees. userEvent sends the key's down and
        // up as two protocol commands, and on a busy machine frames are drawn between them: the
        // key was then held that many frames, and a hold longer than the step turns every frame.
        const frames = turning();
        assert.closeTo(turned, frames * 0.02, 0.03, `one tap turns the camera ${String(frames)} frames of 0.02 rad`);
    });

    it("quick taps each turn a full step", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = element.getCameraState();
        const turning = framesTurning(element);

        // Three taps: each owes its own eight frames, 0.48 rad in all when no frame is drawn while
        // a key is down. userEvent sends every down and up as its own protocol command, and on a
        // busy machine frames are drawn between them; those held frames turn too.
        await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
        await drawnFrames(element.graph.getScene(), 40);

        const turned = Math.abs(angleAround(element.getCameraState()) - angleAround(before));
        const frames = turning();
        assert.isAtLeast(frames, 24, "three taps owe three steps");
        assert.closeTo(turned, frames * 0.02, 0.06, `three taps turn the camera ${String(frames)} frames of 0.02 rad`);
    });
});

/**
 * Count the frames an arrow key should turn the camera: every frame drawn while a key is down on
 * the element's canvas, and every frame of the eight each press owes, added up across presses.
 * @param element - The element.
 * @returns A function returning the count so far.
 */
function framesTurning(element: Graphty): () => number {
    const { canvas } = element.graph;
    let down = false;
    let owed = 0;
    let frames = 0;
    const onDown = (evt: KeyboardEvent): void => {
        down = true;
        owed += evt.repeat ? 0 : 8;
    };
    const onUp = (): void => {
        down = false;
    };
    canvas.addEventListener("keydown", onDown, { capture: true });
    canvas.addEventListener("keyup", onUp, { capture: true });
    const observer = element.graph.getScene().onBeforeRenderObservable.add(() => {
        frames += Number(down || owed > 0);
        owed = Math.max(0, owed - 1);
    });
    cleanups.push(() => {
        canvas.removeEventListener("keydown", onDown, { capture: true });
        canvas.removeEventListener("keyup", onUp, { capture: true });
        observer.remove();
    });
    return () => frames;
}

/**
 * The camera's angle around the vertical axis through its target.
 * @param state - The camera state.
 * @returns The angle, in radians.
 */
function angleAround(state: ReturnType<Graphty["getCameraState"]>): number {
    const { position, target } = state;
    if (position === undefined || target === undefined) {
        throw new Error("the 3D camera has no position");
    }
    return Math.atan2(position.z - target.z, position.x - target.x);
}

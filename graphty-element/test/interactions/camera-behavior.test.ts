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
import { click, type Point, press, release, wheel } from "../helpers/real-input";

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
 * @param before - Settings made before the element is attached and the graph loads.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", before?: (element: Graphty) => void): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    before?.(element);
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

/**
 * The frame time the element is handed, added up from now, as it turns the camera by: each frame's
 * time capped at the 100 ms `autoRotate` turns for at most, and uncapped, as `autoRotateResume` counts.
 * @param element - The element.
 * @returns The time so far, capped and uncapped, in milliseconds.
 */
function frameTime(element: Graphty): () => { capped: number; raw: number } {
    const { graph } = element;
    const original = graph.update.bind(graph);
    const total = { capped: 0, raw: 0 };
    graph.update = (frameMs: number): void => {
        total.capped += Math.min(frameMs, 100);
        total.raw += frameMs;
        original(frameMs);
    };
    cleanups.push(() => {
        graph.update = original;
    });
    return () => ({ ...total });
}

/**
 * The angle turned between two camera states about the vertical axis, in radians, wrapped to (-pi, pi].
 * @param from - The earlier state.
 * @param to - The later state.
 * @returns The angle.
 */
function turnedBetween(from: ReturnType<Graphty["getCameraState"]>, to: ReturnType<Graphty["getCameraState"]>): number {
    const raw = angleAround(to) - angleAround(from);
    return Math.atan2(Math.sin(raw), Math.cos(raw));
}

describe("camera.autoRotate speed and resume", () => {
    it("turns by the speed times the frame time, however long the frames take", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { autoRotate: 0.5 } };
        await drawnFrames(element.graph.getScene(), 2);
        const elapsed = frameTime(element);
        const before = element.getCameraState();

        await drawnFrames(element.graph.getScene(), 20);

        const after = element.getCameraState();
        const expected = (0.5 * elapsed().capped) / 1000;
        assert.isAbove(expected, 0, "frames were drawn");
        assert.closeTo(Math.abs(turnedBetween(before, after)), expected, expected * 0.15 + 0.01);
    });

    it("waits after a wheel for the time autoRotateResume sets, then turns again", async () => {
        const element = await mounted("3d", (el) => {
            el.layoutBehavior = { camera: { autoRotate: 1, autoRotateResume: 400 } };
        });
        await drawnFrames(element.graph.getScene(), 2);

        // Counted from the moment the wheel reaches the element, as the element counts its own wait:
        // frames drawn while the wheel is still on its way to the page are not part of the wait.
        const elapsed = frameTime(element);
        let wheelAt = Number.NaN;
        element.addEventListener(
            "wheel",
            () => {
                wheelAt = elapsed().raw;
            },
            { capture: true, once: true },
        );
        const sinceWheel = (): number => elapsed().raw - wheelAt;
        await wheel(element, EMPTY, 100);
        while (Number.isNaN(wheelAt)) {
            await drawnFrames(element.graph.getScene(), 1);
        }
        await drawnFrames(element.graph.getScene(), 2);
        const held = camera(element);
        const samples: { ms: number; camera: string }[] = [];
        while (sinceWheel() < 700) {
            await drawnFrames(element.graph.getScene(), 1);
            samples.push({ ms: sinceWheel(), camera: camera(element) });
        }

        for (const sample of samples.filter((s) => s.ms < 300)) {
            assert.strictEqual(sample.camera, held, `still at ${String(sample.ms)} ms after the wheel`);
        }
        assert.notStrictEqual(samples.at(-1)?.camera, held, "turning again once the reader left it alone");
    });

    it("stops for good at a key press with autoRotateResume never, until the setting changes", async () => {
        const element = await mounted("3d");
        // Focus for the key, before the turning starts: the click is a press of the reader's too.
        await click(element, EMPTY);
        element.layoutBehavior = { camera: { autoRotate: 1, autoRotateResume: "never" } };
        await drawnFrames(element.graph.getScene(), 2);
        const turning = camera(element);
        await drawnFrames(element.graph.getScene(), 2);
        assert.notStrictEqual(camera(element), turning, "turning before the key");

        await userEvent.keyboard("{ArrowLeft}");
        await drawnFrames(element.graph.getScene(), 12);
        const held = camera(element);
        await drawnFrames(element.graph.getScene(), 20);
        assert.strictEqual(camera(element), held, "no turning after the reader's move");

        element.layoutBehavior = { camera: { autoRotate: 2 } };
        await drawnFrames(element.graph.getScene(), 5);
        assert.notStrictEqual(camera(element), held, "a new speed starts it again");
    });

    it("still frames the graph when it loads with autoRotate on", async () => {
        const distance = (element: Graphty): number => {
            const { position, target } = element.getCameraState();
            assert.isDefined(position);
            assert.isDefined(target);
            return Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
        };
        const still = await mounted("3d", (el) => {
            el.layoutBehavior = { camera: { fitBounds: "turning" } };
        });
        const framed = distance(still);
        still.remove();

        const turning = await mounted("3d", (el) => {
            el.layoutBehavior = { camera: { autoRotate: 1, fitBounds: "turning" } };
        });

        assert.closeTo(distance(turning), framed, framed * 0.02, "framed as far out as without turning");
        for (const id of ["a", "b", "c"]) {
            const at = turning.nodeScreenPosition(id);
            assert.isDefined(at);
            assert.isTrue(at.x >= 0 && at.x <= WIDTH && at.y >= 0 && at.y <= HEIGHT, `${id} is on the canvas`);
        }
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

/**
 * @file A camera key held down moves the camera on every frame from the press to the release, with
 * no first step and no pause while the browser waits to start repeating the key (issue #9620).
 *
 * The key is real input held down with one keydown and no auto-repeats, as macOS holds a letter
 * (press and hold shows the accent menu) and as a key looks between the press and the operating
 * system's repeat delay. The render loop runs on its own: nothing here draws a frame, calls an
 * update or asks the loop for a frame while the key is held. Every tick the loop runs the element's
 * update pass is counted, and each one must have moved the camera and drawn the moved picture.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { CANVAS_KEY_DESCRIPTORS, type CanvasKeyView } from "../../../src/catalog/canvasKeys";
import { click, holdKey, hover, nextFrame, releaseHeldKeys, releaseKey } from "../../helpers/real-input";
import { applied, camera, EMPTY, HEIGHT, mounted, onCleanup, WIDTH } from "../helpers/mounted-element";

/**
 * The update passes the key is held for: past the 8 frames a tap owes, and at 60 frames a second
 * about 670 ms, longer than the usual operating-system repeat delay (500 ms).
 */
const HELD_TICKS = 40;

afterEach(async () => {
    await releaseHeldKeys();
});

/** One render-loop tick that ran the update pass while the key was held. */
interface Tick {
    /** The camera as the last frame drawn before this tick showed it. */
    readonly camera: string;
    /** Frames drawn since the tick before. */
    readonly drawn: number;
}

/**
 * Record every tick of the element's own render loop that runs its update pass: the camera the
 * last frame drawn showed, and how many frames were drawn since the tick before. The camera is read
 * only in a frame just drawn, as an application showing it would, never between frames: a read
 * between frames brings the camera's matrices up to date, which hid a loop that could not see the
 * camera move (issue #9620). The observer is added once, before the key goes down, so it asks the
 * loop for no frames of its own.
 * @param element - The element.
 * @returns The ticks recorded so far, and a stop.
 */
function recordTicks(element: Graphty): { ticks: Tick[]; stop: () => void } {
    const { graph } = element;
    const ticks: Tick[] = [];
    let drawn = 0;
    let shown = "";
    let recording = true;
    const observer = graph.getScene().onAfterRenderObservable.add(() => {
        drawn++;
        shown = camera(element);
    });
    const original = graph.update.bind(graph);
    graph.update = (frameMs: number): void => {
        if (recording) {
            ticks.push({ camera: shown, drawn });
            drawn = 0;
        }
        original(frameMs);
    };
    const stop = (): void => {
        recording = false;
        graph.update = original;
        observer.remove();
    };
    onCleanup(stop);
    return { ticks, stop };
}

/** Every camera key the canvas answers, per view, as `KeyboardEvent.key` spells it. */
function keysOf(view: CanvasKeyView): string[] {
    const names: Record<string, string> = {
        arrowleft: "ArrowLeft",
        arrowright: "ArrowRight",
        arrowup: "ArrowUp",
        arrowdown: "ArrowDown",
    };
    return CANVAS_KEY_DESCRIPTORS.filter((entry) => entry.view === view).flatMap((entry) =>
        entry.keys.map((key) => names[key] ?? key),
    );
}

describe.each(["3d", "2d"] as const)("in %s, a held camera key", (view) => {
    it.each(keysOf(view))("%s moves the camera on every frame from the press to the release", async (key) => {
        const element = await mounted(view);
        await click(element, EMPTY);
        // The pointer leaves the drawing, as a reader's does who turns to the keyboard: a pointer
        // over the canvas has the element pick what is under it every frame.
        await hover(element, { x: WIDTH / 2, y: HEIGHT + 40 });
        await applied(element);
        assert.isTrue(element.graph.canvas.matches(":focus"), "the click focused the canvas");
        const { ticks, stop } = recordTicks(element);
        // The tick the keydown came before, counted when it arrives: the keyboard's round trip
        // through the test runner takes no fixed number of frames.
        let pressedAt = Number.NaN;
        let repeats = 0;
        const onKey = (evt: KeyboardEvent): void => {
            repeats += Number(evt.repeat);
            if (Number.isNaN(pressedAt)) {
                pressedAt = ticks.length;
            }
        };
        element.graph.canvas.addEventListener("keydown", onKey);
        onCleanup(() => {
            element.graph.canvas.removeEventListener("keydown", onKey);
        });

        await holdKey(key);
        while (Number.isNaN(pressedAt) || ticks.length < pressedAt + 1 + HELD_TICKS) {
            await nextFrame();
        }
        stop();
        await releaseKey(key);

        assert.strictEqual(repeats, 0, "the key was held with one keydown and no auto-repeat");
        // Each tick reports the frame drawn in the tick before it. The tick at pressedAt is the first
        // to run with the key down, so the next one reports its frame; the one at pressedAt reports
        // the last frame drawn before the key.
        const before = ticks[pressedAt].camera;
        let last = before;
        const stalls: number[] = [];
        for (let i = pressedAt + 1; i < ticks.length; i++) {
            const tick = ticks[i];
            if (tick.camera === last || tick.drawn === 0) {
                stalls.push(i - pressedAt);
            }
            last = tick.camera;
        }
        assert.notStrictEqual(last, before, "the camera moved");
        assert.deepStrictEqual(
            stalls,
            [],
            `ticks after the keydown (of ${String(ticks.length - pressedAt - 1)}) that left the camera still or drew nothing while ${key} was held`,
        );
    });
});

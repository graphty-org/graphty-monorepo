import type { Scene } from "@babylonjs/core/scene.js";

import type { Graphty } from "../../index.js";
import { type Picture, pictureOf } from "./drawn-invariants";
import type { Frame } from "./paint-assertions";

/**
 * Wait until the element has drawn `count` more frames.
 *
 * Each frame the element draws follows one update of everything it animates (the layout's step,
 * the camera's input, the style work), so this counts work done rather than animation frames
 * passed: a busy machine that skips ticks only makes the wait longer, never shorter. A frame
 * observer added here also asks a graph that draws on demand for the next frame, so the wait
 * ends on a still graph too.
 * @param scene - The scene to count frames of.
 * @param count - How many frames to wait for.
 */
export async function drawnFrames(scene: Scene, count: number): Promise<void> {
    for (let drawn = 0; drawn < count; drawn++) {
        await new Promise<void>((resolve) => {
            scene.onAfterRenderObservable.addOnce(() => {
                resolve();
            });
        });
    }
}

/** What {@link recordDrawnFrames} saw: the frames it checked and what each check found wrong. */
export interface DrawnFrameRecord {
    /** How many frames were read and checked. */
    readonly checked: number;
    /** Stop reading frames, then wait for every check and return what they found, frame by frame. */
    stop(): Promise<string[]>;
    /**
     * The first checked frame that a check found wrong, as a PNG data URL, for a failure message;
     * undefined when none was. Call after {@link DrawnFrameRecord.stop}.
     */
    firstMiss(): string | undefined;
}

/**
 * Read every frame the element draws, inside the frame, and check it while it is on the canvas.
 *
 * The observer runs first on `scene.onAfterRenderObservable`, so the picture it reads is exactly the
 * one the frame drew (no later observer has moved anything yet), and `check` reads
 * `nodeScreenPosition` in the same frame. `check` must read the frame synchronously: the pixel
 * checks of test/helpers/drawn-invariants.ts do when they are handed the picture, and settle their
 * promise later. WebGL only: Babylon's WebGL `readPixels` copies the frame before it returns.
 * @param element - The element.
 * @param check - Called for each frame read with its picture and its number from 1; returns what is
 *   wrong in that frame, or undefined to skip a frame (one where nothing moved, say) uncounted.
 * @returns The record.
 */
export function recordDrawnFrames(
    element: Graphty,
    check: (picture: Picture, frame: number) => Promise<string[]> | undefined,
): DrawnFrameRecord {
    const { engine } = element.graph;
    const scene = element.graph.getScene();
    const found: Promise<string[]>[] = [];
    const frames: Frame[] = [];
    let first: Frame | undefined;
    const observer = scene.onAfterRenderObservable.add(
        () => {
            const width = engine.getRenderWidth();
            const height = engine.getRenderHeight();
            const pixels = new Uint8Array(width * height * 4);
            // Fills `pixels` before it returns on WebGL; the promise it hands back is not needed.
            void engine.readPixels(0, 0, width, height, true, true, pixels);
            const result = check(pictureOf(element, { pixels, width, height }), found.length + 1);
            if (result !== undefined) {
                found.push(result);
                frames.push({ pixels, width, height });
            }
        },
        undefined,
        true,
    );
    return {
        get checked() {
            return found.length;
        },
        async stop() {
            scene.onAfterRenderObservable.remove(observer);
            const misses = await Promise.all(found);
            first = frames[misses.findIndex((each) => each.length > 0)];
            frames.length = 0;
            return misses.flatMap((each, i) => each.map((miss) => `frame ${String(i + 1)}: ${miss}`));
        },
        firstMiss() {
            return first === undefined ? undefined : pngOf(first);
        },
    };
}

/**
 * A frame as a PNG data URL, the right way up.
 * @param frame - The frame, bottom row first.
 * @returns The data URL.
 */
function pngOf(frame: Frame): string {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    if (context === null) {
        return "";
    }

    const image = context.createImageData(frame.width, frame.height);
    const row = frame.width * 4;
    for (let y = 0; y < frame.height; y++) {
        image.data.set(frame.pixels.subarray((frame.height - 1 - y) * row, (frame.height - y) * row), y * row);
    }

    context.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
}

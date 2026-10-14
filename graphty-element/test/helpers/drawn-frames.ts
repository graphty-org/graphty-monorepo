import type { Scene } from "@babylonjs/core/scene";

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

import type { CameraState } from "../../src/camera/types.js";
import type { Graph } from "../../src/Graph.js";

/**
 * Animation milliseconds one frame advances while {@link animationFramesOf} runs. Babylon's
 * `useConstantAnimationDeltaTime` fixes it at 16, whatever the frame actually took.
 */
export const ANIMATION_FRAME_MS = 16;

/** What {@link animationFramesOf} saw. */
export interface AnimationFrames {
    /** Frames the scene animated while `action` ran. */
    readonly frames: number;
    /** Animation milliseconds those frames stand for. */
    readonly ms: number;
}

/**
 * Run an action on the scene's animation clock instead of the wall clock, and count the frames it
 * took.
 *
 * Camera animations are Babylon animations, and Babylon advances them by the scene's delta time.
 * With `useConstantAnimationDeltaTime` every frame advances exactly {@link ANIMATION_FRAME_MS},
 * so the frame count is a measure of how much ANIMATION time passed -- the duration the caller
 * asked for -- and does not change with how fast the runner renders.
 * @param graph - The graph whose scene clock to control.
 * @param action - The work to measure.
 * @param onFrame - Called after each counted frame with the count so far.
 * @returns The frames counted and the animation milliseconds they stand for.
 */
export async function animationFramesOf(
    graph: Graph,
    action: () => Promise<unknown>,
    onFrame?: (frames: number) => void,
): Promise<AnimationFrames> {
    const scene = graph.getScene();
    const previous = scene.useConstantAnimationDeltaTime;
    scene.useConstantAnimationDeltaTime = true;
    let frames = 0;
    const observer = scene.onAfterAnimationsObservable.add(() => {
        frames++;
        onFrame?.(frames);
    });

    try {
        await action();
    } finally {
        scene.onAfterAnimationsObservable.remove(observer);
        scene.useConstantAnimationDeltaTime = previous;
    }

    return { frames, ms: frames * ANIMATION_FRAME_MS };
}

/**
 * Run an action on the scene's animation clock (see {@link animationFramesOf}) and read what the
 * camera reports, through `getCameraState()`, once `frame` frames have been animated.
 * @param graph - The graph whose camera to read.
 * @param frame - The animation frame to read the camera at.
 * @param action - The work that moves the camera, usually an animated camera call.
 * @returns The camera state at that frame, and the camera state once the action resolved.
 */
export async function cameraStateAtFrame(
    graph: Graph,
    frame: number,
    action: () => Promise<unknown>,
): Promise<{ readonly atFrame: CameraState; readonly end: CameraState }> {
    let atFrame: CameraState | undefined;
    await animationFramesOf(graph, action, (count) => {
        if (count === frame) {
            atFrame = graph.getCameraState();
        }
    });
    if (atFrame === undefined) {
        throw new Error(`the action finished before animation frame ${frame}`);
    }

    return { atFrame, end: graph.getCameraState() };
}

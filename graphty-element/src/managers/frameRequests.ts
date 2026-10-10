import type { Scene } from "@babylonjs/core";

/** The render loop drawing each scene, told when something in it needs another frame. */
const loops = new WeakMap<Scene, () => void>();

/**
 * Say who draws a scene, so {@link requestFrame} on it reaches them.
 * @param scene - The scene.
 * @param request - Called on every request.
 */
export function onFrameRequest(scene: Scene, request: () => void): void {
    loops.set(scene, request);
}

/**
 * Ask for the scene to be drawn on the next frame.
 *
 * A render loop in `"on-demand"` mode draws only when asked, so anything that changes the picture
 * where the loop cannot see it -- an animation stepped before each frame, a pass that needs a few
 * more frames to finish -- asks here, once per frame it needs. In `"continuous"` mode every frame
 * is drawn anyway and a request costs one assignment.
 * @param scene - The scene to draw.
 */
export function requestFrame(scene: Scene): void {
    loops.get(scene)?.();
}

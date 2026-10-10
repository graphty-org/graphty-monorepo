import type { Scene } from "@babylonjs/core";

/** How many things on each scene change the picture by themselves on every frame; see {@link animatesEveryFrame}. */
const everyFrameAnimations = new WeakMap<Scene, number>();

/**
 * Says that something on a scene changes the picture on every frame by itself -- a label that
 * pulses, an edge whose texture moves -- so a graph drawn on demand keeps drawing while it lasts.
 *
 * Nothing else tells the render loop: such an animation moves no node, queues no style work and
 * leaves the camera where it is, so to the loop the picture looks finished.
 * @param scene - The scene the animation draws in.
 * @returns Ends the claim. Calling it twice is a no-op.
 */
export function animatesEveryFrame(scene: Scene): () => void {
    everyFrameAnimations.set(scene, (everyFrameAnimations.get(scene) ?? 0) + 1);
    let released = false;

    return (): void => {
        if (released) {
            return;
        }

        released = true;
        everyFrameAnimations.set(scene, (everyFrameAnimations.get(scene) ?? 1) - 1);
    };
}

/**
 * How many every-frame animations a scene is running; see {@link animatesEveryFrame}.
 * @param scene - The scene.
 * @returns The count, 0 when none.
 */
export function everyFrameAnimationsOn(scene: Scene): number {
    return everyFrameAnimations.get(scene) ?? 0;
}

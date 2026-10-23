import type { Scene } from "@babylonjs/core";

/** Work one element does before every frame of its scene. */
export type FrameCallback = () => void;

/**
 * The per-frame callbacks of one kind of element (a label's depth fade, a label's animation, an
 * edge's moving texture), behind ONE `onBeforeRenderObservable` observer per scene.
 *
 * An element joins and leaves its scene's set in constant time instead of adding and removing an
 * observer of its own: Babylon's `remove` searches every observer the scene holds, so adding and
 * disposing n animated elements cost n x n (issue #2995, the same cost #2894 removed for pointer
 * callbacks). A frame calls only the callbacks in the set, so an element with no per-frame work
 * costs a frame nothing. A callback added while a frame is being delivered runs in that frame,
 * and one removed before its turn does not, as with Babylon's own list. The scene's observer is
 * added when the first callback joins, so it sits where that element's own observer used to.
 */
export class FrameRoster {
    private readonly rosters = new WeakMap<Scene, Set<FrameCallback>>();
    /** Scenes whose GL context has just come back, until their next frame has run its callbacks. */
    private readonly restored = new WeakSet<Scene>();

    /**
     * Say that a scene's GL context was lost and given back, so this frame's callbacks must redo
     * everything rather than only what changed: the buffers Babylon rebuilt hold nothing.
     * @param scene - The scene.
     */
    contextRestored(scene: Scene): void {
        this.restored.add(scene);
    }

    /**
     * Whether the frame being drawn is the first since the scene's GL context came back.
     * @param scene - The scene.
     * @returns True until that frame's callbacks have all run.
     */
    isRestoring(scene: Scene): boolean {
        return this.restored.has(scene);
    }

    /**
     * Run `callback` before every frame of `scene` until the returned function is called.
     * @param scene - The scene whose frames drive it.
     * @param callback - The work to do each frame.
     * @returns Stops it. Calling it twice is a no-op.
     */
    join(scene: Scene, callback: FrameCallback): () => void {
        const roster = this.callbacksOf(scene);
        roster.add(callback);
        return (): void => {
            roster.delete(callback);
        };
    }

    /**
     * The callbacks a scene runs every frame, created with the scene's one observer on first use.
     * @param scene - The scene.
     * @returns Its set.
     */
    callbacksOf(scene: Scene): Set<FrameCallback> {
        let roster = this.rosters.get(scene);
        if (!roster) {
            const created = new Set<FrameCallback>();
            scene.onBeforeRenderObservable.add(() => {
                for (const callback of created) {
                    callback();
                }
                this.restored.delete(scene);
            });
            this.rosters.set(scene, created);
            roster = created;
        }

        return roster;
    }
}

/**
 * The edge line and arrow cap batches of each scene, each uploading what was written to it once
 * before every frame. One roster for both kinds keeps their uploads in the order they were made.
 */
export const batchUploadFrames = new FrameRoster();

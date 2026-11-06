import type { Scene } from "@babylonjs/core";

/** Work one element does before every frame of its scene. */
export type FrameCallback = () => void;

/** The switch a scene's batches read; see {@link FrameRoster.rangedUploads}. */
export interface RangedUploads {
    on: boolean;
}

/**
 * A scene's fade by age, which its joined line batches read; see {@link FrameRoster.edgeAges}.
 * Times are normalized over the data's extent.
 */
export interface EdgeAgeState {
    /**
     * Whether the timeline is on, so batches record which edge each slot draws. Off by default,
     * and a batch then takes and hands back slots exactly as it does without the timeline.
     */
    track: boolean;
    /** Whether lines fade by age. Off until the timeline's `ageFade` setting asks for it. */
    on: boolean;
    /** Each edge row's start, or null while off. A new array means every slot's age is rewritten. */
    ages: Float32Array | null;
    /** The window's start, its end and the opacity at its start, which the uniform carries. */
    readonly window: [from: number, to: number, fade: number];
    /** Called when a batch's lines have switched program, so the next frame re-reads what it draws. */
    switched: () => void;
    /** How many batches are compiling the look they switch to; the old look draws meanwhile. */
    warming: number;
}

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
    /** Each scene's switch; see {@link FrameRoster.rangedUploads}. */
    private readonly ranged = new WeakMap<Scene, RangedUploads>();
    /** Each scene's fade by age; see {@link FrameRoster.edgeAges}. */
    private readonly aged = new WeakMap<Scene, EdgeAgeState>();

    /**
     * A scene's fade by age: off by default, so a line is built and drawn as it always was. A
     * batch holds this object and reads it once a frame.
     * @param scene - The scene.
     * @returns Its state.
     */
    edgeAges(scene: Scene): EdgeAgeState {
        let state = this.aged.get(scene);
        if (!state) {
            state = {
                track: false,
                on: false,
                ages: null,
                window: [0, 1, 1],
                switched: (): void => undefined,
                warming: 0,
            };
            this.aged.set(scene, state);
        }

        return state;
    }

    /**
     * Whether a scene's batches upload only the slots written rather than whole buffers. Off by
     * default. A batch holds this object and reads `on` at every write, so it stays one property
     * read on the path every edge of a settling layout takes.
     * @param scene - The scene.
     * @returns Its switch.
     */
    rangedUploads(scene: Scene): RangedUploads {
        let uploads = this.ranged.get(scene);
        if (!uploads) {
            uploads = { on: false };
            this.ranged.set(scene, uploads);
        }

        return uploads;
    }

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

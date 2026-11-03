import type { Camera, Scene } from "@babylonjs/core";

import { pendingWorkOf } from "../managers/PendingWork";
import { FrameRoster } from "./FrameRoster";

/** A label whose texture can be redrawn at the pixels it covers on screen. */
export interface ScreenFittedTexture {
    /**
     * Redraw the texture when it no longer matches the label's size on screen.
     * @param camera - The camera the frame is drawn from.
     * @returns True when it was redrawn.
     */
    fitTextureToScreen(camera: Camera): boolean;
}

/**
 * The most labels checked before one frame. A scene with more is checked over several frames, so a zoom
 * across a scale step costs a bounded redraw per frame however large the graph.
 */
export const TEXTURE_FIT_CHECKS_PER_FRAME = 256;

/** One scene's sweep; see {@link fitTexturesToScreen}. */
class Sweep {
    /** Where the walk through the labels is; null starts a new walk. */
    private walk: Iterator<ScreenFittedTexture> | null = null;
    /** Labels still to check since the picture or the camera last moved. */
    private unchecked = 0;
    /** Labels still to check since the picture last moved: until none are, the frame is not final. */
    private owed = 0;
    /** The picture counter and the camera's matrices when the sweep last looked. */
    private epoch = -1;
    private view = -1;
    private projection = -1;
    /** Takes the sweep off the scene's record of pending work, once it is on it. */
    private unwatch: (() => void) | null = null;

    constructor(
        private readonly scene: Scene,
        private readonly labels: Set<ScreenFittedTexture>,
    ) {}

    run(): void {
        const camera = this.scene.activeCamera;
        const work = pendingWorkOf(this.scene);
        // Entered here, not when the first label is made: the graph's record may come after its scene.
        if (this.unwatch === null && work !== undefined) {
            this.unwatch = work.watch(
                "label-texture",
                "label textures are being redrawn for their size on screen",
                () => this.owed > 0,
            );
        }

        if (!camera) {
            // Nothing is drawn, so nothing is owed.
            this.owed = 0;
            return;
        }

        // The picture moved: every label may now cover a different size on screen. Not restarted while a walk
        // is still owed: the graph announces a change every frame while anything is pending, this walk
        // included, so restarting then would never finish.
        // ponytail: a change in the middle of a long walk reaches only the labels not yet checked; the next
        // camera move or picture change checks the rest. Track changes per label if that ever shows.
        const epoch = work?.epoch ?? -1;
        if (epoch !== this.epoch && this.owed === 0) {
            this.owed = this.labels.size;
            this.unchecked = this.labels.size;
        }

        // A reader's own zoom moves the camera without moving the picture: checked, but never waited for.
        const view = camera.getViewMatrix().updateFlag;
        const projection = camera.getProjectionMatrix().updateFlag;
        if (view !== this.view || projection !== this.projection) {
            this.unchecked = this.labels.size;
        }

        let redrawn = false;
        for (let i = 0; i < TEXTURE_FIT_CHECKS_PER_FRAME && this.unchecked > 0; i++) {
            const label = this.next();
            if (label === undefined) {
                break;
            }

            redrawn = label.fitTextureToScreen(camera) || redrawn;
            this.unchecked--;
            this.owed = Math.max(0, this.owed - 1);
        }

        // A redrawn label changes the picture; the next frame checks every label again, and finds them matched.
        if (redrawn) {
            work?.changed();
        }

        this.epoch = work?.epoch ?? -1;
        this.view = view;
        this.projection = projection;
    }

    /**
     * The next label of the walk, starting a new walk at the end of one.
     * @returns The label, or undefined when there are none.
     */
    private next(): ScreenFittedTexture | undefined {
        this.walk ??= this.labels.values();
        let next = this.walk.next();
        if (next.done === true) {
            this.walk = this.labels.values();
            next = this.walk.next();
        }

        return next.done === true ? undefined : next.value;
    }
}

/** The texture sweep of each scene, behind one before-render observer; see {@link FrameRoster}. */
const textureFitFrames = new FrameRoster();
const sweeps = new WeakMap<Scene, Sweep>();

/**
 * Keep every label of a scene drawn from a texture with about one texture pixel per screen pixel.
 *
 * A label drawn from a texture with many more pixels than it covers on screen is shrunk by the GPU's
 * mipmaps, which blur its letters; one with fewer is magnified, which blurs them too. Before each frame the
 * sweep asks up to {@link TEXTURE_FIT_CHECKS_PER_FRAME} labels whether their texture still matches, and each
 * that does not redraws it. Until every label has been asked since the picture last changed, the frame on
 * screen is not final.
 * @param scene - The scene.
 * @param labels - The scene's labels; read live, so labels added later are swept too.
 */
export function fitTexturesToScreen(scene: Scene, labels: Set<ScreenFittedTexture>): void {
    if (sweeps.has(scene)) {
        return;
    }

    const sweep = new Sweep(scene, labels);
    sweeps.set(scene, sweep);
    textureFitFrames.join(scene, () => {
        sweep.run();
    });
}

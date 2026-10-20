/**
 * @file The scene uniforms every shader program shares: the time, the quality level and the
 * light, in one uniform buffer (design/rendering/shader-styles.md section 5).
 *
 * One buffer, updated at most once per frame, so a frozen material sees the time move without
 * being touched, and a frame that changes only the time keeps the active-mesh freeze.
 *
 * **Render on demand stays.** The time moves only while something holds a motion claim (a loop
 * shader on screen, a timed animation); each claim is an `animatesEveryFrame` claim on the scene,
 * so a graph drawn on demand keeps drawing while one is held and rests when the last is released.
 * With only still shaders nothing is claimed, no frame observer is added and the loop rests.
 */

import { type AbstractEngine, type Observer, type Scene, UniformBuffer, Vector3 } from "@babylonjs/core";

import { animatesEveryFrame } from "../../managers/everyFrameAnimations";
import { SCENE_BLOCK, SCENE_MEMBERS } from "./wrap";

/**
 * The period the time wraps at, in seconds.
 *
 * ponytail: a fixed wrap keeps float32 precision; a loop whose period does not divide it jumps
 * once every 17 minutes. Reset the epoch while no motion is claimed if that ever shows.
 */
const TIME_PERIOD = 1024;

/** The quality levels, as the `Q()` helper reads them. */
const QUALITY_LEVEL = { low: 0, medium: 1, high: 2 } as const;

/** The scene's shader uniforms and the claims that keep them moving. */
export class SceneUniforms {
    /** The buffer every shader program binds as {@link SCENE_BLOCK}. */
    readonly buffer: UniformBuffer;
    private readonly epoch = performance.now();
    private claims = 0;
    private observer: Observer<Scene> | null = null;
    private quality: keyof typeof QUALITY_LEVEL = "high";
    /** The time the buffer last held, in seconds. */
    private time = 0;

    /**
     * Build the buffer for a scene.
     * @param engine - The engine.
     * @param scene - The scene whose frames move the time.
     */
    constructor(
        engine: AbstractEngine,
        private readonly scene: Scene,
    ) {
        this.buffer = new UniformBuffer(engine, undefined, true, SCENE_BLOCK);
        for (const member of SCENE_MEMBERS) {
            this.buffer.addUniform(member, 4);
        }

        this.buffer.create();
        this.write();
    }

    /**
     * The time the buffer holds.
     * @returns Seconds.
     */
    get currentTime(): number {
        return this.time;
    }

    /**
     * Set the quality level `Q()` reads.
     * @param level - The level.
     */
    setQuality(level: keyof typeof QUALITY_LEVEL): void {
        if (this.quality !== level) {
            this.quality = level;
            this.write();
        }
    }

    /**
     * Write the buffer for a time.
     * @param time - Seconds; the buffer holds it wrapped. The time now when absent.
     */
    write(time = this.time): void {
        this.time = time % TIME_PERIOD;
        this.buffer.updateFloat4("graphty_scene_time", this.time, QUALITY_LEVEL[this.quality], 0, 0);
        // The key light of the studio lighting, toward the camera's upper right, in view space.
        const light = new Vector3(-0.6, 0.6, -1).normalize();
        this.buffer.updateFloat4("graphty_scene_lightDir", light.x, light.y, light.z, 0);
        this.buffer.updateFloat4("graphty_scene_lightColor", 1, 1, 1, 0);
        this.buffer.updateFloat4("graphty_scene_ambient", 0.35, 0.35, 0.38, 0);
        this.buffer.update();
    }

    /**
     * Say that something drawn with a shader moves by itself: the time advances every frame, and
     * a graph drawn on demand keeps drawing, until the claim is released.
     * @returns Releases the claim. Calling it twice is a no-op.
     */
    claimMotion(): () => void {
        const release = animatesEveryFrame(this.scene);
        this.claims++;
        this.observer ??= this.scene.onBeforeRenderObservable.add(() => {
            this.write((performance.now() - this.epoch) / 1000);
        });
        let released = false;

        return () => {
            if (released) {
                return;
            }

            released = true;
            release();
            this.claims--;
            if (this.claims === 0 && this.observer !== null) {
                this.scene.onBeforeRenderObservable.remove(this.observer);
                this.observer = null;
            }
        };
    }

    /** Release the buffer and the frame observer. */
    dispose(): void {
        if (this.observer !== null) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
        }

        this.buffer.dispose();
    }
}

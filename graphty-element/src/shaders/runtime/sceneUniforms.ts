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

import { type AbstractEngine, type Effect, type Observer, type Scene, UniformBuffer, Vector3 } from "@babylonjs/core";

import { animatesEveryFrame } from "../../managers/everyFrameAnimations";
import { SCENE_BLOCK, SCENE_MEMBERS } from "./wrap";

/**
 * The period the time wraps at, in seconds.
 *
 * ponytail: a fixed wrap keeps float32 precision; a loop whose period does not divide it jumps
 * once every 17 minutes. Reset the epoch while no motion is claimed if that ever shows.
 */
export const TIME_PERIOD = 1024;

/** The key light's direction in view space. */
const LIGHT = new Vector3(-0.6, 0.6, -1).normalize();

/** The quality levels, as the `Q()` helper reads them. */
const QUALITY_LEVEL = { low: 0, medium: 1, high: 2 } as const;

/** The scene's shader uniforms and the claims that keep them moving. */
export class SceneUniforms {
    /** The buffer every shader program binds as {@link SCENE_BLOCK}. */
    readonly buffer: UniformBuffer;
    private readonly epoch = performance.now();
    private claims = 0;
    private observer: Observer<Scene> | null = null;
    /** Releases the scene's every-frame claim, held while a claim is and motion runs. */
    private releaseFrames: (() => void) | null = null;
    private quality: keyof typeof QUALITY_LEVEL = "high";
    /** Whether shader motion runs: false while it is paused or still. */
    private moving = true;
    /** Whether a frame asked for by {@link tick} is still to be drawn. */
    private ticking = false;
    /** How many {@link holdTicks} holds are held. */
    private tickers = 0;
    /** The time the buffer last held, in seconds. */
    private time = 0;
    /** The time each frozen shader (by text hash) stands at. */
    private readonly frozen = new Map<string, number>();
    /** The canvas color the buffer last held. */
    private canvas: readonly number[] = [];
    private readonly canvasObserver: Observer<Scene> | null;
    /** The largest square an effect draws on, in screen pixels across. */
    effectCap = 512;

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
        // The canvas color changes outside any frame claim (a theme or a background setting), so
        // a still scene writes the buffer again when it does.
        this.canvasObserver = scene.onBeforeRenderObservable.add(() => {
            const { r, g, b } = scene.clearColor;
            if (r !== this.canvas[0] || g !== this.canvas[1] || b !== this.canvas[2]) {
                this.canvas = [r, g, b];
                this.write();
            }
        });
    }

    /**
     * The time the buffer holds.
     * @returns Seconds.
     */
    get currentTime(): number {
        return this.time;
    }

    /**
     * The time the buffer would hold if it were written now: what an element state stamps its
     * change with, so `time - stamp` in a shader is the seconds since it.
     * @returns Seconds, wrapped as the buffer wraps them.
     */
    now(): number {
        if (!this.moving) {
            // Half a period before the time held: every timed animation stamped now reads as long
            // finished, so it shows its end state rather than playing.
            return (this.time + TIME_PERIOD / 2) % TIME_PERIOD;
        }

        return ((performance.now() - this.epoch) / 1000) % TIME_PERIOD;
    }

    /**
     * Whether something holds a motion claim, paused or not.
     * @returns True while one does.
     */
    get claimed(): boolean {
        return this.claims > 0 || this.ticking;
    }

    /**
     * Say that something moves at its own rate (a background drawn 30 times a second) rather than
     * on every frame: the time advances on each frame a {@link tick} asks for, and no frame is
     * asked for otherwise.
     * @returns Releases the hold. Calling it twice is a no-op.
     */
    holdTicks(): () => void {
        this.tickers++;
        this.follow();
        let released = false;

        return () => {
            if (released) {
                return;
            }

            released = true;
            this.tickers--;
            this.follow();
        };
    }

    /**
     * Ask for one frame of motion for a {@link holdTicks} holder: the time advances to now on that
     * frame, and a graph drawn on demand draws it. Nothing while motion is stopped.
     */
    tick(): void {
        if (!this.moving || this.ticking) {
            return;
        }

        this.ticking = true;
        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(() => {
            this.ticking = false;
            release();
        });
    }

    /**
     * Run or stop shader motion. Stopped (paused by the frame guard, or still by the reader's or
     * the platform's setting), the time stands where it is, claims ask for no frame, and timed
     * animations started from now show their end state.
     * @param moving - Whether motion runs.
     */
    setMoving(moving: boolean): void {
        if (this.moving !== moving) {
            this.moving = moving;
            this.follow();
        }
    }

    /**
     * Freeze one shader's time where it stands now: for a shader whose output flashed.
     * @param hash - The shader's text hash.
     */
    freeze(hash: string): void {
        if (!this.frozen.has(hash)) {
            this.frozen.set(hash, this.time);
        }
    }

    /**
     * The time a frozen shader stands at.
     * @param hash - Its text hash.
     * @returns Seconds, or -1 when it is not frozen.
     */
    frozenTime(hash: string): number {
        return this.frozen.get(hash) ?? -1;
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
     * Bind the buffer to a program about to draw. Babylon's `bindToEffect` only records the
     * program, and the binding is made by the buffer's next `update()`; a program drawn before
     * that (the first test frame or thumbnail on an engine) would read no block and its draw would
     * fail, so this binds it at once.
     * @param effect - The program.
     */
    bindTo(effect: Effect): void {
        this.buffer.bindToEffect(effect, SCENE_BLOCK);
        this.buffer.bindUniformBuffer();
    }

    /**
     * Write the buffer for a time.
     * @param time - Seconds; the buffer holds it wrapped. The time now when absent.
     */
    write(time = this.time): void {
        this.time = time % TIME_PERIOD;
        this.copyInto(this.buffer);
        this.buffer.update();
    }

    /**
     * Write the members, as they stand, into another uniform buffer that declares them: a
     * material's own block, which a material plugin fills on every draw instead of binding this
     * buffer beside the material's.
     * @param target - The buffer.
     * @param hash - The text hash of the shader drawn with it, so a frozen one gets its own time.
     */
    copyInto(target: Pick<UniformBuffer, "updateFloat4">, hash?: string): void {
        const frozen = hash === undefined ? undefined : this.frozen.get(hash);
        target.updateFloat4("graphty_scene_time", frozen ?? this.time, QUALITY_LEVEL[this.quality], 0, 0);
        // The key light of the studio lighting, toward the camera's upper right, in view space.
        target.updateFloat4("graphty_scene_lightDir", LIGHT.x, LIGHT.y, LIGHT.z, 0);
        target.updateFloat4("graphty_scene_lightColor", 1, 1, 1, 0);
        target.updateFloat4("graphty_scene_ambient", 0.35, 0.35, 0.38, 0);
        const { r, g, b } = this.scene.clearColor;
        target.updateFloat4("graphty_scene_canvas", r, g, b, 0);
    }

    /**
     * Say that something drawn with a shader moves by itself: the time advances every frame, and
     * a graph drawn on demand keeps drawing, until the claim is released.
     * @returns Releases the claim. Calling it twice is a no-op.
     */
    claimMotion(): () => void {
        this.claims++;
        this.follow();
        let released = false;

        return () => {
            if (released) {
                return;
            }

            released = true;
            this.claims--;
            this.follow();
        };
    }

    /**
     * Hold the frame observer while a claim or a tick hold is held and motion runs, and the
     * every-frame claim while a claim is. The observer advances the time on every frame a claim
     * holds and on each frame a tick asked for.
     */
    private follow(): void {
        const run = (this.claims > 0 || this.tickers > 0) && this.moving;
        if (run && this.observer === null) {
            this.observer = this.scene.onBeforeRenderObservable.add(() => {
                if (this.claims > 0 || this.ticking) {
                    this.write((performance.now() - this.epoch) / 1000);
                }
            });
        } else if (!run && this.observer !== null) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
        }

        const frames = this.claims > 0 && this.moving;
        if (frames && this.releaseFrames === null) {
            this.releaseFrames = animatesEveryFrame(this.scene);
        } else if (!frames && this.releaseFrames !== null) {
            this.releaseFrames();
            this.releaseFrames = null;
        }
    }

    /** Release the buffer and the frame observer. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.canvasObserver);
        if (this.observer !== null) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
            this.releaseFrames?.();
            this.releaseFrames = null;
        }

        this.buffer.dispose();
    }
}

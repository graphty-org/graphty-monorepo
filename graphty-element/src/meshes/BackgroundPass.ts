/**
 * @file A background shader (design/rendering/shader-styles.md sections 3.6 and 5): drawn into its
 * own render target at most 30 times a second (15 at low quality), and shown behind everything the
 * scene draws, so it is behind every node and never over a label.
 *
 * The background is composited bottom to top: the scene's clear color, the skybox image (sampled
 * here by view direction, while the photo dome is hidden), then the shader. Where the shader's
 * alpha is low, what is beneath it shows.
 *
 * The target is drawn again only when it must be: the shader moves (a loop whose speed is not 0),
 * the camera moved (the shader reads the view direction), the canvas or the quality changed size,
 * or the parameters changed. A still background on a still graph costs one blit a frame.
 *
 * Loaded with the shader runtime, never by a graph that names no shader.
 */

import {
    type BaseTexture,
    Camera,
    Constants,
    EffectRenderer,
    Layer,
    Matrix,
    type Observer,
    type RenderTargetTexture,
    type Scene,
    Vector2,
    Vector3,
} from "@babylonjs/core";

import { inferShaderReads } from "../catalog/shaderGlsl";
import { motionOf, type ShaderParams } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { RenderTargetBudget, ShaderGuard } from "../managers/ShaderGuard";
import type { HostShader } from "../session/shaders";
import {
    BACKGROUND_TINTS,
    backgroundProgram,
    TINT_COLOR_UNIFORMS,
    TINT_UNIFORMS,
} from "../shaders/runtime/scenePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { uniformValueOf } from "../shaders/runtime/wrap";
import { type SceneEffect, sceneEffect, sceneTarget, setParams, targetBytes } from "./sceneShaderEffect";

/** The background layer's name; the group outline layer is kept after it. */
export const BACKGROUND_LAYER = "graphty-background-shader";

/** One group outline that tints a background (`BackgroundInput.groupTint`), as drawn on the canvas. */
export interface BackgroundTint {
    /** Its center, -1..1 across the canvas, y up. */
    readonly x: number;
    readonly y: number;
    /** Its radius, in canvas heights from the center to the top. */
    readonly radius: number;
    /** Its color, 0..1. */
    readonly color: readonly [number, number, number];
}

/** The fastest the background target is drawn again, frames a second, by quality level. */
const BACKGROUND_FPS = { low: 15, medium: 30, high: 30 } as const;

/** One background shader drawn behind a scene. */
export class BackgroundPass {
    private readonly renderer: EffectRenderer;
    private readonly layer: Layer;
    private readonly observer: Observer<Scene>;
    private readonly afterObserver: Observer<Scene>;
    private program: { readonly shader: HostShader; readonly effect: SceneEffect; readonly tinted: boolean } | null =
        null;
    /** Counts show and hide calls, so a compile that finishes after a newer call is dropped. */
    private showing = 0;
    private params: ShaderParams | undefined;
    private fallback: readonly [number, number, number, number] = [0, 0, 0, 1];
    /** The skybox image drawn beneath the shader, or null. */
    private image: BaseTexture | null = null;
    /** Whether {@link image} was ready when the target was last drawn. */
    private imageWasReady = false;
    private target: { readonly texture: RenderTargetTexture; readonly release: () => void } | null = null;
    /** The timer that asks for the next background tick while the shader moves. */
    private tickTimer: ReturnType<typeof setTimeout> | null = null;
    /** Releases the tick hold, held while the shader moves. */
    private releaseTicks: (() => void) | null = null;
    /** When the target was last drawn, by `performance.now()`. */
    private drawnAt = Number.NEGATIVE_INFINITY;
    /** The camera's view and projection the target was last drawn with. */
    private readonly drawnWith = new Float32Array(32);
    /** The tints the target was last drawn with: per tint x, y, radius, weight, r, g, b, 0. */
    private readonly tintsDrawn = new Float32Array(BACKGROUND_TINTS * 8);
    private readonly tintsNow = new Float32Array(BACKGROUND_TINTS * 8);
    private dirty = true;
    /** How many times the target was drawn, for tests and tools. */
    draws = 0;
    /** Whether the last frame drew the layer that shows the target (issue #3536). */
    private onScreen = false;

    /**
     * Whether the frame on screen shows the shader: the last frame drew the layer that shows the
     * target. Babylon skips a layer whose own program is still compiling, and that program can
     * finish between two frames, so the layer being ready now does not mean the canvas shows it.
     * @returns True once it does.
     */
    get shown(): boolean {
        return this.draws > 0 && this.layer.isEnabled && this.onScreen;
    }

    /**
     * Whether the layer is on but the frame on screen does not show it yet: its program still
     * compiles, or the frame that draws it has not run. Either way a frame is asked for.
     * @returns True while the shader is on its way to the canvas.
     */
    get showPending(): boolean {
        return this.layer.isEnabled && !this.shown;
    }

    /**
     * Start drawing backgrounds behind a scene; nothing shows until {@link show} compiled one.
     * @param scene - The scene.
     * @param runtime - The shader runtime, for the scene uniforms and motion claims.
     * @param guard - The frame guard, for the quality level and the target size.
     * @param budget - The scene's shader render-target budget.
     * @param tints - The largest outlined groups on screen, at most the count asked for, largest
     *     first, read before each frame.
     */
    constructor(
        private readonly scene: Scene,
        private readonly runtime: ShaderRuntime,
        private readonly guard: ShaderGuard,
        private readonly budget: RenderTargetBudget,
        private readonly tints: (count: number) => readonly BackgroundTint[] = () => [],
    ) {
        const engine = scene.getEngine();
        this.renderer = new EffectRenderer(engine);
        this.layer = new Layer(BACKGROUND_LAYER, null, scene, true);
        this.layer.isEnabled = false;
        this.layer.onAfterRenderObservable.add(() => {
            this.onScreen = true;
        });
        // First of the scene's layers, so it is drawn under every other one.
        const { layers } = scene;
        layers.splice(layers.indexOf(this.layer), 1);
        layers.unshift(this.layer);
        this.observer = scene.onBeforeRenderObservable.add(() => {
            this.frame();
        });
        // The group outlines are laid out before the same frame as this pass draws, and either may
        // run first: one laid out after the draw changed the tints, so ask for the frame that
        // draws them, or a graph drawn on demand keeps the last frame's tints.
        this.afterObserver = scene.onAfterRenderObservable.add(() => {
            if (this.program?.tinted === true && this.readTints()) {
                // Held until that frame starts: added to this observable now, it would run at once.
                this.scene.onBeforeRenderObservable.addOnce(animatesEveryFrame(this.scene));
            }
        });
    }

    /**
     * The shader drawn now, once its program compiled.
     * @returns The shader, or null.
     */
    get shader(): HostShader | null {
        return this.program?.shader ?? null;
    }

    /**
     * Draw a background shader, compiling it the first time. The scene's clear color shows until
     * it compiled; the shader drawn before keeps drawing until then.
     * @param shader - The shader, of kind `background`.
     * @param params - Its parameter values over the defaults.
     * @param fallback - The color drawn for a pixel whose result is not a number, 0..1.
     * @param image - The skybox image drawn beneath the shader, or null for none.
     * @returns Resolves true once it draws; false when it failed to compile (the clear color shows)
     *     or a later call replaced it.
     */
    async show(
        shader: HostShader,
        params: ShaderParams | undefined,
        fallback: readonly [number, number, number, number],
        image: BaseTexture | null = null,
    ): Promise<boolean> {
        this.params = params;
        this.fallback = fallback;
        this.image = image;
        if (this.program?.shader.hash === shader.hash) {
            this.follow();
            return true;
        }

        const ticket = ++this.showing;
        const { descriptor, glsl } = shader.registration;
        const effect = sceneEffect(
            this.scene.getEngine(),
            `graphtyBackground${shader.hash.slice(0, 24)}`,
            backgroundProgram(descriptor, glsl),
        );
        const ok = await effect.ready;
        if (ticket !== this.showing || !ok) {
            effect.dispose();
            if (ticket === this.showing) {
                this.hide();
            }

            return false;
        }

        this.program?.effect.dispose();
        // Only a shader that reads the groups (`groupTint`) is drawn again when they move.
        this.program = { shader, effect, tinted: inferShaderReads(glsl).includes("members") };
        this.follow();
        this.runtime.noteDrawn([shader.hash]);
        return true;
    }

    /** Stop drawing a background shader: the clear color shows. */
    hide(): void {
        this.showing++;
        this.program?.effect.dispose();
        this.program = null;
        this.follow();
    }

    /**
     * The shader drawn, of any origin, for the frame guard and the flashing check.
     * @returns Whether it is heavy, and its hash when it moves.
     */
    guardedDrawn(): { readonly heavy: boolean; readonly moving: readonly string[] } {
        const { shader } = this;
        if (shader === null || shader === undefined) {
            return { heavy: false, moving: [] };
        }

        return { heavy: shader.heavy === true, moving: this.moves() ? [shader.hash] : [] };
    }

    /** Release the target, the layer, the program and the observer. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        this.scene.onAfterRenderObservable.remove(this.afterObserver);
        this.program?.effect.dispose();
        this.program = null;
        if (this.tickTimer !== null) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }

        this.releaseTicks?.();
        this.releaseTicks = null;
        this.dropTarget();
        this.layer.dispose();
        this.renderer.dispose();
    }

    /**
     * Whether the shader drawn moves by itself: it loops and its speed is not 0.
     * @returns True when it does.
     */
    private moves(): boolean {
        const { shader } = this;
        if (shader === null) {
            return false;
        }

        const { motion, params } = shader.registration.descriptor;
        const { loop } = motionOf(motion);
        if (loop === undefined) {
            return false;
        }

        const speed = params.find((param) => param.name === loop.speedParam);
        return speed === undefined || uniformValueOf(speed, this.params?.[speed.name])[0] !== 0;
    }

    /**
     * Show the layer while a shader draws, and hold a tick hold while it moves: it asks for the
     * frames of its own ticks ({@link nextTick}), never for every frame.
     */
    private follow(): void {
        this.layer.isEnabled = this.shader !== null && this.target !== null;
        const moves = this.moves();
        if (moves && this.releaseTicks === null) {
            this.releaseTicks = this.runtime.uniforms.holdTicks();
        } else if (!moves && this.releaseTicks !== null) {
            this.releaseTicks();
            this.releaseTicks = null;
        }

        this.dirty = true;
        // A graph drawn on demand draws the frame that shows the change.
        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(release);
    }

    /**
     * Whether the target was drawn with other group outlines than the ones laid out now, so the
     * frame on screen does not show the background's tint yet.
     * @returns True while a draw is owed.
     */
    get owesDraw(): boolean {
        return this.program?.tinted === true && this.target !== null && this.readTints();
    }

    /**
     * Read the tinting groups into {@link tintsNow}.
     * @returns Whether they differ from the ones the target was last drawn with.
     */
    private readTints(): boolean {
        const now = this.tintsNow;
        now.fill(0);
        this.tints(BACKGROUND_TINTS)
            .slice(0, BACKGROUND_TINTS)
            .forEach((tint, i) => {
                now.set([tint.x, tint.y, tint.radius, 1, ...tint.color, 0], i * 8);
            });
        return now.some((value, i) => value !== this.tintsDrawn[i]);
    }

    /** Release the target and its bytes. */
    private dropTarget(): void {
        if (this.target !== null) {
            this.layer.texture = null;
            this.target.texture.dispose();
            this.target.release();
            this.target = null;
        }
    }

    /**
     * The target at the size the quality level asks for, made or remade when that changed; null
     * when the render-target budget has no room for it.
     * @returns The target.
     */
    private sizedTarget(): RenderTargetTexture | null {
        const engine = this.scene.getEngine();
        const size = this.guard.targetSize(engine.getRenderWidth(), engine.getRenderHeight());
        const held = this.target?.texture.getSize();
        if (this.target !== null && held?.width === size.width && held.height === size.height) {
            return this.target.texture;
        }

        this.dropTarget();
        const release = this.budget.reserve(targetBytes(size, false));
        if (release === null) {
            return null;
        }

        const texture = sceneTarget(this.scene, "graphty-background-target", size, false);
        this.target = { texture, release };
        this.layer.texture = texture;
        this.dirty = true;
        return texture;
    }

    /** Before each frame: draw the target again when it is due. */
    private frame(): void {
        this.onScreen = false;
        const { program } = this;
        const camera = this.scene.activeCamera;
        if (program === null || camera === null) {
            this.layer.isEnabled = false;
            return;
        }

        const target = this.sizedTarget();
        this.layer.isEnabled = target !== null;
        if (target === null) {
            return;
        }

        if (!this.layer.isReady()) {
            // The layer skips this frame while its program compiles: ask for the next one, so a
            // graph drawn on demand does not stay on the clear color.
            this.scene.onAfterRenderObservable.addOnce(animatesEveryFrame(this.scene));
        }

        const view = camera.getViewMatrix();
        const projection = camera.getProjectionMatrix();
        let cameraMoved = false;
        for (let i = 0; i < 16; i++) {
            cameraMoved ||=
                this.drawnWith[i] !== Math.fround(view.m[i]) || this.drawnWith[16 + i] !== Math.fround(projection.m[i]);
        }

        const now = performance.now();
        const fps = BACKGROUND_FPS[this.guard.quality.level];
        const moves = this.moves();
        const due = moves && now - this.drawnAt >= 1000 / fps - 1;
        if (moves) {
            this.nextTick(fps, due ? now : this.drawnAt);
        }

        const tintsMoved = program.tinted && this.readTints();
        // The image arrives after the shader may have drawn: draw again once it has loaded.
        const imageReady = this.image?.isReady() === true;
        const imageArrived = imageReady !== this.imageWasReady;
        if (this.image !== null && !imageReady) {
            // A graph drawn on demand asks for frames until the image has loaded.
            this.scene.onAfterRenderObservable.addOnce(animatesEveryFrame(this.scene));
        }

        if (!this.dirty && !cameraMoved && !due && !tintsMoved && !imageArrived) {
            return;
        }

        this.imageWasReady = imageReady;

        this.drawnWith.set(view.m, 0);
        this.drawnWith.set(projection.m, 16);
        this.tintsDrawn.set(this.tintsNow);
        this.drawnAt = now;
        this.dirty = false;
        this.draw(program.shader, program.effect, target, view.multiply(projection).invert());
    }

    /**
     * Ask for the frame of the next background tick, one tick after the last draw. A moving
     * background asks only for the frames it draws in, never for every frame: on a graph drawn on
     * demand the rest of the graph is drawn again 30 times a second, not 60 or 120.
     * @param fps - The background's rate.
     * @param from - When the last tick was drawn, by `performance.now()`.
     */
    private nextTick(fps: number, from: number): void {
        if (this.tickTimer !== null) {
            return;
        }

        const wait = Math.max(0, from + 1000 / fps - performance.now());
        this.tickTimer = setTimeout(() => {
            this.tickTimer = null;
            if (this.moves()) {
                this.runtime.uniforms.tick();
            }
        }, wait);
    }

    /**
     * Draw the shader into the target.
     * @param shader - The shader.
     * @param effect - Its program.
     * @param target - The target.
     * @param inverseViewProjection - The camera's inverse view-projection.
     */
    private draw(
        shader: HostShader,
        effect: SceneEffect,
        target: RenderTargetTexture,
        inverseViewProjection: Matrix,
    ): void {
        const { wrapper } = effect;
        const engine = this.scene.getEngine();
        const size = target.getSize();
        const apply = wrapper.onApplyObservable.addOnce(() => {
            const program = wrapper.effect;
            engine.setAlphaMode(Constants.ALPHA_DISABLE);
            this.runtime.uniforms.bindTo(program);
            program.setMatrix("graphty_invViewProj", inverseViewProjection);
            program.setVector3("graphty_eye", eyeOf(this.scene.activeCamera, inverseViewProjection));
            program.setVector2("graphty_resolution", new Vector2(size.width, size.height));
            program.setFloat("graphty_freeze", this.runtime.uniforms.frozenTime(shader.hash));
            program.setFloat4("graphty_fallback", ...this.fallback);
            const image = this.image?.isReady() === true ? this.image : null;
            program.setFloat("graphty_hasImage", image === null ? 0 : 1);
            program.setTexture("graphty_image", image);
            const tints = this.tintsDrawn;
            TINT_UNIFORMS.forEach((name, i) => {
                program.setFloat4(name, tints[i * 8], tints[i * 8 + 1], tints[i * 8 + 2], tints[i * 8 + 3]);
                program.setFloat4(TINT_COLOR_UNIFORMS[i], tints[i * 8 + 4], tints[i * 8 + 5], tints[i * 8 + 6], 0);
            });
            setParams(program, shader.registration.descriptor.params, this.params);
        });
        try {
            this.renderer.render(wrapper, target);
            this.draws++;
            this.runtime.noteDrawn([shader.hash]);
        } finally {
            wrapper.onApplyObservable.remove(apply);
        }
    }
}

/**
 * Where the background's rays start. A perspective camera's own place; for an orthographic (2D)
 * camera, whose rays are parallel, a point behind the far plane's center at its half height, so
 * the background spans a 90 degree view that pans and zooms with the camera.
 * @param camera - The camera.
 * @param inverseViewProjection - Its inverse view-projection.
 * @returns The point, in world space.
 */
function eyeOf(camera: Camera | null, inverseViewProjection: Matrix): Vector3 {
    if (camera === null) {
        return Vector3.Zero();
    }

    if (camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) {
        return camera.globalPosition;
    }

    const center = Vector3.TransformCoordinates(new Vector3(0, 0, 1), inverseViewProjection);
    const top = Vector3.TransformCoordinates(new Vector3(0, 1, 1), inverseViewProjection);
    const forward = camera.getDirection(Vector3.Forward());
    return center.subtract(forward.scale(Vector3.Distance(center, top)));
}

/**
 * @file A background shader (design/rendering/shader-styles.md sections 3.6 and 5): drawn into its
 * own render target at most 30 times a second (15 at low quality), and shown behind everything the
 * scene draws, so it is behind every node and never over a label.
 *
 * The target is drawn again only when it must be: the shader moves (a loop whose speed is not 0),
 * the camera moved (the shader reads the view direction), the canvas or the quality changed size,
 * or the parameters changed. A still background on a still graph costs one blit a frame.
 *
 * Loaded with the shader runtime, never by a graph that names no shader.
 */

import {
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

import { motionOf, type ShaderParams } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { RenderTargetBudget, ShaderGuard } from "../managers/ShaderGuard";
import type { HostShader } from "../session/shaders";
import { backgroundProgram } from "../shaders/runtime/scenePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { uniformValueOf } from "../shaders/runtime/wrap";
import { type SceneEffect, sceneEffect, sceneTarget, setParams, targetBytes } from "./sceneShaderEffect";

/** The background layer's name; the boundary layer is kept after it. */
export const BACKGROUND_LAYER = "graphty-background-shader";

/** The fastest the background target is drawn again, frames a second, by quality level. */
const BACKGROUND_FPS = { low: 15, medium: 30, high: 30 } as const;

/** One background shader drawn behind a scene. */
export class BackgroundPass {
    private readonly renderer: EffectRenderer;
    private readonly layer: Layer;
    private readonly observer: Observer<Scene>;
    private program: { readonly shader: HostShader; readonly effect: SceneEffect } | null = null;
    /** Counts show and hide calls, so a compile that finishes after a newer call is dropped. */
    private showing = 0;
    private params: ShaderParams | undefined;
    private fallback: readonly [number, number, number, number] = [0, 0, 0, 1];
    private target: { readonly texture: RenderTargetTexture; readonly release: () => void } | null = null;
    private releaseMotion: (() => void) | null = null;
    /** When the target was last drawn, by `performance.now()`. */
    private drawnAt = Number.NEGATIVE_INFINITY;
    /** The camera's view and projection the target was last drawn with. */
    private readonly drawnWith = new Float32Array(32);
    private dirty = true;
    /** How many times the target was drawn, for tests and tools. */
    draws = 0;

    /**
     * Start drawing backgrounds behind a scene; nothing shows until {@link show} compiled one.
     * @param scene - The scene.
     * @param runtime - The shader runtime, for the scene uniforms and motion claims.
     * @param guard - The frame guard, for the quality level and the target size.
     * @param budget - The scene's shader render-target budget.
     */
    constructor(
        private readonly scene: Scene,
        private readonly runtime: ShaderRuntime,
        private readonly guard: ShaderGuard,
        private readonly budget: RenderTargetBudget,
    ) {
        const engine = scene.getEngine();
        this.renderer = new EffectRenderer(engine);
        this.layer = new Layer(BACKGROUND_LAYER, null, scene, true);
        this.layer.isEnabled = false;
        // First of the scene's layers, so it is drawn under every other one.
        const { layers } = scene;
        layers.splice(layers.indexOf(this.layer), 1);
        layers.unshift(this.layer);
        this.observer = scene.onBeforeRenderObservable.add(() => {
            this.frame();
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
     * @returns Resolves true once it draws; false when it failed to compile (the clear color shows)
     *     or a later call replaced it.
     */
    async show(
        shader: HostShader,
        params: ShaderParams | undefined,
        fallback: readonly [number, number, number, number],
    ): Promise<boolean> {
        this.params = params;
        this.fallback = fallback;
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
        this.program = { shader, effect };
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
     * The pasted shader drawn, for the frame guard and the flashing check.
     * @returns Whether a pasted shader draws, and its hash when it moves.
     */
    pastedDrawn(): { readonly any: boolean; readonly moving: readonly string[] } {
        const { shader } = this;
        if (shader?.pasted !== true) {
            return { any: false, moving: [] };
        }

        return { any: true, moving: this.moves() ? [shader.hash] : [] };
    }

    /** Release the target, the layer, the program and the observer. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        this.program?.effect.dispose();
        this.program = null;
        this.releaseMotion?.();
        this.releaseMotion = null;
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

    /** Show the layer while a shader draws, and hold a motion claim while it moves. */
    private follow(): void {
        this.layer.isEnabled = this.shader !== null && this.target !== null;
        const moves = this.moves();
        if (moves && this.releaseMotion === null) {
            this.releaseMotion = this.runtime.uniforms.claimMotion();
        } else if (!moves && this.releaseMotion !== null) {
            this.releaseMotion();
            this.releaseMotion = null;
        }

        this.dirty = true;
        // A graph drawn on demand draws the frame that shows the change.
        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(release);
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

        const view = camera.getViewMatrix();
        const projection = camera.getProjectionMatrix();
        let cameraMoved = false;
        for (let i = 0; i < 16; i++) {
            cameraMoved ||=
                this.drawnWith[i] !== Math.fround(view.m[i]) || this.drawnWith[16 + i] !== Math.fround(projection.m[i]);
        }

        const now = performance.now();
        const fps = BACKGROUND_FPS[this.guard.quality.level];
        const due = this.moves() && now - this.drawnAt >= 1000 / fps - 1;
        if (!this.dirty && !cameraMoved && !due) {
            return;
        }

        this.drawnWith.set(view.m, 0);
        this.drawnWith.set(projection.m, 16);
        this.drawnAt = now;
        this.dirty = false;
        this.draw(program.shader, program.effect, target, view.multiply(projection).invert());
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

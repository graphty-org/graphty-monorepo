/**
 * @file The shader runtime of one graph: compiling a shader in the element's own engine, its
 * advisory test frame, its thumbnail, the scene uniforms, and what happens when the GPU is lost
 * (design/rendering/shader-styles.md sections 4.3 and 5).
 *
 * **One compile at a time.** Every compile, test frame and thumbnail waits its turn in one queue,
 * so a page given ten pasted shaders at once never asks the driver for ten programs at once (a
 * known way to stall iPad Safari). Babylon uses `KHR_parallel_shader_compile` where the driver has
 * it, so the queue waits on the driver without blocking the page.
 *
 * **A failed compile rests the loop.** Babylon keeps every effect it was asked for in its engine,
 * and `areAllEffectsReady()` stays false for one that never compiles, which keeps a graph drawn on
 * demand drawing every frame for ever. So a failed effect is disposed -- taken out of the engine
 * and out of the shader store -- before the failure is reported.
 *
 * **Sources are inline.** Each program's text goes into Babylon's shader store under a name made
 * from its text hash, so nothing is fetched lazily at draw time (iPad Safari reports a failed
 * module import as a material that never becomes ready), and two graphs on one page with the same
 * id and different text never share a program.
 *
 * **The test frame is advisory.** It catches a runaway shader the static bound missed; it does not
 * bound cost. It draws on a 4 x 4 square, then 64 x 64, then 256 x 256 of a render target, at the
 * defaults, every minimum and every maximum and at three times, and stops at once when the time
 * grows faster than the pixel count. A shader whose cost per pixel, over the largest area its kind
 * can cover here, would take longer than {@link FRAME_LIMIT_MS} is refused with
 * `shader.over-budget`.
 */

import {
    type AbstractEngine,
    Constants,
    type Effect,
    EffectRenderer,
    type Observer,
    type RenderTargetWrapper,
    type Scene,
    ShaderStore,
    Viewport,
} from "@babylonjs/core";

import { drawingOf, type ShaderParamDescriptor, type ShaderParams, type ShaderProblem } from "../../catalog/shaders";
import { type HostShader, SHADER_THUMBNAIL_SIZE } from "../../session/shaders";
import { clearCrash, markCrash } from "../crashMarker";
import { SceneUniforms } from "./sceneUniforms";
import { compileProblem, sampleProgram, uniformValueOf } from "./wrap";

/** The longest one frame of a shader may be estimated at before the test frame refuses it. */
export const FRAME_LIMIT_MS = 250;

/** The test frame's square sizes, in pixels. */
const TEST_SIZES = [4, 64, 256] as const;

/** The times the test frame draws at, in seconds. */
const TEST_TIMES = [0, 1.7, 13.3] as const;

/** The thumbnail's size, in pixels. */
const THUMBNAIL_SIZE = SHADER_THUMBNAIL_SIZE;

/** How long a page must have been visible before a lost context counts against a shader. */
const VISIBLE_WINDOW_MS = 2000;

/** How long after a compile or a test frame the crash marker waits before it lets the hash go. */
const CALM_MS = 500;

/**
 * The parameter values of one test variant.
 * @param params - The parameters.
 * @param end - Which end of each range, or the defaults.
 * @returns The values.
 */
function variantOf(params: readonly ShaderParamDescriptor[], end: "default" | "min" | "max"): ShaderParams {
    const values: Record<string, number | string | boolean> = {};
    for (const param of params) {
        if (end !== "default" && typeof param[end] === "number") {
            values[param.name] = param[end];
        } else if (end !== "default" && param.type === "enum" && param.values !== undefined) {
            values[param.name] = (end === "min" ? param.values[0] : param.values.at(-1))?.value as string;
        } else if (end !== "default" && param.type === "boolean") {
            values[param.name] = end === "max";
        }
    }

    return values;
}

/** The shader runtime of one graph's scene. */
export class ShaderRuntime {
    /** The uniforms every program shares. */
    readonly uniforms: SceneUniforms;
    private readonly engine: AbstractEngine;
    private queue: Promise<unknown> = Promise.resolve();
    /** The sample programs, by text hash. */
    private readonly effects = new Map<string, { effect: Effect; name: string }>();
    /** When each hash was last drawn, by `performance.now()`. */
    private readonly drawn = new Map<string, number>();
    /** The hashes this runtime put in the crash marker. */
    private readonly marked = new Set<string>();
    private readonly lostListeners = new Set<(hashes: readonly string[]) => void>();
    private readonly lostObserver: Observer<AbstractEngine>;
    private renderer: EffectRenderer | null = null;
    private target: RenderTargetWrapper | null = null;
    /** Until when the page counts as having been hidden recently. */
    private hiddenUntil = 0;
    private disposed = false;
    private readonly onVisibility = (): void => {
        this.hiddenUntil = performance.now() + VISIBLE_WINDOW_MS;
    };

    private readonly onPageHide = (): void => {
        this.releaseMarks([...this.marked]);
    };

    /**
     * Build the runtime of a scene.
     * @param scene - The scene.
     */
    constructor(private readonly scene: Scene) {
        this.engine = scene.getEngine();
        this.uniforms = new SceneUniforms(this.engine, scene);
        this.lostObserver = this.engine.onContextLostObservable.add(() => {
            this.contextLost();
        });
        globalThis.document?.addEventListener("visibilitychange", this.onVisibility);
        globalThis.addEventListener?.("pagehide", this.onPageHide);
    }

    /**
     * Compile a shader and run its test frame, in its turn.
     * @param shader - The shader.
     * @returns Null when it passes, else the problem.
     */
    check(shader: HostShader): Promise<ShaderProblem | null> {
        return this.enqueue(async () => {
            this.mark(shader.hash);
            try {
                const compiled = await this.compile(shader);
                if ("code" in compiled) {
                    return compiled;
                }

                const problem = await this.testFrame(compiled, shader);
                if (problem !== null) {
                    this.forget(shader.hash);
                }

                return problem;
            } finally {
                this.calm(shader.hash);
            }
        });
    }

    /**
     * Draw a still picture of a shader on its sample square, framed by what it draws on (see
     * `sampleProgram`).
     * @param shader - The shader.
     * @param params - Parameter values over its defaults.
     * @param time - The time of the frame, in seconds.
     * @returns A PNG.
     */
    thumbnail(shader: HostShader, params: ShaderParams, time: number): Promise<Blob> {
        return this.enqueue(async () => {
            this.mark(shader.hash);
            try {
                const compiled = await this.compile(shader);
                if ("code" in compiled) {
                    throw new Error(String(compiled.params.message));
                }

                return await this.picture(compiled, shader, params, time);
            } finally {
                this.calm(shader.hash);
            }
        });
    }

    /**
     * Note that shaders were drawn this frame, so a context lost in the next 2 seconds is held
     * against them. For the node and edge batches.
     * @param hashes - The text hashes drawn.
     */
    noteDrawn(hashes: Iterable<string>): void {
        const now = performance.now();
        for (const hash of hashes) {
            this.drawn.set(hash, now);
        }
    }

    /**
     * Name shaders in the crash marker while they draw; call when the set of drawn pasted
     * shaders changes, never per frame.
     * @param hashes - The text hashes now drawn.
     */
    markDrawing(hashes: Iterable<string>): void {
        for (const hash of hashes) {
            this.mark(hash);
            this.calm(hash);
        }
    }

    /**
     * Listen for the GPU being lost while the page was visible.
     * @param listener - Called with the hashes drawn in the last 2 seconds.
     * @returns Stops listening.
     */
    onLost(listener: (hashes: readonly string[]) => void): () => void {
        this.lostListeners.add(listener);
        return () => {
            this.lostListeners.delete(listener);
        };
    }

    /** Release every program, target, observer and listener, and the runtime's crash marks. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.engine.onContextLostObservable.remove(this.lostObserver);
        globalThis.document?.removeEventListener("visibilitychange", this.onVisibility);
        globalThis.removeEventListener?.("pagehide", this.onPageHide);
        this.releaseMarks([...this.marked]);
        this.lostListeners.clear();
        // The engine may already be gone (a graph that switched renderers disposes the old one
        // first), and a GPU object released after its engine has nothing left to release.
        try {
            for (const hash of [...this.effects.keys()]) {
                this.forget(hash);
            }

            this.target?.dispose();
            this.renderer?.dispose();
            this.uniforms.dispose();
        } catch {
            // Released with the engine.
        }

        this.target = null;
        this.renderer = null;
    }

    /**
     * Run work after everything queued before it.
     * @param work - The work.
     * @returns What it resolves with.
     */
    private enqueue<T>(work: () => Promise<T>): Promise<T> {
        const run = this.queue.then(async () => {
            if (this.disposed) {
                throw new Error("The shader runtime was disposed.");
            }

            return work();
        });
        this.queue = run.catch(() => undefined);
        return run;
    }

    /**
     * Compile a shader's sample program, or hand back the one compiled before.
     * @param shader - The shader.
     * @returns The effect, or the compile problem.
     */
    private compile(shader: HostShader): Promise<Effect | ShaderProblem> {
        const known = this.effects.get(shader.hash);
        if (known !== undefined) {
            return Promise.resolve(known.effect);
        }

        const { descriptor, glsl } = shader.registration;
        const program = sampleProgram(descriptor, glsl);
        const name = `graphtyShader${shader.hash.slice(0, 24)}`;
        ShaderStore.ShadersStore[`${name}VertexShader`] = program.vertex;
        ShaderStore.ShadersStore[`${name}FragmentShader`] = program.fragment;

        return new Promise((resolve) => {
            // A driver that compiles synchronously reports the error from inside createEffect,
            // before the engine has filed the effect; disposing it then would leave the filed one
            // never ready. So a failure is handled once createEffect has returned.
            let created = false;
            let failure: { effect: Effect; errors: string } | null = null;
            const fail = (effect: Effect, errors: string): void => {
                // Out of the engine before anything is reported, so the loop can rest.
                effect.dispose(true);
                forgetSource(name);
                resolve(compileProblem(errors, shader.bodyLine));
            };
            this.engine.createEffect(
                { vertex: name, fragment: name },
                {
                    attributes: ["position"],
                    uniformsNames: [...program.uniforms],
                    uniformBuffersNames: [...program.uniformBuffers],
                    samplers: [],
                    defines: "",
                    fallbacks: null,
                    onCompiled: (effect) => {
                        this.effects.set(shader.hash, { effect, name });
                        resolve(effect);
                    },
                    onError: (effect, errors) => {
                        if (created) {
                            fail(effect, errors);
                        } else {
                            failure = { effect, errors };
                        }
                    },
                },
                this.engine,
            );
            created = true;
            const failed = failure as { effect: Effect; errors: string } | null;
            if (failed !== null) {
                fail(failed.effect, failed.errors);
            }
        });
    }

    /**
     * Take a compiled program out of the engine and the store.
     * @param hash - Its text hash.
     */
    private forget(hash: string): void {
        const known = this.effects.get(hash);
        if (known === undefined) {
            return;
        }

        this.effects.delete(hash);
        known.effect.dispose(true);
        forgetSource(known.name);
    }

    /**
     * The render target the test frame and the thumbnail draw into, built on first use.
     * @returns The target and the square renderer.
     */
    private surface(): { target: RenderTargetWrapper; renderer: EffectRenderer } {
        this.renderer ??= new EffectRenderer(this.engine);
        this.target ??= this.engine.createRenderTargetTexture(
            { width: 256, height: 256 },
            {
                generateMipMaps: false,
                generateDepthBuffer: false,
                generateStencilBuffer: false,
                type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            },
        );
        return { target: this.target, renderer: this.renderer };
    }

    /**
     * Draw a shader's sample program once on a square of the target, which must be bound.
     * @param effect - The program.
     * @param shader - The shader.
     * @param size - The square's side, in pixels.
     * @param params - Parameter values over the defaults.
     * @param time - The time, in seconds.
     */
    private draw(effect: Effect, shader: HostShader, size: number, params: ShaderParams, time: number): void {
        const { renderer } = this.surface();
        const { descriptor } = shader.registration;
        this.engine.setViewport(new Viewport(0, 0, size / 256, size / 256));
        this.engine.enableEffect(effect);
        this.engine.setState(false);
        this.engine.setDepthBuffer(false);
        this.engine.setDepthWrite(false);
        this.engine.setAlphaMode(Constants.ALPHA_DISABLE);
        renderer.bindBuffers(effect);
        this.uniforms.write(time);
        this.uniforms.bindTo(effect);
        effect.setFloat4("graphty_sampleColor", 0.33, 0.55, 0.85, 1);
        effect.setFloat4("graphty_sampleSize", size, size, 0, 0);
        effect.setFloat("graphty_sampleReach", descriptor.reach ?? 1);
        for (const param of descriptor.params) {
            const value = uniformValueOf(param, params[param.name]);
            if (value.length === 3) {
                effect.setFloat3(`graphty_p_${param.name}`, value[0], value[1], value[2]);
            } else {
                effect.setFloat(`graphty_p_${param.name}`, value[0]);
            }
        }

        renderer.draw();
        this.drawn.set(shader.hash, performance.now());
    }

    /**
     * Run the test frame.
     * @param effect - The compiled program.
     * @param shader - The shader.
     * @returns Null when it passes, else `shader.over-budget`.
     */
    private async testFrame(effect: Effect, shader: HostShader): Promise<ShaderProblem | null> {
        const { params } = shader.registration.descriptor;
        const variants = (["default", "min", "max"] as const).map((end) => variantOf(params, end));
        const { target } = this.surface();
        const resting = this.uniforms.currentTime;
        let previous: { size: number; ms: number } | null = null;
        let perPixel = 0;
        try {
            for (const size of TEST_SIZES) {
                const started = performance.now();
                this.engine.bindFramebuffer(target, undefined, undefined, undefined, true);
                for (const values of variants) {
                    for (const time of TEST_TIMES) {
                        this.draw(effect, shader, size, values, time);
                    }
                }

                // Reading a pixel waits for the GPU to finish what it was given.
                await this.engine.readPixels(0, 0, 1, 1, true, false);
                this.engine.unBindFramebuffer(target);
                const ms = performance.now() - started;
                const draws = variants.length * TEST_TIMES.length;
                perPixel = ms / (draws * size * size);
                // Growth faster than the pixel count (with room for fixed costs) is a runaway.
                if (previous !== null && ms > 4 && ms / previous.ms > ((size * size) / previous.size ** 2) * 2) {
                    return this.overBudget(perPixel, shader);
                }

                previous = { size, ms };
            }
        } finally {
            this.uniforms.write(resting);
            this.engine.restoreDefaultFramebuffer();
            this.engine.wipeCaches(true);
        }

        const area = this.areaOf(shader);
        return perPixel * area > FRAME_LIMIT_MS ? this.overBudget(perPixel, shader) : null;
    }

    /**
     * The most pixels a shader of this target and place can cover on this canvas.
     * @param shader - The shader.
     * @returns The pixel count.
     */
    private areaOf(shader: HostShader): number {
        const drawing = drawingOf(shader.registration.descriptor);
        if (drawing === "node-square" || drawing === "edge-along") {
            // The largest square a stacking use draws on at the quality level now.
            return this.uniforms.effectCap * this.uniforms.effectCap;
        }

        return Math.max(1, this.engine.getRenderWidth() * this.engine.getRenderHeight());
    }

    /**
     * The over-budget problem.
     * @param perPixel - The measured cost of one pixel, in milliseconds.
     * @param shader - The shader.
     * @returns The problem.
     */
    private overBudget(perPixel: number, shader: HostShader): ShaderProblem {
        const pixels = this.areaOf(shader);
        return {
            code: "shader.over-budget",
            params: { ms: Math.round(perPixel * pixels), limit: FRAME_LIMIT_MS, pixels },
        };
    }

    /**
     * Draw a still picture.
     * @param effect - The compiled program.
     * @param shader - The shader.
     * @param params - Parameter values over the defaults.
     * @param time - The time, in seconds.
     * @returns A PNG.
     */
    private async picture(effect: Effect, shader: HostShader, params: ShaderParams, time: number): Promise<Blob> {
        const { target } = this.surface();
        const resting = this.uniforms.currentTime;
        let pixels: Uint8Array;
        try {
            this.engine.bindFramebuffer(target, undefined, undefined, undefined, true);
            this.draw(effect, shader, THUMBNAIL_SIZE, params, time);
            const read = await this.engine.readPixels(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE, true, false);
            pixels = new Uint8Array(read.buffer, read.byteOffset, read.byteLength);
            this.engine.unBindFramebuffer(target);
        } finally {
            this.uniforms.write(resting);
            this.engine.restoreDefaultFramebuffer();
            this.engine.wipeCaches(true);
        }

        // Bodies return straight alpha in every place, and the picture is drawn with no blending.
        return pngOf(pixels, THUMBNAIL_SIZE);
    }

    /**
     * The context was lost: when the page had been visible, tell the listeners which shaders were
     * drawn in the last 2 seconds. A context lost in a background tab (the browser reclaiming it)
     * says nothing about a shader.
     */
    private contextLost(): void {
        const now = performance.now();
        const visible = globalThis.document?.visibilityState !== "hidden" && now >= this.hiddenUntil;
        // The programs are gone with the context; they compile again when asked.
        for (const hash of [...this.effects.keys()]) {
            this.forget(hash);
        }

        if (!visible) {
            return;
        }

        const recent = [...this.drawn].filter(([, at]) => now - at <= VISIBLE_WINDOW_MS).map(([hash]) => hash);
        for (const listener of this.lostListeners) {
            listener(recent);
        }
    }

    /**
     * Put a hash in the crash marker.
     * @param hash - The hash.
     */
    private mark(hash: string): void {
        this.marked.add(hash);
        markCrash([hash]);
    }

    /**
     * Let a hash go from the crash marker once a moment has passed calmly.
     * @param hash - The hash.
     */
    private calm(hash: string): void {
        setTimeout(() => {
            this.releaseMarks([hash]);
        }, CALM_MS);
    }

    /**
     * Take hashes out of the crash marker.
     * @param hashes - The hashes.
     */
    private releaseMarks(hashes: readonly string[]): void {
        for (const hash of hashes) {
            this.marked.delete(hash);
        }

        clearCrash(hashes);
    }
}

/**
 * Take a program's two stages out of Babylon's shader store.
 * @param name - The program's name in the store.
 */
function forgetSource(name: string): void {
    Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}VertexShader`);
    Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}FragmentShader`);
}

/**
 * A PNG of RGBA pixels read from a render target, whose rows run bottom up.
 * @param pixels - The pixels.
 * @param size - The side, in pixels.
 * @returns The PNG.
 */
function pngOf(pixels: Uint8Array, size: number): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context === null) {
        return Promise.reject(new Error("No 2D canvas to write the thumbnail with."));
    }

    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        const from = (size - 1 - y) * size * 4;
        for (let x = 0; x < size * 4; x += 4) {
            const a = pixels[from + x + 3];
            const to = y * size * 4 + x;
            image.data[to] = pixels[from + x];
            image.data[to + 1] = pixels[from + x + 1];
            image.data[to + 2] = pixels[from + x + 2];
            image.data[to + 3] = a;
        }
    }

    context.putImageData(image, 0, 0);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob === null) {
                reject(new Error("The thumbnail could not be encoded."));
            } else {
                resolve(blob);
            }
        }, "image/png");
    });
}

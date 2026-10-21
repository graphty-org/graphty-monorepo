/**
 * @file The lazily loaded shader renderer: the {@link ShaderHost} a graph lends its session,
 * which fetches the shader runtime (`./runtime`) the first time something asks it to compile or
 * draw a shader (design/rendering/shader-styles.md section 5).
 *
 * A graph that names no shader never loads the runtime: no program, no uniform buffer, no frame
 * observer and no listener is added to its scene, so it draws exactly what it drew before shaders
 * existed. The crash marker is read here, at once and synchronously, because it must be read
 * before autosave restores any layer.
 */

import type { Scene } from "@babylonjs/core";

import type { ShaderParams, ShaderProblem } from "../catalog/shaders";
import { QUALITY_LEVELS, ShaderGuard } from "../managers/ShaderGuard";
import { NodeShaderDrawing } from "../meshes/NodeShaderDrawing";
import type { HostShader, RenderQualityChange, ShaderHost } from "../session/shaders";
import { readCrashMarker } from "./crashMarker";
import type { ShaderRuntime } from "./runtime";

/** A host whose runtime may not be loaded yet, with what the node and edge batches reach. */
export interface LazyShaderHost extends ShaderHost {
    /**
     * The runtime, loading it when it is not yet.
     * @returns The runtime.
     */
    runtime(): Promise<ShaderRuntime>;
    /** The runtime when it is already loaded, else null. */
    readonly loaded: ShaderRuntime | null;
}

/**
 * The shader host of a graph's scene.
 * @param scene - The scene.
 * @param guard - The frame guard of the scene's render loop, whose quality the shaders draw at.
 * @returns The host. Nothing is loaded or built until it is asked to compile or draw.
 */
export function createLazyShaderHost(scene: Scene, guard: ShaderGuard = new ShaderGuard()): LazyShaderHost {
    const crashMarked = readCrashMarker();
    const listeners = new Set<(hashes: readonly string[]) => void>();
    const renderListeners = new Set<(change: RenderQualityChange | null) => void>();
    /** The text hashes frozen because their output flashed. */
    const flashing = new Set<string>();
    let loading: Promise<ShaderRuntime> | null = null;
    let loaded: ShaderRuntime | null = null;
    let disposed = false;

    /** Draw the loaded runtime at the guard's quality. */
    const apply = (): void => {
        if (loaded === null) {
            return;
        }

        const { level, motion } = guard.quality;
        loaded.uniforms.setQuality(level);
        loaded.uniforms.setMoving(motion === "on" || motion === "half");
        loaded.uniforms.effectCap = QUALITY_LEVELS[level].effectCap;
    };

    const stopGuard = guard.onChange((change) => {
        apply();
        for (const listener of renderListeners) {
            listener(change);
        }
    });

    // `motion: "system"` follows the platform's reduced-motion preference, as it changes.
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onReduced = (): void => {
        guard.setSystemStill(reduced?.matches);
    };
    reduced?.addEventListener("change", onReduced);
    onReduced();

    const runtime = (): Promise<ShaderRuntime> => {
        if (disposed) {
            return Promise.reject(new Error("The graph was disposed."));
        }

        loading ??= import("./runtime").then(({ ShaderRuntime }) => {
            const built = new ShaderRuntime(scene);
            if (disposed) {
                built.dispose();
                throw new Error("The graph was disposed.");
            }

            built.onLost((hashes) => {
                for (const listener of listeners) {
                    listener(hashes);
                }
            });
            loaded = built;
            apply();
            guard.lend({
                claimed: () => built.uniforms.claimed,
                pastedOnScreen: () => NodeShaderDrawing.peek(scene)?.pastedDrawn().any === true,
                movingPasted: () =>
                    (NodeShaderDrawing.peek(scene)?.pastedDrawn().moving ?? []).filter((hash) => !flashing.has(hash)),
                freeze: (hashes) => {
                    for (const hash of hashes) {
                        flashing.add(hash);
                        built.uniforms.freeze(hash);
                    }

                    guard.announce();
                },
            });
            return built;
        });
        return loading;
    };

    return {
        renderer: scene.getEngine().isWebGPU ? "webgpu" : "webgl",
        crashMarked,
        runtime,
        get loaded() {
            return loaded;
        },
        check: (shader: HostShader): Promise<ShaderProblem | null> => runtime().then((built) => built.check(shader)),
        thumbnail: (shader: HostShader, params: ShaderParams): Promise<Blob> =>
            runtime().then((built) => built.thumbnail(shader, params)),
        configure(settings) {
            guard.configure(settings);
            apply();
        },
        get quality() {
            return guard.quality;
        },
        get flashing() {
            return flashing;
        },
        onRender(listener) {
            renderListeners.add(listener);
            return () => {
                renderListeners.delete(listener);
            };
        },
        onLost(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispose() {
            disposed = true;
            stopGuard();
            guard.lend(null);
            reduced?.removeEventListener("change", onReduced);
            renderListeners.clear();
            listeners.clear();
            loaded?.dispose();
            loaded = null;
        },
    };
}

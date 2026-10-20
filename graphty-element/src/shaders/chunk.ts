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
import type { HostShader, ShaderHost } from "../session/shaders";
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
 * @returns The host. Nothing is loaded or built until it is asked to compile or draw.
 */
export function createLazyShaderHost(scene: Scene): LazyShaderHost {
    const crashMarked = readCrashMarker();
    const listeners = new Set<(hashes: readonly string[]) => void>();
    let quality: "low" | "medium" | "high" = "high";
    let loading: Promise<ShaderRuntime> | null = null;
    let loaded: ShaderRuntime | null = null;
    let disposed = false;

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

            built.uniforms.setQuality(quality);
            built.onLost((hashes) => {
                for (const listener of listeners) {
                    listener(hashes);
                }
            });
            loaded = built;
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
        setQuality(level) {
            quality = level;
            loaded?.uniforms.setQuality(level);
        },
        onLost(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispose() {
            disposed = true;
            listeners.clear();
            loaded?.dispose();
            loaded = null;
        },
    };
}

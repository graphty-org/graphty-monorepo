/**
 * @file What the scene passes (the background and the group outlines) share: a program compiled as an
 * `EffectWrapper` whose two stages are inline in Babylon's shader store, its parameters as plain
 * uniforms, and a render target sized by the shader quality level and its memory budget.
 *
 * Loaded with the shader runtime, never by a graph that names no shader.
 */

import {
    type AbstractEngine,
    Color4,
    Constants,
    type Effect,
    EffectWrapper,
    RenderTargetTexture,
    type Scene,
    ShaderStore,
    Texture,
} from "@babylonjs/core";

import type { ShaderParamDescriptor, ShaderParams } from "../catalog/shaders";
import type { SceneProgram } from "../shaders/runtime/scenePrograms";
import { uniformValueOf } from "../shaders/runtime/wrap";

/** How many scene programs were compiled, which makes each one's name unique. */
let compiles = 0;

/** A render target's size, in pixels. */
export interface TargetSize {
    readonly width: number;
    readonly height: number;
}

/** A compiled scene program. */
export interface SceneEffect {
    readonly wrapper: EffectWrapper;
    /** Resolves true once compiled, false when it failed. */
    readonly ready: Promise<boolean>;
    /** Release the program and its stages in the shader store. */
    dispose(): void;
}

/**
 * Compile a scene program.
 * @param engine - The engine.
 * @param base - The start of its name in the shader store.
 * @param program - The program.
 * @returns The effect.
 */
export function sceneEffect(engine: AbstractEngine, base: string, program: SceneProgram): SceneEffect {
    // Unique per compile: Babylon caches an effect by its shader names, so two compiles of one
    // text under one name would share an effect, and disposing the one a newer call replaced
    // would dispose the one drawing.
    const name = `${base}n${String(++compiles)}`;
    ShaderStore.ShadersStore[`${name}VertexShader`] = program.vertex;
    ShaderStore.ShadersStore[`${name}FragmentShader`] = program.fragment;
    const wrapper = new EffectWrapper({
        engine,
        name,
        vertexShader: name,
        fragmentShader: name,
        useShaderStore: true,
        attributeNames: [...program.attributes],
        uniformNames: [...program.uniforms],
        uniformBuffers: [...program.uniformBuffers],
        samplerNames: [...program.samplers],
    });
    const ready = new Promise<boolean>((resolve) => {
        const { effect } = wrapper;
        if (effect.isReady()) {
            resolve(true);
            return;
        }

        effect.onCompileObservable.addOnce(() => {
            resolve(true);
        });
        effect.onErrorObservable.addOnce(() => {
            resolve(false);
        });
    });

    return {
        wrapper,
        ready,
        dispose() {
            try {
                wrapper.dispose();
            } catch {
                // Released with the engine.
            }

            Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}VertexShader`);
            Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}FragmentShader`);
        },
    };
}

/**
 * Set a shader's parameters as its program's uniforms; the program clamps each to its range.
 * @param effect - The program.
 * @param params - The parameters the shader declares.
 * @param values - Values over the defaults.
 */
export function setParams(
    effect: Effect,
    params: readonly ShaderParamDescriptor[],
    values: ShaderParams | undefined,
): void {
    for (const param of params) {
        const value = uniformValueOf(param, values?.[param.name]);
        if (value.length === 3) {
            effect.setFloat3(`graphty_p_${param.name}`, value[0], value[1], value[2]);
        } else {
            effect.setFloat(`graphty_p_${param.name}`, value[0]);
        }
    }
}

/**
 * A color render target cleared to transparent black, sampled linearly and clamped.
 * @param scene - The scene.
 * @param name - Its name.
 * @param size - Its size in pixels.
 * @param halfFloat - Whether its texels are 16-bit floats (else 8-bit).
 * @returns The target.
 */
export function sceneTarget(scene: Scene, name: string, size: TargetSize, halfFloat: boolean): RenderTargetTexture {
    const target = new RenderTargetTexture(name, size, scene, {
        generateMipMaps: false,
        generateDepthBuffer: false,
        type: halfFloat ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
        samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    });
    target.wrapU = Texture.CLAMP_ADDRESSMODE;
    target.wrapV = Texture.CLAMP_ADDRESSMODE;
    target.clearColor = new Color4(0, 0, 0, 0);
    target.renderList = [];
    return target;
}

/**
 * The bytes a target of this size holds.
 * @param size - Its size.
 * @param halfFloat - Whether its texels are 16-bit floats.
 * @returns The bytes.
 */
export function targetBytes(size: TargetSize, halfFloat: boolean): number {
    return size.width * size.height * (halfFloat ? 8 : 4);
}

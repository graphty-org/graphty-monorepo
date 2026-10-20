/**
 * Helpers for the scene-spectacle stories: full-screen passes that read other passes and render
 * targets, a lab layer redrawn into an off-screen texture with another fragment shader, and
 * world-to-screen projection for driving screen-space effects from node positions.
 */
import {
    type BaseTexture,
    Color4,
    Constants,
    Effect,
    PostProcess,
    RenderTargetTexture,
    ShaderMaterial,
} from "@babylonjs/core";

import { GLSL_LIBRARY, type LabContext, type LabLayer, QUALITY_SETTINGS } from "../harness";

const AA = `
float fill(float d) { float w = fwidth(d); return 1.0 - smoothstep(-w, w, d); }
float stroke(float d, float hw) { return fill(abs(d) - hw); }
`;

export type SamplerSource = { input: PostProcess } | { texture: BaseTexture };

export interface PassOptions {
    fragment: string;
    /** Size of this pass's INPUT texture relative to the canvas. */
    ratio?: number;
    /** Uniforms read every frame: a number is a float, an array a vec2-vec4. */
    uniforms?: Record<string, () => number | number[]>;
    samplers?: Record<string, () => SamplerSource>;
    /** MSAA samples on the input (4 on the first pass keeps the scene smooth). */
    samples?: number;
}

let count = 0;

/**
 * A full-screen pass with extra samplers. It also gets `time`, `texel` (one input texel in uv)
 * and `resolution` (canvas device pixels).
 * @param ctx - the lab context
 * @param o - shader, ratio, uniforms and samplers
 * @returns the post-process, after every earlier pass on the lab camera
 */
export function addPass(ctx: LabContext, o: PassOptions): PostProcess {
    const name = `spectaclePass${++count}`;
    const uniforms = o.uniforms ?? {};
    const decl = Object.entries(uniforms).map(([n, get]) => {
        const v = get();
        return `uniform ${Array.isArray(v) && v.length > 1 ? `vec${v.length}` : "float"} ${n};`;
    });
    const samplers = Object.keys(o.samplers ?? {});
    Effect.ShadersStore[`${name}FragmentShader`] = `precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
${samplers.map((s) => `uniform sampler2D ${s};`).join("\n")}
uniform float time;
uniform vec2 texel;
uniform vec2 resolution;
${decl.join("\n")}
${ctx.defines}${GLSL_LIBRARY}
${AA}
${o.fragment}`;
    const pp = new PostProcess(
        name,
        name,
        ["time", "texel", "resolution", ...Object.keys(uniforms)],
        samplers,
        // quality: low and medium shrink every pass input
        (o.ratio ?? 1) * QUALITY_SETTINGS[ctx.quality].postRatio,
        ctx.camera,
    );
    // MSAA on a pass input is a full extra resolve; low quality skips it
    if (o.samples && ctx.quality !== "low") {
        pp.samples = o.samples;
    }
    pp.onApply = (effect) => {
        effect.setFloat("time", ctx.time);
        effect.setFloat2("texel", pp.texelSize.x, pp.texelSize.y);
        effect.setFloat2("resolution", ctx.engine.getRenderWidth(), ctx.engine.getRenderHeight());
        for (const [n, get] of Object.entries(uniforms)) {
            const v = get();
            if (typeof v === "number") {
                effect.setFloat(n, v);
            } else if (v.length === 2) {
                effect.setFloat2(n, v[0], v[1]);
            } else if (v.length === 3) {
                effect.setFloat3(n, v[0], v[1], v[2]);
            } else {
                effect.setFloat4(n, v[0], v[1], v[2], v[3]);
            }
        }
        for (const [n, get] of Object.entries(o.samplers ?? {})) {
            const src = get();
            if ("input" in src) {
                effect.setTextureFromPostProcess(n, src.input);
            } else {
                effect.setTexture(n, src.texture);
            }
        }
    };
    return pp;
}

/**
 * Draw a lab layer again into an off-screen texture with another fragment shader. The copy
 * shares the layer's vertex shader, instance buffers and uniforms.
 * @param ctx - the lab context
 * @param layer - the layer
 * @param storyFragment - the fragment the layer was built with
 * @param fragment - the fragment to draw the copy with
 * @param o - texture ratio, half-float texels and additive (signed sum) blending
 * @returns the render target, rendered every frame before the scene
 */
export function offscreen(
    ctx: LabContext,
    layer: LabLayer,
    storyFragment: string,
    fragment: string,
    o: { ratio?: number; float?: boolean; add?: boolean } = {},
): RenderTargetTexture {
    const rtt = new RenderTargetTexture(
        `spectacleRtt${++count}`,
        { ratio: (o.ratio ?? 1) * QUALITY_SETTINGS[ctx.quality].postRatio },
        ctx.scene,
        false,
        true,
        o.float ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    rtt.clearColor = new Color4(0, 0, 0, 0);
    rtt.activeCamera = ctx.camera;
    rtt.renderList = [layer.mesh];
    const src = layer.material.shaderPath as { vertexSource: string; fragmentSource: string };
    const head = src.fragmentSource.slice(0, src.fragmentSource.length - storyFragment.length);
    const copy = new ShaderMaterial(
        `${layer.material.name}_copy${count}`,
        ctx.scene,
        { vertexSource: src.vertexSource, fragmentSource: head + fragment },
        layer.material.options,
    );
    copy.backFaceCulling = false;
    if (o.add) {
        copy.alphaMode = Constants.ALPHA_ONEONE_ONEONE;
        copy.disableDepthWrite = true;
        copy.needAlphaBlending = (): boolean => true;
    }
    // share the uniform stores, so the copy sees every value the harness sets on the original
    const a = layer.material as unknown as Record<string, unknown>;
    const b = copy as unknown as Record<string, unknown>;
    for (const k of ["_floats", "_vectors2", "_vectors3", "_vectors4", "_matrices"]) {
        b[k] = a[k];
    }
    rtt.setMaterialForRendering(layer.mesh, copy);
    ctx.scene.customRenderTargets.push(rtt);
    return rtt;
}

/**
 * Project a world point to the canvas.
 * @param ctx - the lab context
 * @param x - world x
 * @param y - world y
 * @param z - world z
 * @returns [x, y] in device pixels (bottom-left origin), device pixels per world unit at that
 *   depth, and 1 when in front of the camera (0 behind)
 */
export function toScreen(ctx: LabContext, x: number, y: number, z: number): [number, number, number, number] {
    const { m } = ctx.scene.getTransformMatrix();
    const w = ctx.engine.getRenderWidth();
    const h = ctx.engine.getRenderHeight();
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 1e-4) {
        return [0, 0, 0, 0];
    }
    const sx = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / cw + 1) * 0.5 * w;
    const sy = ((m[1] * x + m[5] * y + m[9] * z + m[13]) / cw + 1) * 0.5 * h;
    const p11 = ctx.camera.getProjectionMatrix().m[5];
    return [sx, sy, (p11 * h * 0.5) / cw, 1];
}

/** "#rrggbb" to [r, g, b] in 0..1. */
export function rgb(hex: string): number[] {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
}

/** Node indices sorted by PageRank, highest first. */
export function byRank(ctx: LabContext): number[] {
    const { graph } = ctx;
    return Array.from({ length: graph.n }, (_, i) => i).sort((p, q) => graph.rank[q] - graph.rank[p]);
}

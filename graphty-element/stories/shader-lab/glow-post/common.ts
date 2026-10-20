/**
 * Helpers for the glow and post-processing stories: custom full-screen passes that can read
 * other passes and render targets, a mip-chain bloom, and "the same meshes drawn again into an
 * off-screen texture with another fragment shader" (masks and depth).
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

/** Where a pass sampler reads from. */
export type SamplerSource =
    | { input: PostProcess } // what that pass received (for the first pass: the scene)
    | { output: PostProcess } // what that pass wrote
    | { texture: BaseTexture };

export interface PassOptions {
    fragment: string;
    /** Size of this pass's INPUT texture relative to the canvas (Babylon's post "ratio"). */
    ratio?: number;
    /** Story uniforms, read every frame. Numbers become floats, arrays vec2-vec4. */
    uniforms?: Record<string, () => number | number[]>;
    samplers?: Record<string, () => SamplerSource>;
    /** MSAA samples on the input texture (use 4 on the first pass so the scene stays smooth). */
    samples?: number;
}

let passCount = 0;

/**
 * A full-screen pass with extra samplers. Every pass also gets `time`, `texel` (one input texel
 * in uv), `resolution` (canvas device pixels) and `pixelRatio`.
 * @param ctx - the lab context
 * @param o - the shader, ratio, uniforms and samplers
 * @returns the post-process, attached to the lab camera after every earlier pass
 */
export function addPass(ctx: LabContext, o: PassOptions): PostProcess {
    const name = `glowPost${++passCount}`;
    const uniforms = o.uniforms ?? {};
    const declared = Object.entries(uniforms).map(([n, get]) => {
        const v = get();
        return `uniform ${Array.isArray(v) && v.length > 1 ? `vec${v.length}` : "float"} ${n};`;
    });
    const samplerNames = Object.keys(o.samplers ?? {});
    Effect.ShadersStore[`${name}FragmentShader`] = `precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
${samplerNames.map((s) => `uniform sampler2D ${s};`).join("\n")}
uniform float time;
uniform vec2 texel;
uniform vec2 resolution;
uniform float pixelRatio;
${declared.join("\n")}
${ctx.defines}${GLSL_LIBRARY}
${AA}
${o.fragment}`;
    const pp = new PostProcess(
        name,
        name,
        ["time", "texel", "resolution", "pixelRatio", ...Object.keys(uniforms)],
        samplerNames,
        // quality: low and medium shrink every pass input
        (o.ratio ?? 1) * QUALITY_SETTINGS[ctx.quality].postRatio,
        ctx.camera,
    );
    // MSAA on a pass input is a full extra resolve; low quality skips it
    if (o.samples && ctx.quality !== "low") {
        pp.samples = o.samples;
    }
    pp.onApply = (effect) => {
        const w = ctx.engine.getRenderWidth();
        effect.setFloat("time", ctx.time);
        effect.setFloat2("texel", pp.texelSize.x, pp.texelSize.y);
        effect.setFloat2("resolution", w, ctx.engine.getRenderHeight());
        effect.setFloat("pixelRatio", w / Math.max(1, ctx.canvas.clientWidth));
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
            } else if ("output" in src) {
                effect.setTextureFromPostProcessOutput(n, src.output);
            } else {
                effect.setTexture(n, src.texture);
            }
        }
    };
    return pp;
}

/** "#rrggbb" to [r, g, b] in 0..1. */
export function rgb(hex: string): number[] {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
}

export interface BloomSettings {
    /** Luminance where glow starts (ignored when a mask texture feeds the bloom). */
    threshold: number;
    intensity: number;
    /** How far the glow spreads, 0..1.5. */
    radius: number;
    tint?: number[];
}

/**
 * A mip-chain bloom (the "Call of Duty" downsample / tent-upsample chain): bright parts of the
 * scene, or of `mask` when given, are shrunk four times and grown back, each level adding its
 * own blur, then added onto the scene. Five levels give a glow both tight and wide.
 * @param ctx - the lab context
 * @param get - the live settings
 * @param mask - an emissive texture to bloom instead of the scene's bright parts
 * @returns the first pass (its input is the scene) and the composite pass
 */
export function addBloom(
    ctx: LabContext,
    get: () => BloomSettings,
    mask?: () => BaseTexture,
): { first: PostProcess; composite: PostProcess } {
    const extract = addPass(ctx, {
        ratio: 1,
        samples: 4,
        uniforms: { threshold: () => get().threshold, useMask: () => (mask ? 1 : 0) },
        samplers: mask ? { maskSampler: () => ({ texture: mask() }) } : undefined,
        fragment: `
vec3 src(vec2 uv) {
    ${mask ? "return texture2D(maskSampler, uv).rgb;" : "vec3 c = texture2D(textureSampler, uv).rgb; float l = luminance(c); float k = smoothstep(threshold, threshold + 0.25, l); return c * k;"}
}
void main() {
    vec4 d = texel.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);
    gl_FragColor = vec4((src(vUV + d.xy) + src(vUV + d.zy) + src(vUV + d.xw) + src(vUV + d.zw)) * 0.25, 1.0);
}`,
    });
    const DOWN = `
void main() {
    vec4 d = texel.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);
    vec3 c = texture2D(textureSampler, vUV + d.xy).rgb + texture2D(textureSampler, vUV + d.zy).rgb
           + texture2D(textureSampler, vUV + d.xw).rgb + texture2D(textureSampler, vUV + d.zw).rgb;
    gl_FragColor = vec4(c * 0.25, 1.0);
}`;
    const downs = [0.5, 0.25, 0.125].map((ratio) => addPass(ctx, { ratio, fragment: DOWN }));
    // up passes: input is the smaller level; add the same-size level from the way down
    const skips = [downs[2], downs[1], downs[0]];
    [0.0625, 0.125, 0.25].map((ratio, k) =>
        addPass(ctx, {
            ratio,
            uniforms: { spread: () => get().radius },
            samplers: { skipSampler: () => ({ input: skips[k] }) },
            fragment: `
void main() {
    vec4 d = texel.xyxy * vec4(1.0, 1.0, -1.0, 0.0) * (0.5 + spread);
    vec3 c = texture2D(textureSampler, vUV).rgb * 4.0;
    c += (texture2D(textureSampler, vUV - d.xy).rgb + texture2D(textureSampler, vUV - d.wy).rgb * 2.0
        + texture2D(textureSampler, vUV - d.zy).rgb + texture2D(textureSampler, vUV + d.zw).rgb * 2.0
        + texture2D(textureSampler, vUV + d.xw).rgb * 2.0 + texture2D(textureSampler, vUV + d.zy).rgb
        + texture2D(textureSampler, vUV + d.wy).rgb * 2.0 + texture2D(textureSampler, vUV + d.xy).rgb);
    c /= 16.0;
    gl_FragColor = vec4(texture2D(skipSampler, vUV).rgb + c * (0.6 + spread * 0.6), 1.0);
}`,
        }),
    );
    const composite = addPass(ctx, {
        ratio: 0.5,
        uniforms: { intensity: () => get().intensity, tint: () => get().tint ?? [1, 1, 1] },
        samplers: { sceneSampler: () => ({ input: extract }) },
        fragment: `
void main() {
    vec3 base = texture2D(sceneSampler, vUV).rgb;
    vec3 glow = texture2D(textureSampler, vUV).rgb * tint * intensity * 0.35;
    // a strong glow drifts toward white, as an overexposed light does
    vec3 c = base + glow + vec3(luminance(glow)) * 0.25;
    gl_FragColor = vec4(c, 1.0);
}`,
    });
    return { first: extract, composite };
}

/**
 * Draw a lab layer again, into an off-screen texture, with another fragment shader. The copy
 * shares the layer's vertex shader, instance buffers and every uniform the harness sets.
 * @param ctx - the lab context
 * @param layers - [layer, the story's fragment it was built with, the new fragment]
 * @param opts - texture ratio, float texture, clear color
 * @returns the render target (rendered every frame before the scene)
 */
export function offscreen(
    ctx: LabContext,
    layers: [LabLayer, string, string][],
    opts: { ratio?: number; float?: boolean; clear?: number[] } = {},
): RenderTargetTexture {
    const rtt = new RenderTargetTexture(
        `glowRtt${++passCount}`,
        { ratio: (opts.ratio ?? 1) * QUALITY_SETTINGS[ctx.quality].postRatio },
        ctx.scene,
        false,
        true,
        opts.float ? Constants.TEXTURETYPE_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    if (opts.float) {
        // float targets hold data (depth), not color: filtering would blend a near and a far
        // depth into a phantom surface in between, which outline passes draw as scribbles
        rtt.updateSamplingMode(Constants.TEXTURE_NEAREST_SAMPLINGMODE);
    }
    const [r, g, b, a] = opts.clear ?? [0, 0, 0, 1];
    rtt.clearColor = new Color4(r, g, b, a);
    rtt.activeCamera = ctx.camera;
    rtt.renderList = layers.map(([l]) => l.mesh);
    rtt.setRenderingAutoClearDepthStencil(1, false);
    for (const [layer, storyFragment, fragment] of layers) {
        const src = layer.material.shaderPath as { vertexSource: string; fragmentSource: string };
        const head = src.fragmentSource.slice(0, src.fragmentSource.length - storyFragment.length);
        const copy = new ShaderMaterial(
            `${layer.material.name}_copy${passCount}`,
            ctx.scene,
            { vertexSource: src.vertexSource, fragmentSource: head + fragment },
            layer.material.options,
        );
        copy.backFaceCulling = false;
        shareUniforms(layer.material, copy);
        rtt.setMaterialForRendering(layer.mesh, copy);
    }
    ctx.scene.customRenderTargets.push(rtt);
    return rtt;
}

/** Make `to` read every uniform value `from` holds, now and later (they share the stores). */
function shareUniforms(from: ShaderMaterial, to: ShaderMaterial): void {
    const a = from as unknown as Record<string, unknown>;
    const b = to as unknown as Record<string, unknown>;
    for (const k of ["_floats", "_vectors2", "_vectors3", "_vectors4", "_matrices"]) {
        b[k] = a[k];
    }
}

/** A mutable copy of a story's latest args, so passes built once read live values. */
export function liveArgs<T extends object>(initial: T): { current: T; update(next: T): T } {
    const box = {
        current: { ...initial },
        update(next: T): T {
            Object.assign(box.current, next);
            return next;
        },
    };
    return box;
}

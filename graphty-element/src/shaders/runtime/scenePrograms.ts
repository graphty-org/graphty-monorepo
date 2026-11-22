/**
 * @file The program of the scene-level background shader (design/rendering/shader-styles.md
 * sections 4.2 and 5), drawn into its own render target and shown behind the graph.
 *
 * Built from the same pieces as the sample program (`wrap.ts`): the prelude, the library, the
 * renamed body and the NaN guard. Each parameter is one plain uniform, since a background is
 * drawn once.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../catalog/shaders";
import {
    clockAssignments,
    fragmentPrelude,
    mainPrelude,
    paramDeclarations,
    prefixBody,
    SCENE_BLOCK,
    WRAPPER_LINE,
} from "./wrap";

/** A program the element compiles into a ShaderMaterial. */
export interface SceneProgram {
    readonly vertex: string;
    readonly fragment: string;
    readonly attributes: readonly string[];
    readonly uniforms: readonly string[];
    readonly uniformBuffers: readonly string[];
    readonly samplers: readonly string[];
}

/** A full-screen square's vertex stage, `vUV` 0..1: the square of Babylon's `EffectRenderer`. */
const SCREEN_VERTEX = `precision highp float;
attribute vec2 position;
varying vec2 vUV;
void main() {
    vUV = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * The background program: one full-screen square drawn into the background's render target.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body.
 * @returns The program.
 */
export function backgroundProgram(descriptor: Pick<ShaderDescriptor, "params">, body: string): SceneProgram {
    const { params } = descriptor;
    const fragment = `${fragmentPrelude()}
uniform mat4 graphty_invViewProj;
uniform vec3 graphty_eye;
uniform vec2 graphty_resolution;
uniform float graphty_freeze;
uniform vec4 graphty_fallback;
uniform sampler2D graphty_image;
uniform float graphty_hasImage;
uniform float graphty_imageFlat;
uniform vec4 graphty_imageFit;
${[...TINT_UNIFORMS, ...TINT_COLOR_UNIFORMS].map((name) => `uniform vec4 ${name};`).join("\n")}
varying vec2 vUV;
${paramDeclarations(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
void main() {
${mainPrelude(params)}
// A background has no clocks: a clock-bound parameter reads as at rest.
${clockAssignments(params, new Set<string>())}
    graphty_BackgroundInput graphty_in;
    vec2 graphty_ndc = vUV * 2.0 - 1.0;
    // From the camera to the far plane through the pixel: it varies across the canvas for an
    // orthographic (2D) camera too, whose rays are parallel.
    vec4 graphty_b = graphty_invViewProj * vec4(graphty_ndc, 1.0, 1.0);
    graphty_in.uv = vUV;
    graphty_in.viewDir = normalize(graphty_b.xyz / graphty_b.w - graphty_eye);
    graphty_in.resolution = graphty_resolution;
    graphty_in.time = graphty_freeze >= 0.0 ? graphty_freeze : graphty_scene_time.x;
    vec4 graphty_out = graphty_u_shade(graphty_in);
    if (graphty_bad(graphty_out)) {
        graphty_out = graphty_fallback;
    }

    // Over the image, which is over the clear color: where the shader's alpha is low, what is
    // beneath it shows. The image is sampled by view direction as the photo dome maps it, or, flat,
    // by place on the canvas, cropped as the flat backdrop crops it.
    vec4 graphty_top = clamp(graphty_out, 0.0, 1.0);
    vec4 graphty_under = vec4(0.0);
    if (graphty_hasImage > 0.5 && graphty_imageFlat > 0.5) {
        graphty_under = texture2D(graphty_image, vUV * graphty_imageFit.xy + graphty_imageFit.zw);
    } else if (graphty_hasImage > 0.5) {
        vec3 graphty_d = graphty_in.viewDir;
        vec2 graphty_st = vec2(atan(graphty_d.z, graphty_d.x) / 6.28318531 + 0.5, acos(clamp(graphty_d.y, -1.0, 1.0)) / 3.14159265);
        graphty_under = texture2D(graphty_image, vec2(1.0 - graphty_st.x, graphty_st.y));
    }

    float graphty_a = graphty_top.a + graphty_under.a * (1.0 - graphty_top.a);
    vec3 graphty_rgb = graphty_top.rgb * graphty_top.a + graphty_under.rgb * graphty_under.a * (1.0 - graphty_top.a);
    gl_FragColor = vec4(graphty_a > 0.0 ? graphty_rgb / graphty_a : vec3(0.0), graphty_a);
}
`;

    return {
        vertex: SCREEN_VERTEX,
        fragment,
        attributes: ["position"],
        uniforms: [
            "graphty_invViewProj",
            "graphty_eye",
            "graphty_resolution",
            "graphty_freeze",
            "graphty_fallback",
            "graphty_hasImage",
            "graphty_imageFlat",
            "graphty_imageFit",
            ...TINT_UNIFORMS,
            ...TINT_COLOR_UNIFORMS,
            ...params.map((param) => `graphty_p_${param.name}`),
        ],
        uniformBuffers: [SCENE_BLOCK],
        samplers: ["graphty_image"],
    };
}

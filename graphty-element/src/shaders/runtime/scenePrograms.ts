/**
 * @file The programs of the scene-level shaders (design/rendering/shader-styles.md sections 4.2
 * and 5): the background, drawn into its own render target; the splat that sums each group outline
 * member's kernel into a field target; and the group outline, drawn into the outline target from that
 * field (form `"field"`) or as one sphere per group (form `"sphere"`). Both targets are shown
 * behind the graph.
 *
 * Built from the same pieces as the sample program (`wrap.ts`): the prelude, the library, the
 * renamed body and the NaN guard. Each parameter is one plain uniform, since a background is
 * drawn once and a group outline once per use.
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

/** How many field targets a graph holds at most: four groups to a target, 32 groups. */
export const FIELD_TARGETS = 8;

/** The samplers of the field targets, one per target. */
export const FIELD_SAMPLERS = Array.from({ length: FIELD_TARGETS }, (_, i) => `graphty_field${String(i)}`);

/** The group outline program's uniforms beside the parameters and the scene block. */
export const OUTLINE_UNIFORMS = [
    // the outline target's size in pixels, and canvas pixels per target pixel
    "graphty_resolution",
    // 1 / field width, 1 / field height, canvas pixels per field texel, the field's value scale
    "graphty_fieldTexel",
    // sphere: its center on the target in pixels, its radius in pixels, 1; field: 0
    "graphty_sphere",
    // the mean resolved color of the group's members
    "graphty_groupColor",
    // the group's index in its layer, the nesting depth, its field slot (target x 4 + channel)
    "graphty_groupInfo",
    "graphty_freeze",
] as const;

/** How many group outlines tint a background: the largest ones on screen. */
export const BACKGROUND_TINTS = 4;

/** Each tinting group's place (x, y on the canvas, -1..1; its radius in canvas heights; its weight). */
export const TINT_UNIFORMS = Array.from({ length: BACKGROUND_TINTS }, (_, i) => `graphty_tint${String(i)}`);

/** Each tinting group's color. */
export const TINT_COLOR_UNIFORMS = Array.from({ length: BACKGROUND_TINTS }, (_, i) => `graphty_tintColor${String(i)}`);

/** The splat program's instanced attributes. */
export const SPLAT_ATTRIBUTES = [
    // one end of the kernel's segment in graph-root space, and its kernel radius
    "graphtySplat",
    // the segment's other end: the same point for a member, another member for a connector
    "graphtyEnd",
    // which channel of the target it adds to: one component 1, the rest 0
    "graphtyMask",
] as const;

/** A full-screen square's vertex stage, `vUV` 0..1: the square of Babylon's `EffectRenderer`. */
export const SCREEN_VERTEX = `precision highp float;
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
${[...TINT_UNIFORMS, ...TINT_COLOR_UNIFORMS].map((name) => `uniform vec4 ${name};`).join("\n")}
varying vec2 vUV;
${paramDeclarations(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
void main() {
${mainPrelude(params)}
// A background or a group outline has no clocks: a clock-bound parameter reads as at rest.
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
    // The largest group outlines' colors, each a soft disc around its group on the canvas.
    vec3 graphty_tint = vec3(0.0);
    float graphty_tintWeight = 0.0;
    vec2 graphty_aspect = vec2(graphty_resolution.x / max(graphty_resolution.y, 1.0), 1.0);
${TINT_UNIFORMS.map(
    (name, i) => `    {
        vec2 d = (graphty_ndc - ${name}.xy) * graphty_aspect;
        float w = ${name}.w * exp(-dot(d, d) / max(${name}.z * ${name}.z, 1e-4));
        graphty_tint += ${TINT_COLOR_UNIFORMS[i]}.rgb * w;
        graphty_tintWeight += w;
    }`,
).join("\n")}
    graphty_in.groupTint = graphty_tintWeight > 0.0
        ? vec4(graphty_tint / graphty_tintWeight, clamp(graphty_tintWeight, 0.0, 1.0))
        : vec4(0.0);
    vec4 graphty_out = graphty_u_shade(graphty_in);
    if (graphty_bad(graphty_out)) {
        graphty_out = graphty_fallback;
    }

    // Over the image, which is over the clear color: where the shader's alpha is low, what is
    // beneath it shows. The image is sampled by view direction as the photo dome maps it.
    vec4 graphty_top = clamp(graphty_out, 0.0, 1.0);
    vec4 graphty_under = vec4(0.0);
    if (graphty_hasImage > 0.5) {
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
            ...TINT_UNIFORMS,
            ...TINT_COLOR_UNIFORMS,
            ...params.map((param) => `graphty_p_${param.name}`),
        ],
        uniformBuffers: [SCENE_BLOCK],
        samplers: ["graphty_image"],
    };
}

/**
 * The splat: a kernel `(1 - d^2)^2` around a segment on a camera-facing quad, added into one
 * channel of a field target. A member's segment is one point, so its kernel is a disc; a
 * connector's runs between two members, a capsule with the same falloff and a peak of 1 all along.
 * @returns The program.
 */
export function splatProgram(): SceneProgram {
    const vertex = `precision highp float;
attribute vec3 position;
${SPLAT_ATTRIBUTES.map((name) => `attribute vec4 ${name};`).join("\n")}
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
varying vec2 vUV;
varying float vAlong;
varying vec4 vMask;
void main() {
    float radius = graphtySplat.w * length(world[0].xyz);
    vec4 a = view * world * vec4(graphtySplat.xyz, 1.0);
    vec4 b = view * world * vec4(graphtyEnd.xyz, 1.0);
    vec2 d = b.xy - a.xy;
    float len = length(d);
    vec2 u = len > 1e-6 ? d / len : vec2(1.0, 0.0);
    // Half the segment's length, in kernel radii; the quad reaches one radius past each end.
    vAlong = 0.5 * len / max(radius, 1e-6);
    vUV = vec2(position.x * (vAlong + 1.0), position.y);
    vec4 mid = 0.5 * (a + b);
    gl_Position = projection * vec4(mid.xy + (u * vUV.x + vec2(-u.y, u.x) * vUV.y) * radius, mid.z, 1.0);
    vMask = graphtyMask;
}
`;
    const fragment = `precision highp float;
uniform float graphty_scale;
varying vec2 vUV;
varying float vAlong;
varying vec4 vMask;
void main() {
    float past = max(abs(vUV.x) - vAlong, 0.0);
    float r2 = past * past + vUV.y * vUV.y;
    if (r2 > 1.0) {
        discard;
    }

    float f = (1.0 - r2) * (1.0 - r2);
    gl_FragColor = vMask * f * graphty_scale;
}
`;
    return {
        vertex,
        fragment,
        attributes: ["position", ...SPLAT_ATTRIBUTES],
        uniforms: ["world", "view", "projection", "graphty_scale"],
        uniformBuffers: [],
        samplers: [],
    };
}

/**
 * The group outline program of one shader: drawn once per group, on the group's box of the outline
 * target, premultiplied over what the groups beneath drew.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body.
 * @returns The program.
 */
export function outlineProgram(descriptor: Pick<ShaderDescriptor, "params" | "form">, body: string): SceneProgram {
    const { params } = descriptor;
    const sphere = descriptor.form === "sphere";
    const fieldRead = sphere
        ? ""
        : `
${FIELD_SAMPLERS.map((name) => `uniform sampler2D ${name};`).join("\n")}
float graphty_fieldAt(vec2 uv) {
    float slot = floor(graphty_groupInfo.z + 0.5);
    float target = floor(slot / 4.0);
    vec4 mask = vec4(equal(vec4(slot - target * 4.0), vec4(0.0, 1.0, 2.0, 3.0)));
    vec4 v = vec4(0.0);
${FIELD_SAMPLERS.map((name, i) => `    ${i === 0 ? "" : "else "}if (target < ${String(i)}.5) { v = texture2D(${name}, uv); }`).join("\n")}
    return dot(v, mask) * graphty_fieldTexel.w;
}
`;
    const input = sphere
        ? `
    vec2 graphty_s = (gl_FragCoord.xy - graphty_sphere.xy) / graphty_sphere.z;
    float graphty_r2 = dot(graphty_s, graphty_s);
    if (graphty_r2 > 1.0) {
        discard;
    }

    graphty_in.field = 0.0;
    graphty_in.fieldGradient = vec2(0.0);
    graphty_in.normal = vec3(graphty_s, -sqrt(max(1.0 - graphty_r2, 0.0)));`
        : `
    vec2 graphty_dx = vec2(graphty_fieldTexel.x, 0.0);
    vec2 graphty_dy = vec2(0.0, graphty_fieldTexel.y);
    graphty_in.field = graphty_fieldAt(graphty_suv);
    graphty_in.fieldGradient = vec2(
        graphty_fieldAt(graphty_suv + graphty_dx) - graphty_fieldAt(graphty_suv - graphty_dx),
        graphty_fieldAt(graphty_suv + graphty_dy) - graphty_fieldAt(graphty_suv - graphty_dy)
    ) / (2.0 * graphty_fieldTexel.z);
    graphty_in.normal = vec3(0.0);`;

    const fragment = `${fragmentPrelude()}
uniform vec4 graphty_resolution;
uniform vec4 graphty_fieldTexel;
uniform vec4 graphty_sphere;
uniform vec4 graphty_groupColor;
uniform vec4 graphty_groupInfo;
uniform float graphty_freeze;
varying vec2 vUV;
${fieldRead}
${paramDeclarations(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
void main() {
${mainPrelude(params)}
// A background or a group outline has no clocks: a clock-bound parameter reads as at rest.
${clockAssignments(params, new Set<string>())}
    graphty_GroupInput graphty_in;
    vec2 graphty_suv = gl_FragCoord.xy / graphty_resolution.xy;
    graphty_in.uv = graphty_suv;
${input}
    graphty_in.viewDir = vec3(0.0, 0.0, 1.0);
    graphty_in.color = graphty_groupColor;
    graphty_in.group = graphty_groupInfo.x;
    graphty_in.depth = graphty_groupInfo.y;
    graphty_in.time = graphty_freeze >= 0.0 ? graphty_freeze : graphty_scene_time.x;
    vec4 graphty_out = graphty_u_shade(graphty_in);
    if (graphty_bad(graphty_out)) {
        graphty_out = vec4(0.0);
    }

    // Bodies return straight alpha; the outline target blends premultiplied.
    float graphty_a = clamp(graphty_out.a, 0.0, 1.0);
    gl_FragColor = vec4(clamp(graphty_out.rgb * graphty_a, 0.0, 1.0), graphty_a);
}
`;

    return {
        vertex: SCREEN_VERTEX,
        fragment,
        attributes: ["position"],
        uniforms: [...OUTLINE_UNIFORMS, ...params.map((param) => `graphty_p_${param.name}`)],
        uniformBuffers: [SCENE_BLOCK],
        samplers: sphere ? [] : [...FIELD_SAMPLERS],
    };
}

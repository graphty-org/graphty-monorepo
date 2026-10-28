/**
 * @file The programs that draw a node shader on a real graph (design/rendering/shader-styles.md
 * section 5): the camera-facing batch that draws impostor surfaces, sprites and effects, and the
 * code a material plugin injects to draw a surface on a node's own mesh.
 *
 * Built from the same pieces as the sample program (`wrap.ts`): the prelude, the library, the
 * renamed body and the NaN guard. What differs is where the inputs come from:
 *
 * - **Parameters.** A parameter declared `varies` comes from the node's instanced `vec4` (at most
 *   four, in declaration order); every other one from its row of the parameter-set data texture,
 *   one texel per parameter, so nodes with different fixed values share one program.
 * - **State.** Selected, hovered and pinned are bits of the node's second instanced `vec4`; the
 *   times they last changed, and when it entered, exited and changed, are stamps in its row of the
 *   state-time data texture, read against the scene time so a frozen material sees them move.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor, ShaderParamDescriptor } from "../../catalog/shaders";
import { PARAM_TEXTURE, STATE_NODES_PER_ROW, STATE_TEXELS, STATE_TEXTURE, varyingSlots } from "./nodeLayout";
import { TIME_PERIOD } from "./sceneUniforms";
import {
    clockAssignments,
    fragmentPrelude,
    mainPrelude,
    NODE_CLOCK_FIELDS,
    paramGlobals,
    prefixBody,
    SCENE_BLOCK,
    WRAPPER_LINE,
} from "./wrap";

/** The batch's instanced attributes, each a `vec4`. */
export const BATCH_ATTRIBUTES = [
    // xyz: the node's center in graph-root space; w: its drawn radius
    "graphtyCenter",
    // the resolved color, alpha the opacity
    "graphtyColor",
    // the varying parameters
    "graphtyParams",
    // seed, parameter-set row, state bits, state-time row
    "graphtyMeta",
    // billboard: halo (rgb packed, scale, opacity); square: entered and exited stamps; w: the
    // use's minimum size in CSS pixels (0: none)
    "graphtyDeco0",
    // billboard: ring (rgb packed, on), glow (rgb packed, strength)
    "graphtyDeco1",
] as const;

/** Floats per batch slot. */
export const BATCH_FLOATS = BATCH_ATTRIBUTES.length * 4;

/** The batch's plain uniforms beside the scene block. */
export const BATCH_UNIFORMS = [
    "world",
    "view",
    "projection",
    "graphty_resolution",
    "graphty_reach",
    "graphty_effectCap",
    "graphty_freeze",
    "graphty_pixelRatio",
] as const;

/** The mesh path's two instanced attributes: the varying parameters, then the meta of the batch. */
export const MESH_ATTRIBUTES = ["graphtyShaderA", "graphtyShaderB"] as const;

/** The radii the outline ring is drawn between, as multiples of the node's (NodeEffects). */
export const RING_INNER = 1;
export const RING_OUTER = 1.35;

/** How far a glow reaches, as a multiple of the radius. */
export const GLOW_REACH = 1.8;

/**
 * The locals `graphty_p_<name>` that {@link mainPrelude} clamps into the body's globals.
 * @param params - The parameters.
 * @param varying - The varying `vec4` expression.
 * @param row - The parameter-set row expression, an int.
 * @returns The GLSL statements.
 */
export function paramLocals(params: readonly ShaderParamDescriptor[], varying: string, row: string): string {
    const slots = varyingSlots(params);
    return params
        .map((param, column) => {
            const slot = slots.get(param.name);
            const texel = `texelFetch(${PARAM_TEXTURE}, ivec2(${String(column)}, ${row}), 0)`;
            if (param.type === "color") {
                return `    vec3 graphty_p_${param.name} = ${texel}.rgb;`;
            }

            const value = slot === undefined ? `${texel}.r` : `${varying}[${String(slot)}]`;
            return `    float graphty_p_${param.name} = ${value};`;
        })
        .join("\n");
}

/** The functions every node program shares: unpacking, state times, the state bits. */
const NODE_FUNCTIONS = `
uniform highp sampler2D ${PARAM_TEXTURE};
uniform highp sampler2D ${STATE_TEXTURE};
vec3 graphty_unpackRgb(float packed) {
    float v = floor(packed + 0.5);
    return vec3(floor(v / 65536.0), mod(floor(v / 256.0), 256.0), mod(v, 256.0)) / 255.0;
}
float graphty_since(float stamp, float none) {
    return stamp < 0.0 ? none : mod(graphty_scene_time.x - stamp + ${TIME_PERIOD.toFixed(1)}, ${TIME_PERIOD.toFixed(1)});
}
float graphty_bit(float bits, float bit) {
    return mod(floor(bits / bit), 2.0);
}
`;

/**
 * The statements that fill a `NodeInput` named `graphty_in` from the node's meta and state row.
 * @param meta - The meta `vec4` expression (seed, row, bits, state row).
 * @param timesFromSlot - An expression of a `vec2` (entered, exited) stamps to use instead of the
 *     state row's, for effects, which enter and exit per effect; null to read the row.
 * @param time - The expression of the time the shader sees.
 * @returns The GLSL.
 */
function stateInput(meta: string, timesFromSlot: string | null, time = "graphty_scene_time.x"): string {
    const nodesPerRow = STATE_NODES_PER_ROW.toFixed(1);
    return `
    float graphty_srow = ${meta}.w;
    ivec2 graphty_sat = ivec2(int(mod(graphty_srow, ${nodesPerRow})) * ${String(STATE_TEXELS)}, int(floor(graphty_srow / ${nodesPerRow})));
    vec4 graphty_s0 = texelFetch(${STATE_TEXTURE}, graphty_sat, 0);
    vec4 graphty_s1 = texelFetch(${STATE_TEXTURE}, graphty_sat + ivec2(1, 0), 0);
    vec2 graphty_times = ${timesFromSlot ?? "vec2(graphty_s0.w, graphty_s1.x)"};
    graphty_in.seed = ${meta}.x;
    graphty_in.selected = graphty_bit(${meta}.z, 1.0);
    graphty_in.hovered = graphty_bit(${meta}.z, 2.0);
    graphty_in.pinned = graphty_bit(${meta}.z, 4.0);
    graphty_in.sinceSelected = graphty_since(graphty_s0.x, -1.0);
    graphty_in.sinceHovered = graphty_since(graphty_s0.y, -1.0);
    graphty_in.sincePinned = graphty_since(graphty_s0.z, -1.0);
    graphty_in.sinceEntered = graphty_since(graphty_times.x, 10000.0);
    graphty_in.sinceExited = graphty_since(graphty_times.y, -1.0);
    graphty_in.sinceChanged = graphty_since(graphty_s1.y, -1.0);
    graphty_in.time = ${time};`;
}

/** A program the element builds for a batch: its two stages and what it declares. */
export interface BatchProgram {
    readonly vertex: string;
    readonly fragment: string;
    readonly attributes: readonly string[];
    readonly uniforms: readonly string[];
    readonly uniformBuffers: readonly string[];
    readonly samplers: readonly string[];
}

/**
 * Which batch a program draws for: a `paint` impostor on a round node, or a square at `replace`,
 * `over`, `around` or `behind`.
 */
export type BatchRole = "impostor" | "replace" | "over" | "around" | "behind";

/**
 * Whether a role draws a stacking square (`over`, `around`, `behind`) rather than the node's own
 * look.
 * @param role - The role.
 * @returns True for the three stacking places.
 */
function stacks(role: BatchRole): boolean {
    return role === "over" || role === "around" || role === "behind";
}

/**
 * The vertex stage of a batch: one camera-facing square per slot, in view space at the node's
 * center, big enough for the shader's reach or the billboard's halo, ring and glow.
 *
 * `minSize` (the slot's `graphtyDeco0.w`, CSS pixels) applies at `replace`, `around` and `behind`:
 * the square is drawn at least that wide, by drawing the look as if the node's radius were larger
 * (`n.uv` keeps the outline it draws at 1); `vInner` is the node's own outline in those units.
 * @param role - The batch.
 * @returns The GLSL.
 */
function batchVertex(role: BatchRole): string {
    const square = stacks(role);
    // The billboard's square holds its halo, ring and glow; the square in place of the node also
    // its reach.
    const decorated = (least: string): string =>
        `max(max(${least}, graphtyDeco0.y), max(graphtyDeco1.y > 0.5 ? ${RING_OUTER.toFixed(2)} : 1.0, graphtyDeco1.w > 0.0 ? ${GLOW_REACH.toFixed(2)} : 1.0))`;
    let extent = "graphty_reach";
    if (role === "impostor") {
        extent = decorated("1.0");
    } else if (role === "replace") {
        extent = decorated("graphty_reach");
    }
    // A use with no minimum size is not drawn on a node under 3 px on screen. A square is no wider
    // than the quality level's cap (section 5) round a node of up to a third of it; round a bigger
    // node only the band beyond the radius is held to the cap's share. Past it the square shrinks
    // and the fragment stage squeezes the look into it (vFit), so its own falloff still reaches
    // zero at the square's edge.
    const tooSmall = square ? "(graphtyDeco0.w <= 0.0 && graphty_pixel < 3.0) ||" : "";
    const sized = role === "replace" || role === "around" || role === "behind";
    const grow = sized
        ? `max(1.0, 0.5 * graphtyDeco0.w * graphty_pixelRatio / max(graphty_pixel * ${extent}, 1e-6))`
        : "1.0";
    const fit = square
        ? "min(1.0, (1.0 + 0.5 * graphty_effectCap / max(radius * abs(projection[1][1]) * 0.5 * graphty_resolution.y / max(abs(clipCenter.w), 1e-6), 1e-6) * (graphty_reach - 1.0) / graphty_reach) / graphty_reach)"
        : "1.0";
    // A square over or around the node sits at the node's front, one radius toward the camera, so
    // the edges that meet the node (they end at its surface) never hide it while a nearer node
    // still does; one behind sits at its back, so the node covers its middle. In perspective it is
    // scaled back to the place and size it has at the node's center.
    const depth = role === "behind" ? "center.z + graphty_real" : "center.z - graphty_real";
    const place = square
        ? `float graphty_k = projection[3][3] > 0.5 ? 1.0 : max(${depth}, 1e-3) / max(center.z, 1e-3);
    vec4 at = vec4((center.xy + corner * radius) * graphty_k, ${depth}, 1.0);
    vFit = vec2(${extent} * graphty_fit, ${extent});`
        : "vec4 at = center + vec4(corner * radius, 0.0, 0.0);";
    return `precision highp float;
attribute vec3 position;
${BATCH_ATTRIBUTES.map((name) => `attribute vec4 ${name};`).join("\n")}
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform vec2 graphty_resolution;
uniform float graphty_reach;
uniform float graphty_effectCap;
uniform float graphty_pixelRatio;
varying vec2 vUV;
varying vec3 vViewPos;
varying vec4 vColor;
varying vec4 vParams;
varying vec4 vMeta;
varying vec4 vDeco0;
varying vec4 vDeco1;
varying float vRadius;
varying float vPixelSize;
varying float vInner;
${square ? "varying vec2 vFit;" : ""}
void main() {
    float graphty_real = graphtyCenter.w * length(world[0].xyz);
    vec4 center = view * world * vec4(graphtyCenter.xyz, 1.0);
    vec4 clipCenter = projection * center;
    float graphty_pixel = graphty_real * abs(projection[1][1]) * 0.5 * graphty_resolution.y / max(abs(clipCenter.w), 1e-6);
    float graphty_grow = ${grow};
    float radius = graphty_real * graphty_grow;
    float graphty_fit = ${fit};
    vec2 corner = position.xy * ${extent} * graphty_fit;
    ${place}
    gl_Position = projection * at;
    vPixelSize = graphty_pixel * graphty_grow;
    vInner = 1.0 / graphty_grow;
    if (${tooSmall} graphty_real <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }

    vUV = corner;
    vViewPos = at.xyz;
    vColor = graphtyColor;
    vParams = graphtyParams;
    vMeta = graphtyMeta;
    vDeco0 = graphtyDeco0;
    vDeco1 = graphtyDeco1;
    vRadius = radius;
}
`;
}

/**
 * The billboard's halo, outline ring and glow at a distance from the center (in radii), drawn from
 * the radius rather than from a mesh, so they ring the sphere or the sprite and not its square.
 */
const BILLBOARD_DECORATION = `
vec4 graphty_decoration(float d) {
    vec4 deco = vec4(0.0);
    if (vDeco1.w > 0.0 && d > 1.0 && d < ${GLOW_REACH.toFixed(2)}) {
        float g = 1.0 - (d - 1.0) / ${(GLOW_REACH - 1).toFixed(2)};
        deco = vec4(graphty_unpackRgb(vDeco1.z), clamp(g * g * 0.6 * vDeco1.w, 0.0, 1.0));
    }
    if (vDeco0.y > 1.0 && d > 1.0 && d < vDeco0.y) {
        deco = vec4(graphty_unpackRgb(vDeco0.x), vDeco0.z);
    }
    if (vDeco1.y > 0.5 && d > ${RING_INNER.toFixed(2)} && d < ${RING_OUTER.toFixed(2)}) {
        deco = vec4(graphty_unpackRgb(vDeco1.x), 1.0);
    }
    return deco;
}
`;

/**
 * The window depth of the point on the impostor's sphere at view-space depth `z` on this
 * fragment's ray: the square's own depth moved by the difference in normalized depth, which holds
 * for either depth range (-1..1 on WebGL, 0..1 on WebGPU, which Babylon marks
 * IS_NDC_HALF_ZRANGE).
 */
const IMPOSTOR_DEPTH = `
uniform mat4 projection;
float graphty_sphereDepth(float z) {
    vec4 graphty_square = projection * vec4(vViewPos, 1.0);
    // Along the ray through this fragment: from the eye in perspective, straight on in orthographic.
    vec3 graphty_at = projection[3][3] > 0.5 ? vec3(vViewPos.xy, z) : vViewPos * (z / vViewPos.z);
    vec4 graphty_hit = projection * vec4(graphty_at, 1.0);
#ifdef IS_NDC_HALF_ZRANGE
    float graphty_scale = 1.0;
#else
    float graphty_scale = 0.5;
#endif
    float graphty_moved = graphty_hit.z / graphty_hit.w - graphty_square.z / graphty_square.w;
    return clamp(gl_FragCoord.z + graphty_scale * graphty_moved, 0.0, 1.0);
}
`;

/**
 * A card's normal (the square drawn in place of the node): facing the camera, but tilted by the
 * node's offset from the view center, by a small tilt of its own from its seed, and domed slightly
 * across it (design/rendering/shader-studio/decisions.md 5.1). So `dot(n.normal, lightDir)` and the
 * reflected view direction change from card to card and across each card, as the camera or the
 * layout moves, with no time involved.
 */
const CARD_TILT = `
    vec2 graphty_off = (vViewPos.xy - vUV * vRadius) / max(abs(vViewPos.z), 1e-3);
    vec2 graphty_own = vec2(fract(graphty_in.seed * 12.9898), fract(graphty_in.seed * 78.233)) - 0.5;
    graphty_in.normal = normalize(vec3(graphty_off * 0.6 + graphty_own * 0.35 + vUV * 0.25, -1.0));
    graphty_in.local = transpose(mat3(view)) * graphty_in.normal;`;

/**
 * The fragment statements that fill the input's `uv` and `normal` for a role, and leave
 * `graphty_deco` (the billboard's halo, ring and glow) and, for the impostor, `graphty_z`.
 * @param role - The batch.
 * @returns The GLSL.
 */
function surfaceInput(role: BatchRole): string {
    if (stacks(role)) {
        // Squeezed to the cap (vFit: the square's half width and the look's reach, in radii), the
        // ring from the radius out is mapped onto the reach, so the look keeps its node-sized
        // middle and all of its falloff. Over draws only inside the node's outline; around only
        // outside it; behind everywhere, the node covering its middle.
        let mask = "";
        if (role === "over") {
            mask = "if (graphty_r > vInner) { discard; }";
        } else if (role === "around") {
            mask = "if (graphty_r < vInner) { discard; }";
        }

        return `
    float graphty_r = length(vUV);
    ${mask}
    vec2 graphty_uv = vUV;
    if (vFit.x < vFit.y) {
        float graphty_to = vFit.x > 1.0
            ? 1.0 + (graphty_r - 1.0) * (vFit.y - 1.0) / (vFit.x - 1.0)
            : graphty_r * vFit.y / max(vFit.x, 1e-6);
        graphty_uv *= graphty_to / max(graphty_r, 1e-6);
    }
    vec4 graphty_deco = vec4(0.0);
    graphty_in.uv = graphty_uv;
    graphty_in.normal = vec3(graphty_uv, 0.0);`;
    }

    if (role === "replace") {
        // The square in place of the node: the look out to its reach, over the halo, ring and
        // glow drawn from the node's own outline. The normal faces the camera here and is tilted
        // once the seed is known (cardTilt).
        return `
    float graphty_d = length(vUV);
    vec4 graphty_deco = graphty_decoration(graphty_d / vInner);
    graphty_in.uv = vUV;
    graphty_in.normal = vec3(0.0, 0.0, -1.0);`;
    }

    // An impostor ray-casts the sphere inside the outline and writes the depth of the point it
    // hit, so a nearer node or an edge passing in front hides it exactly where the sphere is
    // behind them (issue #3320); outside the outline only the decoration draws, at the square.
    return `
    float graphty_d = length(vUV);
    vec4 graphty_deco = graphty_decoration(graphty_d);
    if (graphty_d > 1.0) {
        if (graphty_deco.a <= 0.002) { discard; }
        gl_FragDepth = gl_FragCoord.z;
        gl_FragColor = graphty_deco;
        return;
    }
    float graphty_z = sqrt(max(1.0 - graphty_d * graphty_d, 0.0));
    gl_FragDepth = graphty_sphereDepth(vViewPos.z - vRadius * graphty_z);
    graphty_in.uv = vUV;
    graphty_in.normal = vec3(vUV, -graphty_z);`;
}

/**
 * The fragment statements after the body ran. Bodies return straight alpha in every place: a
 * stacking square premultiplies it for its premultiplied (or additive) blend; the impostor and
 * the square in place of the node blend it straight over, the decoration beneath.
 * @param role - The batch.
 * @returns The GLSL.
 */
function surfaceFinish(role: BatchRole): string {
    if (stacks(role)) {
        return `
    if (graphty_bad(graphty_out)) { graphty_out = vec4(0.0); }
    graphty_out.a = clamp(graphty_out.a, 0.0, 1.0);
    if (graphty_out.a <= 0.002) { discard; }
    gl_FragColor = vec4(graphty_out.rgb * graphty_out.a, graphty_out.a);`;
    }

    const fallback = role === "replace" ? "vec4(0.0)" : "graphty_in.color";
    // The square in place of the node draws the look out to its reach, never past it.
    const reach =
        role === "replace" ? "if (max(abs(vUV.x), abs(vUV.y)) > graphty_reach) { graphty_out = vec4(0.0); }" : "";
    return `
    ${reach}
    if (graphty_bad(graphty_out)) { graphty_out = ${fallback}; }
    graphty_out.a = clamp(graphty_out.a, 0.0, 1.0);
    float graphty_a = graphty_out.a + graphty_deco.a * (1.0 - graphty_out.a);
    if (graphty_a <= 0.002) { discard; }
    gl_FragColor = vec4((graphty_out.rgb * graphty_out.a + graphty_deco.rgb * graphty_deco.a * (1.0 - graphty_out.a)) / graphty_a, graphty_a);`;
}

/**
 * The program a batch draws one shader with.
 * @param role - A `paint` impostor (a ray-cast sphere), or a square at `replace`, `over`,
 *     `around` or `behind`.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body.
 * @returns The program.
 */
export function batchProgram(
    role: BatchRole,
    descriptor: Pick<ShaderDescriptor, "params">,
    body: string,
): BatchProgram {
    const { params } = descriptor;
    const square = stacks(role);
    const fragment = `${fragmentPrelude()}
${NODE_FUNCTIONS}
varying vec2 vUV;
varying vec3 vViewPos;
varying vec4 vColor;
varying vec4 vParams;
varying vec4 vMeta;
varying vec4 vDeco0;
varying vec4 vDeco1;
varying float vRadius;
varying float vPixelSize;
varying float vInner;
${square ? "varying vec2 vFit;" : ""}
uniform mat4 view;
${square || role === "replace" ? "" : IMPOSTOR_DEPTH}
uniform float graphty_freeze;
uniform float graphty_reach;
${square ? "" : BILLBOARD_DECORATION}
${paramGlobals(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
void main() {
${paramLocals(params, "vParams", "int(vMeta.y + 0.5)")}
${mainPrelude(params)}
    graphty_NodeInput graphty_in;
${surfaceInput(role)}
    // The point in world orientation, so a camera turning round the node sees another side of it.
    graphty_in.local = transpose(mat3(view)) * graphty_in.normal;
    graphty_in.viewDir = normalize(vViewPos);
    graphty_in.color = vColor;
    graphty_in.size = vRadius;
    graphty_in.pixelSize = vPixelSize;
${stateInput("vMeta", square ? "vDeco0.xy" : null, "graphty_freeze >= 0.0 ? graphty_freeze : graphty_scene_time.x")}
${clockAssignments(params, NODE_CLOCK_FIELDS)}
${role === "replace" ? CARD_TILT : ""}
    vec4 graphty_out = graphty_u_shade(graphty_in);
${surfaceFinish(role)}
}
`;

    return {
        vertex: batchVertex(role),
        fragment,
        attributes: ["position", ...BATCH_ATTRIBUTES],
        uniforms: [...BATCH_UNIFORMS],
        uniformBuffers: [SCENE_BLOCK],
        samplers: [PARAM_TEXTURE, STATE_TEXTURE],
    };
}

/** The code a material plugin injects into a node's StandardMaterial, by injection point. */
export interface MeshInjection {
    readonly vertexDefinitions: string;
    readonly vertexMainEnd: string;
    readonly fragmentDefinitions: string;
    readonly fragmentBeforeFragColor: string;
}

/**
 * What the mesh path injects to draw a surface on a node's own mesh.
 *
 * The vertex stage passes the node's center and the point in view space, the point in the node's
 * own space over its radius and the two instanced attributes; the fragment
 * stage fills `NodeInput` and replaces the material's output with the shader's.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body.
 * @returns The code.
 */
export function meshInjection(descriptor: Pick<ShaderDescriptor, "params">, body: string): MeshInjection {
    const { params } = descriptor;
    const [a, b] = MESH_ATTRIBUTES;
    const varyings = `varying vec4 graphty_vA;
varying vec4 graphty_vB;
varying vec3 graphty_vViewPos;
varying vec3 graphty_vCenter;
varying vec3 graphty_vLocal;
varying float graphty_vRadius;
varying float graphty_vPixelSize;`;

    return {
        vertexDefinitions: `attribute vec4 ${a};
attribute vec4 ${b};
${varyings}`,
        vertexMainEnd: `
    graphty_vA = ${a};
    graphty_vB = ${b};
    vec4 graphty_center = view * vec4(finalWorld[3].xyz, 1.0);
    graphty_vCenter = graphty_center.xyz;
    graphty_vViewPos = (view * worldPos).xyz;
    graphty_vLocal = positionUpdated / max(graphty_meshRadius, 1e-6);
    graphty_vRadius = graphty_meshRadius * length(finalWorld[0].xyz);
    vec4 graphty_clip = projection * graphty_center;
    graphty_vPixelSize = graphty_vRadius * abs(projection[1][1]) * 0.5 * graphty_resolution.y / max(abs(graphty_clip.w), 1e-6);
`,
        // Without its precision lines: Babylon writes its own at the top of a program only when the
        // text holds none, and one here, after its declarations, would leave those without. Without
        // the scene block: its members are in the material's own block, which the plugin declares.
        fragmentDefinitions: `${fragmentPrelude()
            .replaceAll(/^precision [^;]*;\n/gm, "")
            .replace(/^uniform graphtyScene \{[^}]*\};\n/m, "")}
${NODE_FUNCTIONS}
${varyings}
${paramGlobals(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
`,
        fragmentBeforeFragColor: `
{
${paramLocals(params, "graphty_vA", "int(graphty_vB.y + 0.5)")}
${mainPrelude(params)}
    graphty_NodeInput graphty_in;
    graphty_in.uv = (graphty_vViewPos.xy - graphty_vCenter.xy) / max(graphty_vRadius, 1e-6);
    graphty_in.local = graphty_vLocal;
    graphty_in.normal = normalize((view * vec4(normalW, 0.0)).xyz);
    graphty_in.viewDir = normalize(graphty_vViewPos);
    // The instance color, as the material's own vertex-color mixing passes it.
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
    graphty_in.color = vec4(vColor.rgb, visibility);
#else
    graphty_in.color = vec4(1.0, 1.0, 1.0, visibility);
#endif
    graphty_in.size = graphty_vRadius;
    graphty_in.pixelSize = graphty_vPixelSize;
${stateInput("graphty_vB", null)}
${clockAssignments(params, NODE_CLOCK_FIELDS)}
    vec4 graphty_out = graphty_u_shade(graphty_in);
    color = graphty_bad(graphty_out) ? graphty_in.color : graphty_out;
}
`,
    };
}

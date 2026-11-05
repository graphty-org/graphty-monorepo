/**
 * @file The programs that draw an edge shader on a real graph (design/rendering/shader-styles.md
 * section 5): an edge surface or an edge effect drawn on the joined line's own pieces, so it keeps
 * the line's width, taper, corners and route and draws the same on a straight, curved, bent or
 * lifted edge.
 *
 * The line's own stages do the geometry (`src/meshes/edgeJoinShader.ts`, with `EDGE_WIDENED` and
 * `EDGE_SHADED`); this module writes what comes after its fragment stage: the prelude, the
 * library, the renamed body and `graphty_edgeShade`, which fills `EdgeInput` from the piece's
 * static attributes and calls the body. Parameters come as the node programs' do: a `varies` one
 * from the slot's `edgeParams`, every other from its row of the parameter-set data texture.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../catalog/shaders";
import { EDGE_JOIN_FRAGMENT_SHADER, EDGE_STATE_BITS } from "../../meshes/edgeJoinShader";
import { PARAM_TEXTURE } from "./nodeLayout";
import { paramLocals } from "./nodePrograms";
import { TIME_PERIOD } from "./sceneUniforms";
import {
    clockAssignments,
    EDGE_CLOCK_FIELDS,
    fragmentPrelude,
    mainPrelude,
    paramGlobals,
    prefixBody,
    SCENE_BLOCK,
    WRAPPER_LINE,
} from "./wrap";

/** The plain uniforms an edge shader program declares beside the line's own. */
export const EDGE_SHADER_UNIFORMS = ["graphty_freeze"] as const;

/** The fragment stage of an edge shader and what it declares beyond the line's own stages. */
export interface EdgeShaderProgram {
    readonly fragment: string;
    readonly uniforms: readonly string[];
    readonly samplers: readonly string[];
    readonly uniformBuffers: readonly string[];
}

/**
 * The fragment stage that draws one edge shader on the line's pieces.
 * @param place - `paint` (replacing the line's color, blended straight over as the line is) or
 *     `along` (a strip over the line). Bodies return straight alpha in both; `along` is
 *     premultiplied here for its premultiplied (or additive) blend.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body.
 * @returns The program.
 */
export function edgeShaderProgram(
    place: "paint" | "along",
    descriptor: Pick<ShaderDescriptor, "params">,
    body: string,
): EdgeShaderProgram {
    const { params } = descriptor;
    const period = TIME_PERIOD.toFixed(1);
    const finish =
        place === "paint"
            ? `    if (graphty_bad(graphty_out)) { graphty_out = graphty_in.color; }
    return vec4(graphty_out.rgb, graphty_out.a * coverage);`
            : `    if (graphty_bad(graphty_out)) { graphty_out = vec4(0.0); }
    float graphty_a = clamp(graphty_out.a, 0.0, 1.0);
    return vec4(graphty_out.rgb * graphty_a, graphty_a) * coverage;`;
    const fragment = `${EDGE_JOIN_FRAGMENT_SHADER}
${fragmentPrelude()}
uniform highp sampler2D ${PARAM_TEXTURE};
uniform float graphty_freeze;
float graphty_edgeSince(float stamp, float none) {
    return stamp < 0.0 ? none : mod(graphty_scene_time.x - stamp + ${period}, ${period});
}
float graphty_edgeBit(float bits, float bit) {
    return mod(floor(bits / bit), 2.0);
}
${paramGlobals(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
vec4 graphty_edgeShade(float t, float side, float lengthPx, float widthPx, float coverage) {
${paramLocals(params, "vEdgeParams", "int(vEdgeMeta.y + 0.5)")}
${mainPrelude(params)}
    graphty_EdgeInput graphty_in;
    graphty_in.t = t;
    graphty_in.side = side;
    graphty_in.lengthPx = lengthPx;
    graphty_in.widthPx = widthPx;
    graphty_in.sourceColor = vEdgeColorA;
    graphty_in.targetColor = vEdgeColorB;
    graphty_in.color = mix(vEdgeColorA, vEdgeColorB, t);
    graphty_in.seed = vEdgeMeta.x;
    graphty_in.selected = graphty_edgeBit(vEdgeMeta.z, ${EDGE_STATE_BITS.selected.toFixed(1)});
    graphty_in.hovered = graphty_edgeBit(vEdgeMeta.z, ${EDGE_STATE_BITS.hovered.toFixed(1)});
    graphty_in.sourceSelected = graphty_edgeBit(vEdgeMeta.z, ${EDGE_STATE_BITS.sourceSelected.toFixed(1)});
    graphty_in.targetSelected = graphty_edgeBit(vEdgeMeta.z, ${EDGE_STATE_BITS.targetSelected.toFixed(1)});
    graphty_in.sinceEntered = graphty_edgeSince(vEdgeTimes.x, 10000.0);
    graphty_in.sinceExited = graphty_edgeSince(vEdgeTimes.y, -1.0);
    graphty_in.sinceChanged = graphty_edgeSince(vEdgeTimes.z, -1.0);
    graphty_in.time = graphty_freeze >= 0.0 ? graphty_freeze : graphty_scene_time.x;
${clockAssignments(params, EDGE_CLOCK_FIELDS)}
    vec4 graphty_out = graphty_u_shade(graphty_in);
${finish}
}
`;

    return {
        fragment,
        uniforms: [...EDGE_SHADER_UNIFORMS],
        samplers: [PARAM_TEXTURE],
        uniformBuffers: [SCENE_BLOCK],
    };
}

/**
 * Rope, chain and stitch by weight: an edge's material says how strong it is. Weak links are a
 * single silk thread, medium ones a twisted rope, strong ones a steel chain -- readable without a
 * legend because everyone knows which of those holds the most. A stitched-thread mode draws every
 * edge as a running stitch, like embroidery. All patterns are measured in screen pixels, so they
 * keep their proportions at any zoom.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Rope Chain", ...labMeta };

interface Args extends GraphArgs {
    mode: number;
    ropeAbove: number;
    chainAbove: number;
    linkLength: number;
    ropeTwist: number;
    ropeColor: string;
    metalColor: string;
    stitchColor: string;
}

// stronger materials are drawn thicker: chain 1.6x, rope 1x, thread 0.8x (in "by weight" mode)
const EDGE_HOOKS = `
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    if (mode > 0.5) return edgeWidth;
    return edgeWidth * (edgeData.x < ropeAbove ? 0.8 : (edgeData.x < chainAbove ? 1.0 : 1.6));
}
`;

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
// a tube's height from its signed distance d (negative inside) and radius th
float tube(float d, float th) { float r = clamp((d + th) / th, 0.0, 1.0); return sqrt(max(1.0 - r * r, 0.0)); }

vec4 thread(float x, float y, float hw) {
    float th = max(hw * 0.3, 0.7);
    float d = abs(y) - th;
    float h = tube(d, th);
    float twist = 0.85 + 0.15 * sin(TAU * (x + y * 2.0) / max(hw * 1.5, 2.0));
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * (0.35 + 0.75 * h) * twist + vec3(0.6) * pow(h, 12.0) * 0.5;
    return vec4(c, fill(d));
}

vec4 rope(float x, float y, float hw) {
    float d = abs(y) - hw * 0.95;
    float cyl = tube(d, hw * 0.95);
    // three strands wound at an angle: each band is its own rounded strand
    float u = (x + y * ropeTwist) / (hw * 1.1);
    float s = fract(u);
    float strand = sqrt(max(sin(PI * s), 0.0));
    float fiber = 0.85 + 0.15 * noise(vec2(u * 3.0, y * 1.5 + floor(u) * 7.0) * vec2(1.0, 4.0));
    vec3 c = ropeColor * (0.25 + 0.9 * cyl * strand) * fiber;
    c += vec3(1.0, 0.95, 0.8) * pow(cyl * strand, 10.0) * 0.25;
    return vec4(c, fill(d));
}

vec4 chain(float x, float y, float hw) {
    float P = max(linkLength * hw, 4.0);
    float th = hw * 0.24;
    float i0 = floor(x / P);
    float best = 1e5;
    float bestH = 0.0;
    float onTop = 0.0;
    for (int k = -1; k <= 1; k++) {
        float i = i0 + float(k);
        vec2 q = vec2(x - (i + 0.5) * P, y);
        float face = mod(i, 2.0);
        float d;
        if (face < 0.5) {
            // seen face-on: a stadium-shaped ring
            vec2 b = vec2(0.62 * P - th, 0.8 * hw - th);
            d = abs(sdRoundBox(q, b, b.y)) - th;
        } else {
            // seen edge-on: a flat bar threaded through its neighbors
            d = sdRoundBox(q, vec2(0.62 * P, th), th);
        }
        // edge-on links sit over the face-on ones
        if (d < 0.0 && face > 0.5) { onTop = 1.0; best = d; bestH = tube(d, th); }
        else if (onTop < 0.5 && d < best) { best = d; bestH = tube(d, th); }
    }
    vec3 c = metalColor * (0.15 + 0.85 * bestH);
    c += vec3(1.0) * pow(bestH, 18.0) * 0.9;
    c += metalColor * 0.25 * (1.0 - bestH) * smoothstep(-th, 0.0, best);
    return vec4(c, fill(best));
}

vec4 stitch(float x, float y, float hw) {
    float P = max(hw * 3.2, 6.0);
    float lx = mod(x + vData.w * P, P) - P * 0.5;
    float th = max(hw * 0.28, 0.7);
    float d = sdSegment(vec2(lx, y), vec2(-P * 0.28, -hw * 0.45), vec2(P * 0.28, hw * 0.45)) - th;
    float h = tube(d, th);
    vec3 c = stitchColor * (0.35 + 0.75 * h) + vec3(1.0) * pow(h, 10.0) * 0.3;
    // the needle holes at both ends
    float hole = min(length(vec2(lx, y) - vec2(-P * 0.33, -hw * 0.55)), length(vec2(lx, y) - vec2(P * 0.33, hw * 0.55))) - th * 0.8;
    vec4 s = vec4(c, fill(d));
    float ha = fill(hole) * 0.6;
    return vec4(mix(vec3(0.0), s.rgb, s.a), max(s.a, ha));
}

void main() {
    float x = ribbonX();
    float y = ribbonY();
    float hw = ribbonHalf();
    float w = vData.x;
    float m = mode;
    if (m < 0.5) { m = w < ropeAbove ? 1.0 : (w < chainAbove ? 2.0 : 3.0); }
    vec4 r;
    if (m < 1.5) r = thread(x, y, hw);
    else if (m < 2.5) r = rope(x, y, hw);
    else if (m < 3.5) r = chain(x, y, hw);
    else r = stitch(x, y, hw);
    float lit = edgeLit();
    r.rgb = mix(r.rgb, r.rgb * 1.4 + 0.15, lit);
    if (r.a <= 0.0) discard;
    gl_FragColor = r;
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    // a wooden peg: dome shading and rings
    float h = sqrt(max(1.0 - r * r, 0.0));
    vec3 wood = mix(vec3(0.42, 0.26, 0.14), vec3(0.72, 0.5, 0.3), 0.5 + 0.5 * sin(r * 18.0 + noise(vUV * 4.0) * 3.0));
    vec3 c = mix(wood, vColor.rgb, 0.35) * (0.45 + 0.6 * h) + vec3(1.0) * pow(max(dot(vec3(vUV, h), normalize(vec3(-0.4, 0.5, 0.8))), 0.0), 30.0) * 0.4;
    c = mix(c, vec3(1.0), 0.35 * vState.x);
    c = mix(c, vec3(1.0, 0.85, 0.3), stroke(d + 0.06, 0.06) * vState.y);
    gl_FragColor = vec4(c, a);
}
`;

export const RopeChain = {
    args: {
        ...graphArgs,
        graph: "weighted",
        nodes: 120,
        edgeWidth: 9,
        mode: 0,
        ropeAbove: 0.12,
        chainAbove: 0.35,
        linkLength: 2.4,
        ropeTwist: 1.2,
        ropeColor: "#c8a26a",
        metalColor: "#9aa7b8",
        stitchColor: "#e04a5f",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        mode: {
            control: { type: "select", labels: { 0: "by weight", 1: "thread", 2: "rope", 3: "chain", 4: "stitch" } },
            options: [0, 1, 2, 3, 4],
        },
        ropeAbove: range(0, 1),
        chainAbove: range(0, 1),
        linkLength: range(1.2, 5),
        ropeTwist: range(0, 3),
        ropeColor: { control: "color" },
        metalColor: { control: "color" },
        stitchColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#1a1714",
            uniforms: {
                mode: args.mode,
                ropeAbove: args.ropeAbove,
                chainAbove: args.chainAbove,
                linkLength: args.linkLength,
                ropeTwist: args.ropeTwist,
                ropeColor: args.ropeColor,
                metalColor: args.metalColor,
                stitchColor: args.stitchColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { vertexHooks: EDGE_HOOKS, fragment: EDGE_FRAGMENT },
        }),
};

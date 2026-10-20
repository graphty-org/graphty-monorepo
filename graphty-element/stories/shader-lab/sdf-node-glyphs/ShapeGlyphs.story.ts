/**
 * Shape glyphs: every node is a crisp 2D signed-distance shape chosen by its community (circle,
 * rounded square, triangle, hexagon, star, diamond, cross), with a border ring whose width encodes
 * degree. The `morph` knob blends each shape into the next one, and `cycle` animates that blend,
 * because two distance fields mix into a smooth in-between shape for free.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Shape Glyphs", ...labMeta };

interface Args extends GraphArgs {
    morph: number;
    cycle: number;
    ringMin: number;
    ringByDegree: number;
    borderColor: string;
    bevel: number;
}

const NODE_FRAGMENT = `
float glyph(float k, vec2 p) {
    if (k < 0.5) return sdCircle(p, 0.9);
    if (k < 1.5) return sdRoundBox(p, vec2(0.76), 0.16);
    if (k < 2.5) return sdTriangle(vec2(p.x, p.y + 0.12), 0.95) - 0.06;
    if (k < 3.5) return sdHexagon(p, 0.8) - 0.04;
    if (k < 4.5) return sdStar5(vec2(p.x, p.y + 0.04), 0.98, 0.5) - 0.03;
    if (k < 5.5) return sdBox(rot2(0.785398) * p, vec2(0.64)) - 0.06;
    return min(sdBox(p, vec2(0.86, 0.27)), sdBox(p, vec2(0.27, 0.86))) - 0.05;
}
void main() {
    float ph = morph + time * cycle;
    float k = mod(vData.w + floor(ph), 7.0);
    float f = smoothstep(0.0, 1.0, fract(ph));
    vec2 p = vUV;
    float d = mix(glyph(k, p), glyph(mod(k + 1.0, 7.0), p), f);

    float outer = fill(d);
    float sel = vState.y * stroke(d - 0.12, 0.035);
    float halo = vState.x * exp(-max(d, 0.0) * 9.0) * 0.6;
    // fade the glow out before the quad edge so no square shows around a hovered node
    halo *= smoothstep(1.5, 1.2, max(abs(vUV.x), abs(vUV.y)));
    float a = max(outer, max(sel, halo));
    if (a <= 0.003) discard;

    float w = ringMin + ringByDegree * vData.x;
    float inner = fill(d + w);
    // a soft bevel: lighter toward the top-left, darker toward the edge
    float edgeShade = 1.0 - bevel * smoothstep(-0.35, 0.0, d + w) * 0.6;
    vec3 body = vColor.rgb * edgeShade * (1.0 + bevel * 0.25 * (vUV.y - vUV.x * 0.5));
    vec3 c = mix(borderColor, body, inner);
    c = mix(c, vec3(1.0), 0.35 * vState.x * outer);
    c = mix(c, vec3(1.0), sel);
    c = mix(vColor.rgb + 0.3, c, outer);
    gl_FragColor = vec4(c, a);
}
`;

export const ShapeGlyphs = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2,
        morph: 0,
        cycle: 0,
        ringMin: 0.06,
        ringByDegree: 0.3,
        borderColor: "#f4f1ea",
        bevel: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        morph: range(0, 7, 0.01),
        cycle: range(0, 1, 0.01),
        ringMin: range(0, 0.3),
        ringByDegree: range(0, 0.6),
        borderColor: { control: "color" },
        bevel: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                morph: args.morph,
                cycle: args.cycle,
                ringMin: args.ringMin,
                ringByDegree: args.ringByDegree,
                borderColor: args.borderColor,
                bevel: args.bevel,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.5, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

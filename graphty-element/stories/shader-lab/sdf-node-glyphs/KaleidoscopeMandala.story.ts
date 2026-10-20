/**
 * Kaleidoscope mandala: every node is a slowly turning mandala whose number of mirror folds is its
 * degree (3 for a leaf, up to 14 for a hub), so the busiest nodes are the most intricate. The
 * trick is a polar fold: the angle is wrapped into one wedge and mirrored, then any pattern drawn
 * in that wedge repeats around the circle. Colors come from a cosine palette keyed to community.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Kaleidoscope Mandala", ...labMeta };

interface Args extends GraphArgs {
    spin: number;
    flow: number;
    detail: number;
    extraFolds: number;
    hueShift: number;
    rim: number;
}

const NODE_FRAGMENT = `
void main() {
    vec2 p = vUV;
    float r = length(p);
    float a = fill(r - 0.96);
    float sel = vState.y * stroke(r - 1.08, 0.035);
    float glowR = exp(-max(r - 0.96, 0.0) * 14.0) * (0.25 + 0.5 * vState.x);
    if (max(max(a, sel), glowR) <= 0.003) discard;

    float folds = floor(3.0 + vData.x * 11.0 + extraFolds);
    float dir = vInfo.x > 0.5 ? 1.0 : -1.0;
    float spinNow = spin * (1.0 + 2.0 * vState.x);
    float ang = atan(p.y, p.x) + time * spinNow * dir;
    float wedge = TAU / folds;
    ang = mod(ang, wedge);
    ang = abs(ang - wedge * 0.5);
    vec2 q = r * vec2(cos(ang), sin(ang));

    float seed = vInfo.x * 31.0;
    // petals: a ring of circles in the wedge, plus fbm filigree
    float petal = length(q - vec2(0.62, 0.0)) - (0.16 + 0.05 * sin(time * 1.3 + seed));
    float petal2 = length(q - vec2(0.33, 0.0)) - 0.1;
    float fil = fbm(q * detail + vec2(seed, time * flow));
    float bands = sin(r * 22.0 - time * 2.0 * flow + fil * 6.0);

    vec3 pa = vec3(0.55, 0.5, 0.5);
    vec3 pb = vec3(0.45, 0.45, 0.5);
    vec3 pc = vec3(1.0, 1.0, 1.0);
    vec3 pd = vec3(0.0, 0.15, 0.3) + vData.w * 0.13 + hueShift;
    vec3 c = palette(fil * 1.4 + r * 0.7 - time * 0.05, pa, pb, pc, pd);
    c *= 0.55 + 0.45 * smoothstep(-0.3, 1.0, bands);
    // petals drawn as glowing outlines and soft fills
    vec3 petalC = palette(0.3 + r, pa, pb, pc, pd + 0.25);
    c = mix(c, petalC, fill(petal) * 0.55);
    c += petalC * stroke(petal, 0.012) * 1.3;
    c = mix(c, vec3(1.0, 0.95, 0.8), stroke(petal2, 0.01));
    // ink lines between wedges
    c *= 0.6 + 0.4 * smoothstep(0.0, 0.04, ang * r);
    // bright center jewel and a gold rim
    c += vec3(1.0, 0.9, 0.7) * exp(-r * 9.0) * 1.2;
    c = mix(c, vec3(1.0, 0.82, 0.45), rim * stroke(r - 0.9, 0.035));
    c *= mix(1.0, 0.75, smoothstep(0.7, 0.96, r));

    vec3 col = mix(vColor.rgb * glowR * 2.0, c, a);
    col = mix(col, vec3(1.0), sel);
    gl_FragColor = vec4(col, max(max(a, sel), glowR));
}
`;

export const KaleidoscopeMandala = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2.2,
        spin: 0.25,
        flow: 0.3,
        detail: 5,
        extraFolds: 0,
        hueShift: 0,
        rim: 1,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        spin: range(-2, 2),
        flow: range(0, 2),
        detail: range(1, 12, 0.1),
        extraFolds: range(0, 12, 1),
        hueShift: range(0, 1),
        rim: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                spin: args.spin,
                flow: args.flow,
                detail: args.detail,
                extraFolds: args.extraFolds,
                hueShift: args.hueShift,
                rim: args.rim,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.2, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

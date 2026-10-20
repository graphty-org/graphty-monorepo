/**
 * DNA double helix: two strands, one in the source's color and one in the target's, twist around
 * each edge, joined by base-pair rungs in four colors. The strand passing behind is darker and
 * thinner, so the helix reads as 3D on a flat ribbon. The twist can encode the edge's weight
 * (tighter twist = heavier edge), and the helix slowly turns.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, DARK_NODE_FRAGMENT, RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Dna Helix", ...labMeta };

interface Args extends GraphArgs {
    pitch: number;
    twistByWeight: number;
    spin: number;
    strandWidth: number;
    rungs: number;
    glow: number;
    bloom: number;
    bloomRadius: number;
}

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
// a strand's coverage and its depth (1 = in front), from its phase offset
vec3 strand(float x, float y, float hw, float P, float ph) {
    float phase = TAU * (x / P - time * spin) + ph;
    float amp = hw * 0.72;
    float cy = amp * sin(phase);
    float z = cos(phase);
    // distance to the sine curve, corrected for its slope
    float slope = amp * cos(phase) * TAU / P;
    float dist = abs(y - cy) / sqrt(1.0 + slope * slope);
    float th = hw * strandWidth * (0.7 + 0.3 * z);
    float cov = fill(dist - th);
    float h = sqrt(max(1.0 - pow(dist / max(th, 0.01), 2.0), 0.0));
    return vec3(cov, z, h);
}
void main() {
    float x = ribbonX() + vData.w * 300.0;
    float y = ribbonY();
    float hw = ribbonHalf();
    float P = max(pitch * hw * mix(1.0, 1.6 - 1.2 * vData.x, twistByWeight), 6.0);
    vec3 s1 = strand(x, y, hw, P, 0.0);
    vec3 s2 = strand(x, y, hw, P, PI);
    // rungs: short bars between the strands, every 1/rungs of a turn
    float rx = x / P * rungs;
    float ri = floor(rx + 0.5);
    float rd = abs(rx - ri) * P / rungs;
    float phase = TAU * (ri / rungs - time * spin);
    float y1 = hw * 0.72 * sin(phase);
    float rung = fill(rd - hw * 0.12) * step(abs(y), abs(y1) + 0.5);
    float base = hash11(ri * 3.7 + vData.w * 91.0);
    vec3 rungCol = base < 0.25 ? vec3(0.95, 0.35, 0.35) : (base < 0.5 ? vec3(0.35, 0.8, 0.95) : (base < 0.75 ? vec3(0.95, 0.85, 0.3) : vec3(0.45, 0.95, 0.5)));
    // color the half of the rung nearest each strand by that strand's base
    if (y * y1 < 0.0) rungCol = rungCol.gbr;
    float rungDepth = 0.35 + 0.35 * abs(cos(phase));
    vec3 c = vec3(0.0);
    float a = 0.0;
    vec3 colA = vColorA.rgb * 1.2;
    vec3 colB = vColorB.rgb * 1.2;
    // paint back to front: the back strand, the rungs, then the front strand
    vec3 back = s1.y < s2.y ? s1 : s2;
    vec3 front = s1.y < s2.y ? s2 : s1;
    vec3 backCol = s1.y < s2.y ? colA : colB;
    vec3 frontCol = s1.y < s2.y ? colB : colA;
    c = mix(c, backCol * (0.25 + 0.35 * back.z), back.x); a = max(a, back.x);
    c = mix(c, rungCol * rungDepth, rung); a = max(a, rung);
    c = mix(c, frontCol * (0.45 + 0.75 * front.z) + vec3(1.0) * pow(front.z, 14.0) * 0.6, front.x); a = max(a, front.x);
    // a soft glow halo around the helix
    float halo = exp(-y * y / (hw * hw) * 3.0) * glow * 0.15;
    c += mix(colA, colB, vT) * halo;
    a = max(a, halo);
    c *= 1.0 + 0.8 * edgeLit();
    if (a <= 0.003) discard;
    gl_FragColor = vec4(c / max(a, 0.001), a);
}
`;

export const DnaHelix = {
    args: {
        ...graphArgs,
        graph: "weighted",
        nodes: 120,
        nodeSize: 0.7,
        edgeWidth: 14,
        pitch: 5,
        twistByWeight: 0.6,
        spin: 0.25,
        strandWidth: 0.16,
        rungs: 8,
        glow: 1,
        bloom: 0.6,
        bloomRadius: 3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        edgeWidth: range(2, 30, 0.5),
        pitch: range(2, 15),
        twistByWeight: range(0, 1),
        spin: range(-2, 2),
        strandWidth: range(0.05, 0.4),
        rungs: range(0, 16, 1),
        glow: range(0, 4),
        bloom: range(0, 3),
        bloomRadius: range(0.5, 10),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#04060c",
            uniforms: {
                pitch: args.pitch,
                twistByWeight: args.twistByWeight,
                spin: args.spin,
                strandWidth: args.strandWidth,
                rungs: args.rungs,
                glow: args.glow,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [BLOOM_POST],
        }),
};

/**
 * Community synchronized breathing: every community inhales and exhales together, each on its own
 * phase, with a slow wave rolling across it so the breath visibly travels. Nodes swell and glow on
 * the in-breath; a soft aura blooms around them; edges inside a community breathe with it, while
 * edges between communities shimmer between the two rhythms. The groups read without any legend.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Community Breathing", ...labMeta };

interface Args extends GraphArgs {
    breathsPerMinute: number;
    waveLength: number;
    waveAngle: number;
    swell: number;
    glow: number;
    aura: number;
}

const COMMON = `
// 0 (exhaled) .. 1 (inhaled) for community c at world position p (xy)
float breath(float c, vec2 p) {
    vec2 dir = vec2(cos(waveAngle), sin(waveAngle));
    float ph = time * breathsPerMinute / 60.0 * TAU + c * 2.39996 - dot(p, dir) / max(waveLength, 1.0) * TAU;
    float s = 0.5 + 0.5 * sin(ph);
    return s * s * (3.0 - 2.0 * s);
}
`;

const NODE_HOOKS = `
${COMMON}
#define LAB_NODE_SCALE
float labNodeScale() { return 1.0 + swell * (breath(nodeData.w, nodePos.xy) - 0.5); }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float b = breath(vData.w, vCenterWorld.xy);
    vec3 base = vColor.rgb * mix(0.55, 1.0, b);
    vec3 c = labShade(n, base);
    // inner light rising with the breath
    c += vColor.rgb * glow * b * b * (0.25 + 0.75 * (-n.z));
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.4 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const AURA_FRAGMENT = `
${COMMON}
void main() {
    float b = breath(vData.w, vCenterWorld.xy);
    float r = length(vUV);
    if (r < 0.95) discard;
    float h = exp(-(r - 1.0) * mix(3.0, 1.6, b)) * b * aura;
    h *= 1.0 - smoothstep(2.6, 3.0, r);
    gl_FragColor = vec4(vColor.rgb * h, h);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec2 p = mix(vCustom.xy, vCustom.zw, vT);
    float bs = breath(vData.y, p);
    float bd = breath(vData.z, p);
    float same = vData.y == vData.z ? 1.0 : 0.0;
    vec3 ca = vColorA.rgb * mix(0.4, 1.0 + glow * 0.5, bs);
    vec3 cb = vColorB.rgb * mix(0.4, 1.0 + glow * 0.5, bd);
    vec3 col = mix(ca, cb, vT);
    float b = mix(bs, bd, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    col = mix(col, vec3(1.0), 0.4 * lit);
    float a = cov * clamp(mix(0.15, 0.85, b) * mix(0.6, 1.0, same) + lit, 0.0, 1.0);
    gl_FragColor = vec4(col, a);
}
`;

export const CommunityBreathing = {
    args: {
        ...graphArgs,
        edgeWidth: 1.75,
        breathsPerMinute: 14,
        waveLength: 120,
        waveAngle: 0.6,
        swell: 0.35,
        glow: 0.9,
        aura: 0.8,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        breathsPerMinute: range(2, 60, 1),
        waveLength: range(10, 400),
        waveAngle: range(-3.14, 3.14),
        swell: range(0, 1),
        glow: range(0, 2),
        aura: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#06070c",
            uniforms: {
                breathsPerMinute: args.breathsPerMinute,
                waveLength: args.waveLength,
                waveAngle: args.waveAngle,
                swell: args.swell,
                glow: args.glow,
                aura: args.aura,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            // each edge carries its endpoints' xy, so the traveling wave reaches it in the right place
            edgeLayer: {
                fragment: EDGE_FRAGMENT,
                custom: (e, g) => [
                    g.pos[g.src[e] * 3],
                    g.pos[g.src[e] * 3 + 1],
                    g.pos[g.dst[e] * 3],
                    g.pos[g.dst[e] * 3 + 1],
                ],
            },
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "aura", fragment: AURA_FRAGMENT, quadScale: 3, vertexHooks: NODE_HOOKS });
            },
        }),
};

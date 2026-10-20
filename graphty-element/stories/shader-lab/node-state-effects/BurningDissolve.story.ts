/**
 * Burning dissolve on filter: nodes whose value falls under the cutoff burn away through a noise
 * mask with a glowing ember front and charred edges; the fire then runs down their edges from the
 * burning end. After a pause everything reassembles, the burn running in reverse. Turn on
 * `manual` and drag `progress` to scrub the burn by hand.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Burning Dissolve", ...labMeta };

interface Args extends GraphArgs {
    cutoff: number;
    period: number;
    manual: boolean;
    progress: number;
    emberWidth: number;
    emberHeat: number;
    noiseScale: number;
}

const COMMON = `
// 0 = intact, 1 = burned away
float burnT() {
    if (manual > 0.5) return progress;
    float p = fract(time / period);
    return smoothstep(0.08, 0.42, p) * (1.0 - smoothstep(0.62, 0.95, p));
}
// two octaves: smooth enough to read as a burn front on a small node
float burnNoise(vec2 p) { return 0.68 * noise(p) + 0.32 * noise(p * 2.3 + 5.1); }
vec3 ember(float k) { return blackbody(0.2 + 0.7 * k * emberHeat) * (0.9 + 1.3 * k); }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.4 * vState.y * pow(1.0 + n.z, 2.0));
    float filtered = step(vData.z, cutoff);
    if (filtered > 0.5) {
        float id = vInfo.y;
        // burn starts at a random spot on each node and eats outward through the noise
        vec2 spot = (hash22(vec2(id, 7.0)) - 0.5) * 1.4;
        float m = 0.68 * clamp((burnNoise(vUV * noiseScale + id * 7.13) - 0.2) * 1.65, 0.0, 1.0) + 0.32 * clamp(length(vUV - spot) * 0.5, 0.0, 1.0);
        float t = clamp(burnT() * 1.25 - 0.1 * hash11(id), 0.0, 1.0) * 1.05;
        float edge = m - t;
        if (edge < 0.0) discard;
        float glow = 1.0 - smoothstep(0.0, emberWidth, edge);
        float charred = 1.0 - smoothstep(emberWidth, emberWidth * 3.0, edge);
        c = mix(c, c * 0.15, charred * step(0.001, t));
        c += ember(glow) * glow * step(0.001, t);
    }
    gl_FragColor = vec4(c, 1.0);
}
`;

// additive fire glow and rising sparks around each node while it burns, so the burn reads at a
// distance even when the node sits inside a cluster
const FIRE_FRAGMENT = `
${COMMON}
void main() {
    if (step(vData.z, cutoff) < 0.5) discard;
    float id = vInfo.y;
    float t = clamp(burnT() * 1.25 - 0.1 * hash11(id), 0.0, 1.0);
    float burning = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.8, 1.0, t));
    if (burning < 0.01) discard;
    vec2 uv = vUV;
    float r = length(uv);
    float flick = 0.75 + 0.25 * noise(vec2(time * 7.0, id));
    float halo = exp(-max(r - 0.6, 0.0) * 2.8) * 0.5 * flick;
    // embers rising off the burn and fading
    float sp = 0.0;
    for (int k = 0; k < 6; k++) {
        float fk = float(k);
        vec2 h = hash22(vec2(id, fk * 3.1));
        float life = fract(time * (0.45 + 0.4 * h.y) + h.x);
        vec2 p = vec2((h.x - 0.5) * 1.3 + 0.2 * sin(time * 3.0 + fk * 2.0), -0.2 + life * 2.4);
        vec2 dd = uv - p;
        sp += exp(-dot(dd, dd) * 140.0) * (1.0 - life);
    }
    vec3 col = (ember(0.55) * halo + ember(1.0) * sp * 1.6) * burning;
    gl_FragColor = vec4(col, 1.0);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float fs = step(vCustom.x, cutoff);
    float fd = step(vCustom.y, cutoff);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec3 col = mix(c, vec3(1.0), 0.4 * lit);
    float a = cov * mix(0.55, 1.0, lit);
    if (fs + fd > 0.5) {
        // distance along the edge from the burning end(s)
        float s = fs > 0.5 && fd > 0.5 ? min(vT, 1.0 - vT) * 2.0 : (fs > 0.5 ? vT : 1.0 - vT);
        float m = 0.4 * clamp((burnNoise(vec2(vT * vLengthPx / (16.0 * pixelRatio), vSide * 0.4 + vInfo.z)) - 0.2) * 1.65, 0.0, 1.0) + 0.6 * s;
        float t = clamp(burnT() * 1.4 - 0.25, 0.0, 1.0) * 1.05;
        float edge = m - t;
        if (edge < 0.0) discard;
        float glow = 1.0 - smoothstep(0.0, emberWidth * 0.8, edge);
        col = mix(col, col * 0.2, (1.0 - smoothstep(0.0, emberWidth * 2.0, edge)) * step(0.001, t));
        col += ember(glow) * glow * step(0.001, t);
        a = max(a, cov * glow);
    }
    gl_FragColor = vec4(col, a);
}
`;

export const BurningDissolve = {
    args: {
        ...graphArgs,
        nodeSize: 1.3,
        edgeWidth: 2,
        cutoff: 0.45,
        period: 7,
        manual: false,
        progress: 0.5,
        emberWidth: 0.14,
        emberHeat: 0.8,
        noiseScale: 2.2,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        cutoff: range(0, 1),
        period: range(2, 20),
        manual: { control: "boolean" },
        progress: range(0, 1),
        emberWidth: range(0.01, 0.4),
        emberHeat: range(0.2, 1.2),
        noiseScale: range(0.5, 8),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                cutoff: args.cutoff,
                period: args.period,
                manual: args.manual,
                progress: args.progress,
                emberWidth: args.emberWidth,
                emberHeat: args.emberHeat,
                noiseScale: args.noiseScale,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            // each edge carries its endpoints' values, so it knows which end is filtered
            edgeLayer: {
                fragment: EDGE_FRAGMENT,
                custom: (e, g) => [g.value[g.src[e]], g.value[g.dst[e]], 0, 0],
            },
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "fire", fragment: FIRE_FRAGMENT, quadScale: 2.6, blend: "add" });
            },
        }),
};

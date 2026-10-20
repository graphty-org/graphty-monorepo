/**
 * Neon nodes and edges: every node is a bent glass tube (a ring, star, hexagon, triangle or
 * rounded square by community) and every edge a straight tube, each with a white-hot core and a
 * colored halo, over a near-black wall, with a real bloom on top. Volatile nodes flicker like a
 * failing sign: volatility comes from the node's value, its random, or nothing.
 *
 * The trick: draw the outline's distance d = abs(sdShape) - thickness. The core is where d < 0,
 * the halo is exp(-d * k) outside it. Additive blending makes overlaps add up to white.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addBloom, liveArgs } from "./common";

export default { title: "Shader Lab/Glow Bloom And Post/Neon Glow", ...labMeta };

const SHAPES = ["by community", "ring", "star", "hexagon", "triangle", "square"] as const;
const VOLATILITY = ["value", "random", "none"] as const;

interface Args extends GraphArgs {
    shape: (typeof SHAPES)[number];
    tube: number;
    halo: number;
    flicker: number;
    volatilityFrom: (typeof VOLATILITY)[number];
    hum: number;
    saturation: number;
    edgeGlow: number;
    bloom: number;
    bloomRadius: number;
}

const COMMON = `
vec3 neon(vec3 c) {
    // push the community color to a fully saturated tube gas color
    float m = max(c.r, max(c.g, c.b));
    vec3 s = c / max(m, 1e-3);
    s = pow(s, vec3(1.0 + 6.0 * saturation));
    return s;
}
// a sign that sometimes stutters: mostly on, off for a frame or two, more often when volatile
float flick(float id, float vol) {
    float t = floor(time * 18.0);
    float h = hash12(vec2(t, id * 7.13));
    float burst = step(0.82, hash12(vec2(floor(time * 1.3), id)));
    float off = step(1.0 - vol * flicker * (0.15 + 0.6 * burst), h);
    float buzz = 1.0 - hum * 0.12 * (0.5 + 0.5 * sin(time * 120.0 + id));
    return (1.0 - off * 0.92) * buzz;
}
`;

const NODE_FRAGMENT = `
${COMMON}
float shapeD(vec2 p, float k) {
    if (k < 0.5) return abs(length(p) - 0.78);
    if (k < 1.5) return abs(sdStar5(p * rot2(0.0), 0.95, 0.45));
    if (k < 2.5) return abs(sdHexagon(p, 0.78));
    if (k < 3.5) return abs(sdTriangle(p + vec2(0.0, 0.12), 0.85));
    return abs(sdRoundBox(p, vec2(0.7), 0.18));
}
void main() {
    float k = shape < 0.5 ? mod(vData.w, 5.0) : shape - 1.0;
    float spin = time * 0.15 * (vInfo.x - 0.5);
    vec2 p = rot2(spin) * vUV;
    float d = shapeD(p, k) - tube;
    float px = 1.0 / max(vPixelRadius, 1.0);
    vec3 c = neon(vColor.rgb);
    float vol = volatilityFrom < 0.5 ? vData.z : (volatilityFrom < 1.5 ? vInfo.x : 0.0);
    float on = flick(vInfo.y, vol);
    float core = 1.0 - smoothstep(-px, px, d + tube * 0.7);
    float tubeBody = 1.0 - smoothstep(-px, px, d);
    float glow = exp(-max(d, 0.0) * (14.0 / max(halo, 0.05))) * 0.55;
    float lit = 1.0 + 0.8 * vState.x + 1.2 * vState.y;
    vec3 col = c * (tubeBody * 0.9 + glow) * on * lit + mix(c, vec3(1.0), 0.7) * core * on * (0.8 + 0.4 * vState.x);
    // a faint unlit tube stays visible when the gas goes out
    col += c * tubeBody * 0.08 * (1.0 - on);
    col *= smoothstep(2.4, 1.6, length(vUV));
    gl_FragColor = vec4(col, 1.0);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float s = abs(vSide);
    vec3 c = neon(mix(vColorA.rgb, vColorB.rgb, smoothstep(0.3, 0.7, vT)));
    float w = vWidthPx;
    float core = 1.0 - smoothstep(0.12, 0.12 + 2.0 / w, s);
    float glow = exp(-s * 4.0) * 0.9;
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    float vol = volatilityFrom < 0.5 ? vData.x : (volatilityFrom < 1.5 ? vData.w : 0.0);
    float on = flick(vInfo.z + 1000.0, vol * 0.5);
    vec3 col = (c * glow * (0.7 + 0.8 * lit) + vec3(1.0) * core * (0.35 + 0.6 * lit)) * edgeGlow * on;
    // fade the tube where it meets a node so the node outline reads clean
    col *= smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT);
    gl_FragColor = vec4(col * labEdgeCoverage(), 1.0);
}
`;

const DEFAULTS: Args = {
    ...graphArgs,
    nodeSize: 1.1,
    edgeWidth: 7,
    shape: "by community",
    tube: 0.07,
    halo: 0.6,
    flicker: 0.6,
    volatilityFrom: "value",
    hum: 0.5,
    saturation: 0.6,
    edgeGlow: 0.45,
    bloom: 0.9,
    bloomRadius: 0.8,
};
const live = liveArgs(DEFAULTS);

export const NeonGlow = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        shape: { control: "select", options: SHAPES },
        tube: range(0.02, 0.2),
        halo: range(0.1, 1.5),
        flicker: range(0, 1),
        volatilityFrom: { control: "select", options: VOLATILITY },
        hum: range(0, 1),
        saturation: range(0, 1),
        edgeGlow: range(0, 1.5),
        bloom: range(0, 3),
        bloomRadius: range(0, 1.5),
    },
    render: (args: Args) => {
        live.update(args);
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#05040a",
            uniforms: {
                shape: SHAPES.indexOf(args.shape),
                tube: args.tube,
                halo: args.halo,
                flicker: args.flicker,
                volatilityFrom: VOLATILITY.indexOf(args.volatilityFrom),
                hum: args.hum,
                saturation: args.saturation,
                edgeGlow: args.edgeGlow,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, blend: "add", quadScale: 2.4 },
            edgeLayer: { fragment: EDGE_FRAGMENT, blend: "add" },
            setup: (ctx) => {
                addBloom(ctx, () => ({
                    threshold: 0.35,
                    intensity: live.current.bloom,
                    radius: live.current.bloomRadius,
                }));
            },
        });
    },
};

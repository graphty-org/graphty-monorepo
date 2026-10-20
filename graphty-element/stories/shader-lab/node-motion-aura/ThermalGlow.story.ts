/**
 * Thermal heat glow and haze: busy nodes run hot. Each node glows on a blackbody ramp -- cold
 * nodes a dull ember red, the busiest white-hot -- with a bloom around it and a column of heat
 * shimmer rising above, wavering like air over a road in summer. Edges carry the heat between
 * their ends. Temperature comes from PageRank, degree or value.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Thermal Glow", ...labMeta };

const SOURCES = ["rank", "degree", "value"] as const;

interface Args extends GraphArgs {
    heatFrom: (typeof SOURCES)[number];
    contrast: number;
    bloom: number;
    haze: number;
    shimmerSpeed: number;
    edgeHeat: number;
}

// temperature 0..1 is in nodeCustom.x (edgeCustom.xy for the two ends)
const TEMP = `
// higher contrast leaves fewer nodes white-hot
float heat(float raw) { return pow(clamp(raw, 0.0, 1.0), max(contrast, 0.05)); }
`;

const NODE_FRAGMENT = `
${TEMP}
void main() {
    vec3 n = labSphereNormal();
    float t = heat(vCustom.x);
    // the surface churns: hot spots crawl over the sphere
    float crawl = noise(vec3(n.xy * 3.0 + vInfo.x * 20.0, time * (0.5 + 2.0 * t)));
    float tt = clamp(t * (0.85 + 0.3 * crawl) + (-n.z) * 0.15 * t, 0.0, 1.0);
    vec3 c = blackbody(tt) * (0.45 + 0.75 * (-n.z));
    // cooler, darker limb
    c *= mix(0.55, 1.0, pow(-n.z, 0.5));
    c = mix(c, vec3(1.0), 0.3 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

// Bloom plus a tall plume of shimmering hot air above the node (screen up).
const HAZE_FRAGMENT = `
${TEMP}
void main() {
    float t = heat(vCustom.x);
    if (t < 0.03) discard;
    vec2 p = vUV;
    float sp = shimmerSpeed * (0.6 + 0.8 * t);
    // the plume wavers: its lookup is displaced sideways by noise rising with time
    float wav = noise(vec2(p.y * 2.2 - time * sp * 2.0, vInfo.x * 9.0)) - 0.5;
    vec2 q = p + vec2(wav * 0.6 * smoothstep(0.5, 3.0, p.y), 0.0);
    float rise = max(q.y, 0.0);
    float width = 0.55 + rise * 0.35;
    float column = exp(-q.x * q.x / (width * width)) * smoothstep(0.6, 1.4, q.y + 0.6) * exp(-rise * 0.55);
    // turbulent ribbons inside the column: bands that rise and break up
    float bands = noise(vec2(q.x * 3.0 + vInfo.x * 5.0, q.y * 2.5 - time * sp * 3.0));
    bands = smoothstep(0.35, 0.85, bands);
    float plume = column * (0.25 + 0.75 * bands) * haze * t;
    float r = length(p);
    float glow = exp(-max(r - 0.9, 0.0) * mix(3.5, 1.4, t)) * bloom * (0.25 + 0.75 * t) * smoothstep(0.8, 1.0, r);
    vec3 col = blackbody(t * 0.85) * glow + blackbody(t * 0.6) * plume;
    col *= smoothstep(QUAD, QUAD * 0.6, r);
    if (max(col.r, max(col.g, col.b)) < 0.003) discard;
    gl_FragColor = vec4(col, 1.0);
}
`;

const EDGE_FRAGMENT = `
${TEMP}
void main() {
    float cov = labEdgeCoverage();
    float t = mix(heat(vCustom.x), heat(vCustom.y), vT);
    // heat flows downhill, from the hotter end toward the cooler, as a faint moving texture
    float dir = sign(vCustom.x - vCustom.y);
    float flow = 0.75 + 0.25 * sin((vT * vLengthPx / 18.0) * dir - time * 4.0);
    float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    vec3 c = blackbody(t * 0.8) * (0.4 + 0.8 * core) * flow * edgeHeat;
    gl_FragColor = vec4(c, cov * clamp(0.25 + t * 0.9, 0.0, 1.0));
}
`;

const QUAD = 4;

function heatOf(
    kind: Args["heatFrom"],
    i: number,
    g: { rank: Float32Array; degree: Float32Array; value: Float32Array },
): number {
    if (kind === "degree") {
        return g.degree[i];
    }
    return kind === "value" ? g.value[i] : g.rank[i];
}

export const ThermalGlow = {
    args: {
        ...graphArgs,
        edgeWidth: 1.5,
        heatFrom: "rank",
        contrast: 2,
        bloom: 0.5,
        haze: 0.8,
        shimmerSpeed: 1,
        edgeHeat: 1,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        heatFrom: { control: "select", options: SOURCES },
        contrast: range(0.3, 3),
        bloom: range(0, 2),
        haze: range(0, 2),
        shimmerSpeed: range(0, 3),
        edgeHeat: range(0, 2),
    },
    render: (args: Args) => {
        const from = args.heatFrom;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#050406",
            uniforms: {
                contrast: args.contrast,
                bloom: args.bloom,
                haze: args.haze,
                shimmerSpeed: args.shimmerSpeed,
                edgeHeat: args.edgeHeat,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, custom: (i, g) => [heatOf(from, i, g), 0, 0, 0] },
            edgeLayer: {
                fragment: EDGE_FRAGMENT,
                blend: "add",
                custom: (e, g) => [heatOf(from, g.src[e], g), heatOf(from, g.dst[e], g), 0, 0],
            },
            rebuildOn: [from],
            setup: (ctx) => {
                addNodeOverlay(ctx, {
                    name: "haze",
                    fragment: `const float QUAD = ${QUAD.toFixed(1)};\n${HAZE_FRAGMENT}`,
                    quadScale: QUAD,
                });
            },
        });
    },
};

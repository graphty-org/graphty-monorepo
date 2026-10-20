/**
 * Rising embers: the hottest nodes shed sparks. Each top node smolders like a coal -- dark crust,
 * glowing cracks -- and throws off embers that drift upward on a wavering draft, cool from yellow
 * to red and wink out. How many sparks and how fast they rise follow the node's heat, so the
 * important nodes are the ones on fire. Only the hottest `topShare` of the nodes burn at all.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Rising Embers", ...labMeta };

const SOURCES = ["rank", "degree", "value"] as const;

interface Args extends GraphArgs {
    heatFrom: (typeof SOURCES)[number];
    topShare: number;
    sparks: number;
    riseSpeed: number;
    height: number;
    drift: number;
    sparkSize: number;
    coalGlow: number;
}

// heat 0..1 in nodeCustom.x, and "how far above the threshold" in nodeCustom.y
const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float h = vCustom.y;
    vec3 base = vColor.rgb * (0.25 + 0.75 * max(dot(n, normalize(vec3(-0.45, 0.6, -0.65))), 0.0));
    if (h <= 0.0) {
        gl_FragColor = vec4(mix(base * 0.8, vec3(1.0), 0.35 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0)), 1.0);
        return;
    }
    // a coal: Voronoi cells of dark crust with glowing seams that pulse
    vec2 v = voronoi(n.xy / (1.2 - n.z * 0.5) * 3.5 + vInfo.x * 11.0);
    float seam = 1.0 - smoothstep(0.0, 0.12, v.y - v.x);
    float pulse = 0.75 + 0.25 * sin(time * 3.0 + vInfo.x * 40.0 + noise(n.xy * 4.0 + time) * 4.0);
    float glow = clamp(seam * pulse + 0.35 * (-n.z) * h, 0.0, 1.0) * coalGlow;
    vec3 crust = mix(base * 0.35, vec3(0.08, 0.05, 0.04), h * 0.7);
    vec3 c = crust + blackbody(0.25 + 0.6 * h * glow) * glow * (0.6 + 0.8 * h);
    c = mix(c, vec3(1.0), 0.3 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const OV_HOOKS = `
#define OV_SCALE
float ovScale() { return nodeCustom.y > 0.0 ? 1.0 : 0.0; }
`;

// Quad spans +-QUAD node radii; sparks rise from the node's top toward +y (screen up).
const SPARK_FRAGMENT = `
void main() {
    float h = vCustom.y;
    vec2 p = vUV;
    vec3 col = vec3(0.0);
    float count = 4.0 + sparks * h;
    float sp = riseSpeed * (0.5 + 0.8 * h);
    for (int i = 0; i < 40; i++) {
        float fi = float(i);
        if (fi >= count) break;
        float s1 = hash11(fi * 1.37 + vInfo.x * 91.0);
        float s2 = hash11(fi * 7.91 + vInfo.x * 13.0);
        float s3 = hash11(fi * 3.17 + vInfo.x * 47.0);
        float life = fract(time * sp * (0.6 + 0.6 * s1) / height + s2);
        float y = 0.4 + life * height * (0.7 + 0.5 * s3);
        // born somewhere over the coal, then carried by a wavering draft
        float x0 = (s1 - 0.5) * 1.4;
        float x = x0 + (noise(vec2(y * 0.8 + fi, time * 0.7 + s3 * 10.0)) - 0.5) * drift * life * 2.5;
        float d = length(p - vec2(x, y));
        float sz = sparkSize * (1.0 - 0.6 * life) * (0.6 + 0.6 * s3);
        float twinkle = 0.6 + 0.4 * sin(time * 25.0 * (0.5 + s2) + fi);
        float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.55 + 0.35 * s1, 1.0, life));
        float core = exp(-d * d / (sz * sz));
        float halo = exp(-d * d / (sz * sz * 10.0)) * 0.3;
        col += blackbody(1.0 - life * 0.85) * (core * 1.6 + halo) * fade * twinkle;
    }
    // warm glow just above the coal
    float r = length(p);
    col += blackbody(0.45) * exp(-max(r - 0.95, 0.0) * 3.0) * smoothstep(0.85, 1.05, r) * 0.6 * h * coalGlow;
    col *= smoothstep(QUAD, QUAD * 0.75, max(abs(p.x), abs(p.y)));
    if (max(col.r, max(col.g, col.b)) < 0.003) discard;
    gl_FragColor = vec4(col, 1.0);
}
`;

const QUAD = 6;

function heatOf(
    kind: Args["heatFrom"],
    i: number,
    g: { rank: Float32Array; degree: Float32Array; value: Float32Array },
): number {
    if (kind === "degree") {
        return g.degree[i];
    }
    return kind === "value" ? g.value[i] : Math.sqrt(g.rank[i]);
}

// the heat above which a node burns (the top `share` of nodes), and the hottest heat; cached per graph
const cuts = new WeakMap<object, Map<string, [number, number]>>();
function burnRange(
    kind: Args["heatFrom"],
    share: number,
    g: Parameters<typeof heatOf>[2] & { n: number },
): [number, number] {
    const key = `${kind}/${share}`;
    let m = cuts.get(g);
    if (!m) {
        m = new Map();
        cuts.set(g, m);
    }
    let r = m.get(key);
    if (!r) {
        const hs = Array.from({ length: g.n }, (_, i) => heatOf(kind, i, g)).sort((a, b) => b - a);
        const k = Math.floor(share * g.n);
        r = [k > 0 ? hs[k] : Infinity, hs[0]];
        m.set(key, r);
    }
    return r;
}

export const RisingEmbers = {
    args: {
        ...graphArgs,
        edgeWidth: 1,
        heatFrom: "rank",
        topShare: 0.1,
        sparks: 24,
        riseSpeed: 1.6,
        height: 4.5,
        drift: 0.7,
        sparkSize: 0.16,
        coalGlow: 1,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        heatFrom: { control: "select", options: SOURCES },
        topShare: range(0, 0.5),
        sparks: range(0, 36, 1),
        riseSpeed: range(0, 5),
        height: range(1, 5.5),
        drift: range(0, 2),
        sparkSize: range(0.03, 0.3),
        coalGlow: range(0, 2),
    },
    render: (args: Args) => {
        const from = args.heatFrom;
        const share = args.topShare;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#08070a",
            uniforms: {
                sparks: args.sparks,
                riseSpeed: args.riseSpeed,
                height: args.height,
                drift: args.drift,
                sparkSize: args.sparkSize,
                coalGlow: args.coalGlow,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                custom: (i, g) => {
                    const [cut, max] = burnRange(from, share, g);
                    const h = heatOf(from, i, g);
                    return [h, h > cut ? Math.max(0.05, (h - cut) / Math.max(max - cut, 1e-6)) : 0, 0, 0];
                },
            },
            rebuildOn: [from, share],
            setup: (ctx) => {
                addNodeOverlay(ctx, {
                    name: "embers",
                    fragment: `const float QUAD = ${QUAD.toFixed(1)};\n${SPARK_FRAGMENT}`,
                    quadScale: QUAD,
                    vertexHooks: OV_HOOKS,
                    lift: 1.1,
                });
            },
        });
    },
};

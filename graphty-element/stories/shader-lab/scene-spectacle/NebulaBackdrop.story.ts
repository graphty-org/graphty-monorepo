/**
 * Nebula and starfield backdrop: a full-screen quad drawn first, behind everything, that turns
 * each pixel into a view direction and paints domain-warped fbm gas (three warps deep) and three
 * layers of hashed, twinkling stars that drift at different speeds. Near the on-screen center
 * of each of the biggest communities the gas takes that community's color, so the sky glows
 * around the clusters.
 */
import { communityColor, type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { toScreen } from "./common";

export default {
    title: "Shader Lab/Scene render targets, backdrops and transitions/Nebula Backdrop",
    ...labMeta,
};

interface Args extends GraphArgs {
    gasA: string;
    gasB: string;
    gasC: string;
    density: number;
    warp: number;
    drift: number;
    stars: number;
    twinkle: number;
    communityTint: number;
}

const TINTS = 4;
const tintNames = Array.from({ length: TINTS }, (_, k) => `tint${k}`);
const tintColors = Array.from({ length: TINTS }, (_, k) => `tintColor${k}`);

const BG_VERTEX = `
void main() {
    vNdc = position.xy;
    gl_Position = vec4(position.xy, 0.99999, 1.0);
}
`;

const tintSum = tintNames
    .map(
        (
            t,
            k,
        ) => `    { vec2 d = (vNdc - ${t}.xy) * vec2(resolution.x / resolution.y, 1.0); float w = ${t}.w * exp(-dot(d, d) / max(${t}.z * ${t}.z, 1e-4));
      tint += ${tintColors[k]} * w; tw += w; }`,
    )
    .join("\n");

const BG_FRAGMENT = `
vec3 worldDir() {
    vec3 d = normalize(vec3(vNdc.x / projection[0][0], vNdc.y / projection[1][1], 1.0));
    return normalize(vec3(dot(view[0].xyz, d), dot(view[1].xyz, d), dot(view[2].xyz, d)));
}

float starLayer(vec3 dir, float cells, float seed, float spin) {
    vec3 p = dir;
    p.xz = rot2(time * spin) * p.xz;
    p *= cells;
    vec3 id = floor(p);
    vec3 h = hash33(id + seed);
    vec3 f = fract(p) - (0.15 + 0.7 * h);
    float present = step(1.0 - 0.35 * stars, h.x);
    float size = fwidth(p.x) * (0.8 + 1.8 * h.y * h.y);
    float core = exp(-dot(f, f) / max(size * size, 1e-6));
    float tw = 1.0 - twinkle * 0.5 * (1.0 + sin(time * (2.0 + 5.0 * h.z) + h.y * TAU));
    return present * core * (0.4 + 1.6 * h.y * h.y) * tw;
}

void main() {
    vec3 dir = worldDir();
    vec3 p = dir * 2.2;
    float t = time * drift * 0.05;
    // three-deep domain warp (Inigo Quilez, "warp")
    vec3 q = vec3(fbm(p + vec3(0.0, t, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8 - t)), fbm(p + vec3(1.7, 9.2, t)));
#if LAB_QUALITY == 0
    vec3 r = q;   // low quality: two levels of warp instead of three
#else
    vec3 r = vec3(fbm(p + warp * 4.0 * q + vec3(1.7, 9.2, 0.0)), fbm(p + warp * 4.0 * q + vec3(8.3, 2.8, 0.0)), 0.0);
#endif
    float f = fbm(p + warp * 4.0 * r + t);
    vec3 gas = mix(gasA, gasB, clamp(f * f * 3.0, 0.0, 1.0));
    gas = mix(gas, gasC, clamp(length(q) * 0.9 - 0.3, 0.0, 1.0));
    gas = mix(gas, gasB * 1.6, clamp(r.x * r.x, 0.0, 1.0) * 0.6);
    float body = smoothstep(0.25, 0.85, f * 0.6 + r.y * 0.6);
    // dark dust lanes
    float dust = smoothstep(0.45, 0.75, fbm(p * 2.7 + 3.0 * q));
    vec3 tint = vec3(0.0); float tw = 0.0;
${tintSum}
    if (tw > 0.0) gas = mix(gas, tint / tw * 1.4, clamp(tw, 0.0, 1.0) * communityTint);
    vec3 c = gas * body * density * (1.0 - 0.7 * dust);
    c += gas * 0.08 * density;
    // stars: far, middle and near layers drift at different speeds
    float s = starLayer(dir, 140.0, 1.0, 0.002) + starLayer(dir, 70.0, 7.0, 0.005) * 1.2 + starLayer(dir, 32.0, 13.0, 0.01) * 1.5;
    vec3 starCol = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash13(floor(dir * 70.0)));
    c += starCol * s * (1.0 - 0.6 * dust * body);
    gl_FragColor = vec4(c, 1.0);
}
`;

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.3, 0.5, -0.8))), 0.0);
    float rim = pow(1.0 - abs(n.z), 2.5);
    vec3 c = vColor.rgb * (0.35 + 0.75 * diff) + vColor.rgb * rim * 0.9 + vec3(0.6) * pow(diff, 30.0);
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * 1.3;
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.55);
}
`;

export const NebulaBackdrop = {
    args: {
        ...graphArgs,
        gasA: "#2a0f4a",
        gasB: "#d0407a",
        gasC: "#1f6fa8",
        density: 0.8,
        warp: 1,
        drift: 1,
        stars: 0.6,
        twinkle: 0.6,
        communityTint: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        gasA: { control: "color" },
        gasB: { control: "color" },
        gasC: { control: "color" },
        density: range(0, 2),
        warp: range(0, 2),
        drift: range(0, 5),
        stars: range(0, 1),
        twinkle: range(0, 1),
        communityTint: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            autoRotate: true,
            uniforms: {
                gasA: args.gasA,
                gasB: args.gasB,
                gasC: args.gasC,
                density: args.density,
                warp: args.warp,
                drift: args.drift,
                stars: args.stars,
                twinkle: args.twinkle,
                communityTint: args.communityTint,
                ...Object.fromEntries(tintNames.map((t) => [t, [0, 0, 0, 0]])),
                ...Object.fromEntries(tintColors.map((t) => [t, [0, 0, 0]])),
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const bg = ctx.addInstances({
                    name: "nebula",
                    count: 1,
                    attributes: {},
                    varyings: "varying vec2 vNdc;",
                    vertex: BG_VERTEX,
                    fragment: BG_FRAGMENT,
                });
                bg.material.disableDepthWrite = true;
                bg.mesh.renderingGroupId = 0;
                bg.mesh.alphaIndex = -1;

                // the biggest communities: their centers and spreads, in world units
                const { graph } = ctx;
                const groups = new Map<number, number[]>();
                for (let i = 0; i < graph.n; i++) {
                    const list = groups.get(graph.community[i]) ?? [];
                    list.push(i);
                    groups.set(graph.community[i], list);
                }
                const top = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, TINTS);
                const centers = top.map(([c, list]) => {
                    const m = [0, 0, 0];
                    for (const i of list) {
                        for (let k = 0; k < 3; k++) {
                            m[k] += graph.pos[i * 3 + k] / list.length;
                        }
                    }
                    let spread = 0;
                    for (const i of list) {
                        spread += Math.hypot(...[0, 1, 2].map((k) => graph.pos[i * 3 + k] - m[k])) / list.length;
                    }
                    return { c, m, spread };
                });
                centers.forEach(({ c }, k) => {
                    ctx.set(tintColors[k], communityColor(c));
                });
                ctx.onFrame(() => {
                    const w = ctx.engine.getRenderWidth();
                    const h = ctx.engine.getRenderHeight();
                    centers.forEach(({ m, spread }, k) => {
                        const [sx, sy, ppw, ok] = toScreen(ctx, m[0], m[1], m[2]);
                        const radius = ((spread * 3 + 20) * ppw * 2) / h;
                        ctx.set(tintNames[k], [(sx / w) * 2 - 1, (sy / h) * 2 - 1, radius, ok]);
                    });
                });
            },
        }),
};

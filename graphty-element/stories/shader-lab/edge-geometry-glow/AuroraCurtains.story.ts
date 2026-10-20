/**
 * Aurora curtains: the graph lies on the ground at night and aurora curtains hang in the sky
 * above it. In "edges" mode a curtain rises over every long edge (short local links stay faint
 * lines on the ground); in "communities" mode one curtain hangs between each pair of community
 * centers, as bright as the number of edges joining them, so the strongest inter-community ties
 * light up the sky. Each curtain is a ribbon extruded straight up, folded and swaying with slow
 * noise, with vertical ray streaks, a sharp bright lower edge and a green-to-violet height ramp.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, edgeLength, groundGraph } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Aurora Curtains", ...labMeta };

const MODES = ["edges", "communities"] as const;

interface Args extends GraphArgs {
    mode: (typeof MODES)[number];
    minLength: number;
    lift: number;
    curtainHeight: number;
    sway: number;
    swaySpeed: number;
    rayDensity: number;
    intensity: number;
    lowColor: string;
    highColor: string;
    stars: number;
    autoRotate: boolean;
    bloom: number;
}

/** Curtain endpoints and data (brightness, random, length, -) for either mode. */
function curtains(graph: LabGraph, mode: Args["mode"]): { a: Float32Array; b: Float32Array; data: Float32Array } {
    if (mode === "edges") {
        const a = new Float32Array(graph.m * 3);
        const b = new Float32Array(graph.m * 3);
        const data = new Float32Array(graph.m * 4);
        for (let e = 0; e < graph.m; e++) {
            a.set(graph.pos.subarray(graph.src[e] * 3, graph.src[e] * 3 + 3), e * 3);
            b.set(graph.pos.subarray(graph.dst[e] * 3, graph.dst[e] * 3 + 3), e * 3);
            data.set([0.45 + 0.55 * graph.weight[e], (e * 0.618034) % 1, edgeLength(graph, e), 0], e * 4);
        }
        return { a, b, data };
    }
    const k = graph.communityCount;
    const center = new Float32Array(k * 3);
    const size = new Float32Array(k);
    for (let i = 0; i < graph.n; i++) {
        const c = graph.community[i];
        size[c]++;
        for (let d = 0; d < 3; d++) {
            center[c * 3 + d] += graph.pos[i * 3 + d];
        }
    }
    for (let c = 0; c < k; c++) {
        for (let d = 0; d < 3; d++) {
            center[c * 3 + d] /= Math.max(1, size[c]);
        }
    }
    const count = new Map<number, number>();
    for (let e = 0; e < graph.m; e++) {
        const p = graph.community[graph.src[e]];
        const q = graph.community[graph.dst[e]];
        if (p !== q) {
            const key = Math.min(p, q) * k + Math.max(p, q);
            count.set(key, (count.get(key) ?? 0) + 1);
        }
    }
    const max = Math.max(1, ...count.values());
    const pairs = [...count.entries()];
    const a = new Float32Array(pairs.length * 3);
    const b = new Float32Array(pairs.length * 3);
    const data = new Float32Array(pairs.length * 4);
    pairs.forEach(([key, n], i) => {
        const p = Math.floor(key / k);
        const q = key % k;
        a.set(center.subarray(p * 3, p * 3 + 3), i * 3);
        b.set(center.subarray(q * 3, q * 3 + 3), i * 3);
        const len = Math.hypot(center[p * 3] - center[q * 3], center[p * 3 + 2] - center[q * 3 + 2]);
        data.set([0.15 + 0.85 * Math.sqrt(n / max), (i * 0.618034) % 1, len, 1], i * 4);
    });
    return { a, b, data };
}

const CURTAIN_VARYINGS = `
varying float vT;
varying float vH;
varying float vS;
varying vec4 vCurtain;
`;

const CURTAIN_VERTEX = `
void main() {
    float t = position.x;
    float h = position.y * 0.5 + 0.5;
    vec3 d = curtainB - curtainA;
    float len = max(length(d), 1e-3);
    float on = curtainData.w > 0.5 ? 1.0 : step(minLength, len);
    vec3 side = normalize(cross(d / len, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
    float s = t * len;
    float slow = time * 0.08 * swaySpeed;
    float fold = (noise(vec2(s * 0.035 + slow, curtainData.y * 17.0)) - 0.5) * 2.0
               + 0.5 * (noise(vec2(s * 0.09 - slow * 1.7, curtainData.y * 5.0 + 3.0)) - 0.5);
    vec3 base = mix(curtainA, curtainB, t) + side * fold * sway * (8.0 + 0.12 * len) * (0.7 + 0.6 * h);
    float top = curtainHeight * (0.55 + 0.45 * curtainData.x);
    vec3 p = base + vec3(0.0, lift + h * top, 0.0);
    gl_Position = on > 0.5 ? viewProjection * vec4(p, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
    vT = t; vH = h; vS = s; vCurtain = curtainData;
}
`;

const CURTAIN_FRAGMENT = `
void main() {
    float drift = time * 0.12 * swaySpeed + vCurtain.y * 9.0;
    float rays = fbm(vec2(vS * rayDensity * 0.12 + drift, drift * 0.5));
    rays = smoothstep(0.35, 0.75, rays);
    float streak = pow(noise(vec2(vS * rayDensity * 2.5 + drift * 3.0, 0.5)), 3.0) * 2.0;
    float fine = 0.5 + 0.5 * noise(vec2(vS * rayDensity * 0.9 - time * 0.4 * swaySpeed, vCurtain.y * 3.0));
    float lower = smoothstep(0.0, 0.035, vH) * exp(-vH * 2.6) * (1.0 - smoothstep(0.45, 1.0, vH));
    float band = smoothstep(0.0, 0.02, vH) * exp(-vH * 9.0) * 1.2;
    float ends = smoothstep(0.0, 0.12, vT) * smoothstep(1.0, 0.88, vT);
    float shimmer = 0.75 + 0.5 * noise(vec2(vS * 0.25 - time * 1.6 * swaySpeed, vH * 4.0 + vCurtain.y * 11.0));
    float I = (lower * (0.15 + 1.8 * rays * fine + streak * (0.3 + rays)) + band * (0.5 + rays)) * ends * shimmer * intensity * vCurtain.x;
    vec3 col = mix(lowColor, highColor, smoothstep(0.12, 0.8, vH));
    col = mix(col, vec3(1.0, 0.35, 0.55), smoothstep(0.03, 0.0, vH) * 0.6);
    gl_FragColor = vec4(col * I, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    float a = labEdgeCoverage();
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(vec3(0.25, 0.4, 0.5), vec3(0.8, 1.0, 0.9), lit), a * (0.22 + 0.6 * lit));
}
`;

// village lights on the ground
const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float g = exp(-r * r * 5.0);
    float core = fill(r - 0.35);
    if (g + core < 0.01) discard;
    vec3 c = vec3(1.0, 0.75, 0.4) * (core + g * 0.5) * (0.85 + 0.15 * sin(time * 3.0 + vInfo.x * 30.0));
    c = mix(c, vec3(1.0), 0.6 * max(vState.x, vState.y) * core);
    gl_FragColor = vec4(c, 1.0);
}
`;

// night sky: a horizon glow and twinkling stars behind the additive curtains, then bloom
const SKY_POST = `
void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    // soft shoulder: lifts faint curtains, compresses bright overlaps (the 8-bit target still clips where many overlap)
    c *= 1.4 / (1.0 + luminance(c));
    vec2 p = vUV * resolution / pixelRatio;
    vec2 cell = floor(p / 3.0);
    float h = hash12(cell);
    float star = step(1.0 - 0.0035 * stars, h) * (0.5 + 0.5 * sin(time * (1.0 + 3.0 * fract(h * 91.0)) + h * 50.0));
    star *= 1.0 - smoothstep(1.0, 2.0, length(fract(p / 3.0) * 3.0 - 1.5));
    vec3 sky = mix(vec3(0.01, 0.025, 0.05), vec3(0.0, 0.0, 0.01), vUV.y) + vec3(0.02, 0.06, 0.05) * exp(-abs(vUV.y - 0.35) * 8.0);
    gl_FragColor = vec4(c + sky + vec3(0.85, 0.9, 1.0) * star * stars * (1.0 - min(luminance(c) * 2.0, 1.0)), 1.0);
}
`;

export const AuroraCurtains = {
    args: {
        ...graphArgs,
        nodeSize: 0.8,
        edgeWidth: 1,
        mode: "edges",
        minLength: 30,
        lift: 10,
        curtainHeight: 30,
        sway: 1.6,
        swaySpeed: 1,
        rayDensity: 1,
        intensity: 0.26,
        lowColor: "#22ff66",
        highColor: "#8a3cff",
        stars: 1,
        autoRotate: true,
        bloom: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        dim: { table: { disable: true } },
        mode: { control: "inline-radio", options: MODES },
        minLength: range(0, 120),
        lift: range(0, 40),
        curtainHeight: range(5, 80),
        sway: range(0, 3),
        swaySpeed: range(0, 4),
        rayDensity: range(0.2, 4),
        intensity: range(0, 2),
        lowColor: { control: "color" },
        highColor: { control: "color" },
        stars: range(0, 3),
        autoRotate: { control: "boolean" },
        bloom: range(0, 2),
    },
    render: (args: Args) => {
        const graph = groundGraph(args.graph, args.nodes);
        const sky = curtains(graph, args.mode);
        const count = sky.data.length / 4;
        return mountLab({
            graph,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            camera: "orbit",
            autoRotate: args.autoRotate,
            background: "#000000",
            rebuildOn: [args.mode],
            uniforms: {
                minLength: args.minLength,
                lift: args.lift,
                curtainHeight: args.curtainHeight,
                sway: args.sway,
                swaySpeed: args.swaySpeed,
                rayDensity: args.rayDensity,
                intensity: args.intensity,
                lowColor: args.lowColor,
                highColor: args.highColor,
                stars: args.stars,
                bloom: args.bloom,
                bloomThreshold: 0.5,
                bloomRadius: 18,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 2, blend: "add", size: () => 0.8 },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [SKY_POST, BLOOM_POST],
            setup: (ctx) => {
                ctx.addInstances({
                    name: "curtains",
                    count,
                    geometry: 64,
                    attributes: { curtainA: [3, sky.a], curtainB: [3, sky.b], curtainData: [4, sky.data] },
                    varyings: CURTAIN_VARYINGS,
                    vertex: CURTAIN_VERTEX,
                    fragment: CURTAIN_FRAGMENT,
                    blend: "add",
                });
            },
        });
    },
};

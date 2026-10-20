/**
 * Lightning arcs: edges strike as jagged electric bolts that re-snap to a new random path several
 * times a second, each with a white-hot core, a blue halo and short forks that split off the main
 * channel. Only a fraction of edges strike at any moment (the rest hum as faint plasma lines); the
 * edges of the hovered or selected node strike every time. The path is a piecewise-linear random
 * walk in the vertex shader, offset across the edge in the screen plane, so it reads in 2D and 3D.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, makeGraph, mountLab, range } from "../harness";
import { BLOOM_POST, PERP_GLSL } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Lightning Arcs", ...labMeta };

interface Args extends GraphArgs {
    boltColor: string;
    snapRate: number;
    activity: number;
    jaggedness: number;
    forks: number;
    forkLength: number;
    haloWidth: number;
    glow: number;
    bloom: number;
}

const FORKS_PER_EDGE = 2;

/** Every edge plus FORKS_PER_EDGE fork copies; custom = (fork flag, fork number, -, original edge). */
function withForks(base: LabGraph): { graph: LabGraph; custom: Float32Array } {
    const copies = 1 + FORKS_PER_EDGE;
    const m = base.m * copies;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const weight = new Float32Array(m);
    const custom = new Float32Array(m * 4);
    for (let e = 0; e < base.m; e++) {
        for (let k = 0; k < copies; k++) {
            const i = k * base.m + e;
            src[i] = base.src[e];
            dst[i] = base.dst[e];
            weight[i] = base.weight[e];
            custom.set([k > 0 ? 1 : 0, k, 0, e], i * 4);
        }
    }
    return { graph: { ...base, m, src, dst, weight }, custom };
}

const BOLT_GLSL = `
float snapId() { return floor(time * snapRate); }
// does original edge id strike during this snap (always when it touches the hovered or selected node)
float strikes(float id, float touch) { return max(step(hash12(vec2(snapId(), id * 1.37)), activity), touch); }
float forkOn(float id, float k) { return step(hash12(vec2(snapId() + k * 31.0, id * 2.11)), forks); }
`;

const EDGE_HOOKS = `
${PERP_GLSL}
${BOLT_GLSL}
// a jagged random walk in -1..1: three octaves of linearly interpolated noise (sharp kinks)
float jag(float t, float seed) {
    float v = 0.0; float amp = 0.62; float f = 5.0;
    for (int i = 0; i < 3; i++) {
        float x = t * f; float i0 = floor(x);
        v += amp * (mix(hash12(vec2(i0, seed)), hash12(vec2(i0 + 1.0, seed)), fract(x)) * 2.0 - 1.0);
        f *= 2.4; amp *= 0.42 + 0.2 * jaggedness; seed += 17.0;
    }
    return v;
}
vec3 bolt(vec3 a, vec3 b, float t, float seed, float amp, float pinEnd) {
    float env = pinEnd > 0.5 ? pow(sin(PI * t), 0.6) : sin(0.5 * PI * t);
    return mix(a, b, t) + screenPerp(a, b) * jag(t, seed) * amp * length(b - a) * env;
}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float id = edgeCustom.w;
    float touch = (edgeInfo.x == hoverNode || edgeInfo.y == hoverNode || edgeInfo.x == selectedNode || edgeInfo.y == selectedNode) ? 1.0 : 0.0;
    float on = strikes(id, touch);
    float amp = 0.11 * jaggedness * on;
    float seed = snapId() * 7.13 + id * 13.7;
    if (edgeCustom.x < 0.5) return bolt(a, b, t, seed, amp, 1.0);
    // fork: leaves the main channel at a random point, angled off to one side
    float k = edgeCustom.y;
    float bt = 0.15 + 0.6 * hash12(vec2(seed, k));
    vec3 start = bolt(a, b, bt, seed, amp, 1.0);
    float side = hash12(vec2(seed, k + 9.0)) < 0.5 ? -1.0 : 1.0;
    float ang = side * (0.35 + 0.6 * hash12(vec2(seed, k + 3.0)));
    vec3 dir = normalize(b - a) * cos(ang) + screenPerp(a, b) * sin(ang);
    vec3 end = start + dir * length(b - a) * forkLength * (0.5 + hash12(vec2(seed, k + 5.0)));
    return bolt(start, end, t, seed + 50.0 * k, amp * 1.4, 0.0);
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth + 6.0 * haloWidth; }
`;

const EDGE_FRAGMENT = `
${BOLT_GLSL}
void main() {
    float id = vCustom.w;
    float touch = max(abs(vTouch.x), abs(vTouch.y));
    float on = strikes(id, touch);
    float fork = vCustom.x;
    if (fork > 0.5 && (on < 0.5 || forkOn(id, vCustom.y) < 0.5)) discard;
    float px = abs(vSide) * vWidthPx * 0.5;
    float phase = fract(time * snapRate);
    float flash = exp(-phase * 3.0) * (0.75 + 0.5 * hash12(vec2(snapId(), id))) + 0.15 * hash12(vec2(floor(time * 40.0), id));
    float taper = fork > 0.5 ? pow(1.0 - vT, 0.7) : 1.0;
    float coreHalf = edgeWidth * pixelRatio * 0.5 * (fork > 0.5 ? 0.6 : 1.0) * taper;
    float core = 1.0 - smoothstep(coreHalf - 0.5, coreHalf + 0.9, px);
    float halo = exp(-px / max(haloWidth * pixelRatio * taper, 0.2)) * (1.0 - smoothstep(0.8, 1.0, abs(vSide)));
    vec3 hum = boltColor * 0.3 * core * (0.6 + 0.4 * sin(time * 9.0 + id));
    vec3 lit = (mix(boltColor, vec3(1.0), 0.75) * core + boltColor * halo * glow) * flash * taper;
    gl_FragColor = vec4(mix(hum, lit, on), 1.0);
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    float pulse = 0.5 + 0.5 * sin(time * 6.0 + vInfo.x * 40.0);
    vec3 c = mix(vec3(0.03, 0.04, 0.09), boltColor * 0.7, smoothstep(0.75, 1.0, r));
    c += vec3(1.0) * pow(max(1.0 - r * 1.6, 0.0), 2.0) * (0.4 + 0.4 * pulse);
    c = mix(c, vec3(1.0), 0.6 * vState.x + 0.4 * vState.y);
    gl_FragColor = vec4(c, a);
}
`;

export const LightningArcs = {
    args: {
        ...graphArgs,
        edgeWidth: 1.25,
        boltColor: "#7fa8ff",
        snapRate: 9,
        activity: 0.12,
        jaggedness: 1,
        forks: 0.6,
        forkLength: 0.3,
        haloWidth: 3.5,
        glow: 0.6,
        bloom: 0.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        boltColor: { control: "color" },
        snapRate: range(0.5, 30, 0.5),
        activity: range(0, 1),
        jaggedness: range(0, 3),
        forks: range(0, 1),
        forkLength: range(0.05, 0.8),
        haloWidth: range(0.5, 12),
        glow: range(0, 3),
        bloom: range(0, 2),
    },
    render: (args: Args) => {
        const { graph, custom } = withForks(makeGraph(args.graph, { nodes: args.nodes, dim: args.dim }));
        return mountLab({
            graph,
            nodeSize: args.nodeSize * 0.7,
            edgeWidth: args.edgeWidth,
            background: "#03040a",
            rebuildOn: [graph.m],
            uniforms: {
                boltColor: args.boltColor,
                snapRate: args.snapRate,
                activity: args.activity,
                jaggedness: args.jaggedness,
                forks: args.forks,
                forkLength: args.forkLength,
                haloWidth: args.haloWidth,
                glow: args.glow,
                bloom: args.bloom,
                bloomThreshold: 0.75,
                bloomRadius: 16,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, size: (i, g) => 0.4 + 0.5 * Math.sqrt(g.degree[i]) },
            edgeLayer: {
                segments: 48,
                blend: "add",
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e) => Array.from(custom.subarray(e * 4, e * 4 + 4)),
            },
            post: [BLOOM_POST],
        });
    },
};

/**
 * Particle morph between layouts: every few seconds the graph switches layout (force, community
 * rings, a sphere banded by community, a PageRank spiral, a community grid). Each node shrinks
 * away into a cloud of particles that stream through curl noise and reassemble at the node's new
 * place, while the edges glide to their new ends. All the motion is in vertex shaders: the CPU
 * only writes the "from" and "to" positions once per switch and advances one uniform.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, mountLab, range } from "../harness";

export default {
    title: "Shader Lab/Scene render targets, backdrops and transitions/Particle Morph",
    ...labMeta,
};

interface Args extends GraphArgs {
    duration: number;
    hold: number;
    particles: number;
    curl: number;
    burst: number;
    stagger: number;
    particleSize: number;
    brightness: number;
}

const LAYOUT_NAMES = ["force", "community rings", "community sphere", "rank spiral", "community grid"];

/** Positions for each layout, xyz per node (z = 0 in 2D). */
function layouts(g: LabGraph): Float32Array[] {
    const flat = g.dim === 2;
    const groups: number[][] = Array.from({ length: g.communityCount }, () => []);
    for (let i = 0; i < g.n; i++) {
        groups[g.community[i]].push(i);
    }
    const rings = new Float32Array(g.n * 3);
    groups.forEach((list, c) => {
        const a0 = (c / g.communityCount) * Math.PI * 2;
        const cx = Math.cos(a0) * 38;
        const cy = Math.sin(a0) * 38;
        const r = 4 + Math.sqrt(list.length) * 1.6;
        list.forEach((i, k) => {
            const a = (k / list.length) * Math.PI * 2;
            rings.set([cx + Math.cos(a) * r, cy + Math.sin(a) * r, flat ? 0 : (g.rank[i] - 0.3) * 30], i * 3);
        });
    });
    const order = groups.flat();
    const sphere = new Float32Array(g.n * 3);
    order.forEach((i, k) => {
        const y = 1 - (2 * (k + 0.5)) / g.n;
        const rr = Math.sqrt(1 - y * y);
        const a = k * 2.39996;
        sphere.set(
            flat
                ? [Math.cos(a) * 45 * Math.sqrt((k + 0.5) / g.n), Math.sin(a) * 45 * Math.sqrt((k + 0.5) / g.n), 0]
                : [Math.cos(a) * rr * 45, y * 45, Math.sin(a) * rr * 45],
            i * 3,
        );
    });
    const spiral = new Float32Array(g.n * 3);
    Array.from({ length: g.n }, (_, i) => i)
        .sort((p, q) => g.rank[q] - g.rank[p])
        .forEach((i, k) => {
            const t = k / g.n;
            const a = t * Math.PI * 2 * 3.5;
            const r = 6 + t * 46;
            spiral.set([Math.cos(a) * r, Math.sin(a) * r, flat ? 0 : (0.5 - t) * 40], i * 3);
        });
    const grid = new Float32Array(g.n * 3);
    const cols = Math.ceil(Math.sqrt(g.n * 1.6));
    const step = 100 / cols;
    order.forEach((i, k) => {
        grid.set([((k % cols) - cols / 2) * step, (Math.floor(k / cols) - g.n / cols / 2) * step, 0], i * 3);
    });
    return [Float32Array.from(g.pos), rings, sphere, spiral, grid];
}

// each node and particle has its own start delay: the morph sweeps across the graph
const MORPH = `
float morphAt(float r) {
    float d = r * stagger;
    float u = clamp((morph - d) / max(1.0 - stagger, 1e-3), 0.0, 1.0);
    return u;
}
float ease(float u) { return u < 0.5 ? 4.0 * u * u * u : 1.0 - pow(-2.0 * u + 2.0, 3.0) / 2.0; }
`;

const NODE_HOOKS = `${MORPH}
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return mix(p, nodeCustom.xyz, ease(morphAt(nodeInfo.x))); }
#define LAB_NODE_SCALE
float labNodeScale() { float u = morphAt(nodeInfo.x); return pow(1.0 - sin(PI * u), 3.0); }
`;

const EDGE_HOOKS = `
float ease(float u) { return u < 0.5 ? 4.0 * u * u * u : 1.0 - pow(-2.0 * u + 2.0, 3.0) / 2.0; }
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float e = ease(morph);
    return mix(mix(a, edgeCustom.xyz, e), mix(b, edgeState.xyz, e), t);
}
`;

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.3, 0.6, -0.75))), 0.0);
    vec3 c = vColor.rgb * (0.3 + 0.8 * diff) + vec3(0.5) * pow(diff, 40.0) + vColor.rgb * pow(1.0 - abs(n.z), 3.0) * 0.6;
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float mid = sin(PI * morph);
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.5 * (1.0 - 0.8 * mid));
}
`;

const PARTICLE_VARYINGS = `
varying vec2 vQuad;
varying vec4 vPColor;
varying float vAlpha;
`;

const PARTICLE_VERTEX = `${MORPH}
vec3 potential(vec3 p) { return vec3(noise(p), noise(p + vec3(31.4, 17.2, 9.1)), noise(p + vec3(-12.7, 45.3, 23.9))); }
vec3 curlNoise(vec3 p) {
    const float e = 0.12;
    vec3 dx = vec3(e, 0.0, 0.0); vec3 dy = vec3(0.0, e, 0.0); vec3 dz = vec3(0.0, 0.0, e);
    vec3 x0 = potential(p - dx); vec3 x1 = potential(p + dx);
    vec3 y0 = potential(p - dy); vec3 y1 = potential(p + dy);
    vec3 z0 = potential(p - dz); vec3 z1 = potential(p + dz);
    return vec3((y1.z - y0.z) - (z1.y - z0.y), (z1.x - z0.x) - (x1.z - x0.z), (x1.y - x0.y) - (y1.x - y0.x)) / (2.0 * e);
}
void main() {
    float u = morphAt(pInfo.x * 0.85 + pInfo.y * 0.15);
    float e = ease(u);
    float spread = sin(PI * u);
    vec3 base = mix(pFrom, pTo, e);
    vec3 off = (hash33(pInfo.yzw * 97.0) - 0.5) * 2.0;
    vec3 p = base + off * nodeRadius * nodeSize * (0.6 + burst * spread * 4.0);
    vec3 flow = curlNoise(base * 0.035 + vec3(0.0, 0.0, time * 0.15) + pInfo.y * 2.0);
    if (dimFlat > 0.5) flow.z = 0.0;
    p += flow * curl * 14.0 * spread;
    vec4 vc = view * vec4(p, 1.0);
    float size = nodeRadius * particleSize * (0.35 + 0.65 * pInfo.w);
    gl_Position = projection * (vc + vec4(position.xy * size, 0.0, 0.0));
    vQuad = position.xy;
    vPColor = pColor;
    vAlpha = smoothstep(0.0, 0.25, spread);
}
`;

const PARTICLE_FRAGMENT = `
void main() {
    float r2 = dot(vQuad, vQuad);
    if (r2 > 1.0 || vAlpha <= 0.0) discard;
    float a = exp(-r2 * 4.0) * vAlpha;
    vec3 c = mix(vPColor.rgb, vec3(1.0), exp(-r2 * 16.0) * 0.6);
    gl_FragColor = vec4(c * a * brightness, a);
}
`;

let live = { duration: 2.6, hold: 1.6 };

export const ParticleMorph = {
    args: {
        ...graphArgs,
        duration: 2.6,
        hold: 1.6,
        particles: 24,
        curl: 1.4,
        burst: 1,
        stagger: 0.35,
        particleSize: 0.7,
        brightness: 1.2,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        duration: { ...range(0.5, 8), description: "seconds per morph" },
        hold: { ...range(0, 8), description: "seconds each layout is held" },
        particles: { ...range(2, 64, 1), description: "particles per node (rebuilds)" },
        curl: range(0, 3),
        burst: range(0, 3),
        stagger: range(0, 0.8),
        particleSize: range(0.1, 2),
        brightness: range(0, 3),
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#06070d",
            rebuildOn: [args.particles],
            uniforms: {
                morph: 0,
                curl: args.curl,
                burst: args.burst,
                stagger: args.stagger,
                particleSize: args.particleSize,
                brightness: args.brightness,
                dimFlat: args.dim === 2,
            },
            nodeLayer: { vertexHooks: NODE_HOOKS, fragment: NODE_FRAGMENT },
            edgeLayer: { vertexHooks: EDGE_HOOKS, fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const { graph, nodes, edges } = ctx;
                if (!nodes || !edges) {
                    return;
                }
                const all = layouts(graph);
                let from = 0;
                let to = 1;
                const per = Math.max(1, Math.min(args.particles, Math.floor(60000 / graph.n)));
                const count = graph.n * per;
                const pFrom = new Float32Array(count * 3);
                const pTo = new Float32Array(count * 3);
                const pInfo = new Float32Array(count * 4);
                const pColor = new Float32Array(count * 4);
                for (let i = 0; i < graph.n; i++) {
                    const col = nodes.buffers.nodeColor.subarray(i * 4, i * 4 + 4);
                    for (let k = 0; k < per; k++) {
                        const j = i * per + k;
                        pInfo.set([graph.random[i], Math.random(), Math.random(), Math.random()], j * 4);
                        const tint = 0.85 + Math.random() * 0.4;
                        pColor.set([col[0] * tint, col[1] * tint, col[2] * tint, 1], j * 4);
                    }
                }
                const particles = ctx.addInstances({
                    name: "particles",
                    count,
                    attributes: { pFrom: [3, pFrom], pTo: [3, pTo], pInfo: [4, pInfo], pColor: [4, pColor] },
                    varyings: PARTICLE_VARYINGS,
                    vertex: PARTICLE_VERTEX,
                    fragment: PARTICLE_FRAGMENT,
                    blend: "add",
                });
                particles.mesh.renderingGroupId = 1;

                const label = document.createElement("div");
                ctx.overlay.appendChild(label);
                const write = (): void => {
                    const a = all[from];
                    const b = all[to];
                    nodes.buffers.nodePos.set(a);
                    for (let i = 0; i < graph.n; i++) {
                        nodes.buffers.nodeCustom.set(b.subarray(i * 3, i * 3 + 3), i * 4);
                        for (let k = 0; k < per; k++) {
                            pFrom.set(a.subarray(i * 3, i * 3 + 3), (i * per + k) * 3);
                            pTo.set(b.subarray(i * 3, i * 3 + 3), (i * per + k) * 3);
                        }
                    }
                    for (let e = 0; e < graph.m; e++) {
                        const s = graph.src[e];
                        const d = graph.dst[e];
                        edges.buffers.edgeA.set(a.subarray(s * 3, s * 3 + 3), e * 3);
                        edges.buffers.edgeB.set(a.subarray(d * 3, d * 3 + 3), e * 3);
                        edges.buffers.edgeCustom.set(b.subarray(s * 3, s * 3 + 3), e * 4);
                        edges.buffers.edgeState.set(b.subarray(d * 3, d * 3 + 3), e * 4);
                    }
                    nodes.update();
                    edges.update();
                    particles.update();
                    label.textContent = `layout: ${LAYOUT_NAMES[from]} -> ${LAYOUT_NAMES[to]}`;
                };
                write();
                let clock = 0;
                ctx.onFrame((_t, dt) => {
                    clock += dt;
                    const u = Math.max(0, clock - live.hold) / live.duration;
                    if (u >= 1) {
                        from = to;
                        to = (to + 1) % all.length;
                        clock = 0;
                        ctx.set("morph", 0);
                        write();
                        return;
                    }
                    ctx.set("morph", u);
                });
            },
        });
    },
};

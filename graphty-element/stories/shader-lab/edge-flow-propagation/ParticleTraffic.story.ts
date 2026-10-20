/**
 * Wind-map particle traffic: thousands of glowing particles stream along the edges like the
 * particles of an animated wind map. Every particle is one instance whose vertex shader finds its
 * own place on its edge from the time, so the CPU never moves anything. Heavier edges carry more
 * particles, moving faster; each particle is stretched into a short streak along its direction of
 * travel and drifts sideways a little, so a busy edge reads as a river rather than a line.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabContext, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Particle Traffic", ...labMeta };

interface Args extends GraphArgs {
    perEdge: number;
    speed: number;
    particleSize: number;
    trail: number;
    spread: number;
    colorBySpeed: number;
    intensity: number;
    edgeOpacity: number;
    showNodes: boolean;
    bloom: number;
    bloomRadius: number;
}

const VARYINGS = `
varying vec2 vQ;
varying vec3 vCol;
varying float vFade;
varying float vStretch;
varying float vSpeed;
`;

const PARTICLE_VERTEX = `
void main() {
    float len = max(length(pB - pA), 1e-3);
    float t = fract(pData.x + time * speed * pData.y * 12.0 / len);
    vec4 vc = view * vec4(mix(pA, pB, t), 1.0);
    vec4 va = view * vec4(pA, 1.0);
    vec4 vb = view * vec4(pB, 1.0);
    vec2 d2 = vb.xy / max(abs(vb.z), 1e-3) - va.xy / max(abs(va.z), 1e-3);
    vec2 dir = length(d2) > 1e-6 ? normalize(d2) : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    // sideways drift, zero at both ends so particles leave and land on the nodes
    float lane = (pData.w - 0.5) * 2.0 + 0.35 * sin(time * 2.0 + pData.w * 40.0 + t * 9.0);
    // sizes are in CSS pixels: one pixel at this depth is 2 z / (P11 * height) view units
    float px = 2.0 * abs(vc.z) / (projection[1][1] * resolution.y) * pixelRatio;
    vc.xy += nrm * lane * spread * px * sin(t * PI);
    float r = particleSize * px * (0.55 + 0.6 * pData.z);
    float stretch = 1.0 + trail * pData.y;
    // the quad runs from the head (x = 1) back along the trail
    vec2 corner = dir * (position.x * stretch - (stretch - 1.0)) * r + nrm * position.y * r;
    gl_Position = projection * (vc + vec4(corner, 0.0, 0.0));
    vQ = position.xy;
    vStretch = stretch;
    vSpeed = pData.y;
    vCol = mix(pColA, pColB, t);
    vFade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.92, t);
}
`;

const PARTICLE_FRAGMENT = `
void main() {
    // distance from the front of the streak in radii: 0..2 * stretch, head center at 1
    float s = (1.0 - vQ.x) * vStretch;
    float head = s < 1.0 ? exp(-4.0 * ((s - 1.0) * (s - 1.0) + vQ.y * vQ.y)) : exp(-4.0 * vQ.y * vQ.y);
    float taper = clamp((s - 1.0) / max(2.0 * vStretch - 1.0, 1e-3), 0.0, 1.0);
    float tail = s > 1.0 ? exp(-vQ.y * vQ.y * 5.0 / max(1.0 - taper, 0.05)) * pow(1.0 - taper, 1.6) : 0.0;
    float a = max(head, tail * 0.75) * vFade;
    vec3 ramp = blackbody(0.25 + 0.55 * clamp(vSpeed / 1.6, 0.0, 1.0));
    vec3 c = mix(vCol, ramp, colorBySpeed);
    c = mix(c, vec3(1.0), head * 0.3);
    gl_FragColor = vec4(c * a * intensity, a);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    gl_FragColor = vec4(c, labEdgeCoverage() * edgeOpacity);
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    if (a <= 0.0 || showNodes < 0.5) discard;
    vec3 c = vColor.rgb * (0.25 + 0.75 * exp(-r * r * 2.0));
    c += vec3(1.0) * exp(-r * r * 10.0) * 0.35;
    c = mix(c, vec3(1.0), 0.5 * vState.x + stroke(d + 0.06, 0.05) * vState.y);
    gl_FragColor = vec4(c, a);
}
`;

function addParticles(ctx: LabContext, perEdge: number): void {
    const { graph } = ctx;
    const counts: number[] = [];
    let total = 0;
    for (let e = 0; e < graph.m; e++) {
        // traffic grows faster than linearly with weight, so busy edges stand out
        const c = Math.max(1, Math.round(perEdge * (0.15 + 0.85 * graph.weight[e] ** 1.5)));
        counts.push(c);
        total += c;
    }
    const pA = new Float32Array(total * 3);
    const pB = new Float32Array(total * 3);
    const pData = new Float32Array(total * 4);
    const pColA = new Float32Array(total * 3);
    const pColB = new Float32Array(total * 3);
    const edgeColors = ctx.edges?.buffers;
    let k = 0;
    for (let e = 0; e < graph.m; e++) {
        const s = graph.src[e];
        const d = graph.dst[e];
        const w = graph.weight[e];
        for (let j = 0; j < counts[e]; j++, k++) {
            pA.set(graph.pos.subarray(s * 3, s * 3 + 3), k * 3);
            pB.set(graph.pos.subarray(d * 3, d * 3 + 3), k * 3);
            const r1 = Math.abs(Math.sin(k * 12.9898 + 1.1) * 43758.5453) % 1;
            const r2 = Math.abs(Math.sin(k * 78.233 + 4.7) * 24634.6345) % 1;
            // evenly spaced along the edge, jittered, so a busy edge is a steady stream
            pData.set([(j + r1 * 0.8) / counts[e], (0.45 + 1.1 * w) * (0.85 + 0.3 * r2), w, r2], k * 4);
            if (edgeColors) {
                pColA.set(edgeColors.edgeColorA.subarray(e * 4, e * 4 + 3), k * 3);
                pColB.set(edgeColors.edgeColorB.subarray(e * 4, e * 4 + 3), k * 3);
            }
        }
    }
    ctx.addInstances({
        name: "particles",
        count: total,
        geometry: "quad",
        attributes: { pA: [3, pA], pB: [3, pB], pData: [4, pData], pColA: [3, pColA], pColB: [3, pColB] },
        varyings: VARYINGS,
        vertex: PARTICLE_VERTEX,
        fragment: PARTICLE_FRAGMENT,
        blend: "add",
    });
    ctx.overlay.append(`\n${total} particles`);
}

export const ParticleTraffic = {
    args: {
        ...graphArgs,
        graph: "weighted",
        dim: 2,
        edgeWidth: 1,
        nodeSize: 0.8,
        perEdge: 14,
        speed: 0.8,
        particleSize: 2.6,
        trail: 4.5,
        spread: 3,
        colorBySpeed: 0.65,
        intensity: 1.1,
        edgeOpacity: 0.06,
        showNodes: true,
        bloom: 1.1,
        bloomRadius: 3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        perEdge: range(1, 40, 1),
        speed: range(-3, 3),
        particleSize: range(0.5, 10),
        trail: range(0, 12),
        spread: range(0, 15),
        colorBySpeed: range(0, 1),
        intensity: range(0, 3),
        edgeOpacity: range(0, 1),
        showNodes: { control: "boolean" },
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
            background: "#02040a",
            uniforms: {
                speed: args.speed,
                particleSize: args.particleSize,
                trail: args.trail,
                spread: args.spread,
                colorBySpeed: args.colorBySpeed,
                intensity: args.intensity,
                edgeOpacity: args.edgeOpacity,
                showNodes: args.showNodes,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [BLOOM_POST],
            rebuildOn: [args.perEdge],
            setup: (ctx) => {
                addParticles(ctx, args.perEdge);
            },
        }),
};

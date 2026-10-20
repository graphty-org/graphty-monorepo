/**
 * Vines growing along edges: starting at the best-connected node, vines creep out hop by hop,
 * each stem wiggling as it grows, unfurling leaves on alternating sides just behind its growing
 * tip, and finally setting a few flowers. A node blossoms when the first vine reaches it. The
 * cycle replays, so at any moment the newest edges are still growing. Leaves and flowers are 2D
 * signed distance shapes drawn in each edge's own (along, across) pixel coordinates.
 */
import { type GraphArgs, graphArgs, graphArgTypes, hopsFrom, labMeta, makeGraph, mountLab, range } from "../harness";
import { edgeLength, PERP_GLSL } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Growing Vines", ...labMeta };

interface Args extends GraphArgs {
    growSpeed: number;
    wiggle: number;
    stemWidth: number;
    leafSize: number;
    leafSpacing: number;
    leafDensity: number;
    flowers: number;
    leafColor: string;
    flowerColor: string;
}

/** Growth schedule in "hop" units: per edge (start, flip, duration), per node arrival, and the cycle length. */
function schedule(graph: ReturnType<typeof makeGraph>): { edge: Float32Array; arrival: Float32Array; cycle: number } {
    let root = 0;
    for (let i = 1; i < graph.n; i++) {
        if (graph.degree[i] > graph.degree[root]) {
            root = i;
        }
    }
    const hops = hopsFrom(graph, root);
    let maxHop = 0;
    for (const h of hops) {
        maxHop = Math.max(maxHop, h);
    }
    const hop = Array.from(hops, (h, i) => (h >= 0 ? h : graph.random[i] * maxHop));
    const edge = new Float32Array(graph.m * 4);
    const arrival = new Float32Array(graph.n).fill(Infinity);
    arrival[root] = 0;
    let cycle = 0;
    for (let e = 0; e < graph.m; e++) {
        const s = graph.src[e];
        const d = graph.dst[e];
        const flip = hop[d] < hop[s] ? 1 : 0;
        const from = flip ? d : s;
        const to = flip ? s : d;
        const r = Math.abs(Math.sin(e * 12.9898) * 43758.5453) % 1;
        const start = hop[from] + 0.4 * r;
        const duration = 0.9 + 0.5 * ((r * 7.31) % 1);
        edge.set([start, flip, duration, edgeLength(graph, e)], e * 4);
        arrival[to] = Math.min(arrival[to], start + duration);
        if (hops[from] < 0) {
            arrival[from] = Math.min(arrival[from], start);
        }
        cycle = Math.max(cycle, start + duration);
    }
    for (let i = 0; i < graph.n; i++) {
        if (!Number.isFinite(arrival[i])) {
            arrival[i] = hop[i];
        }
    }
    return { edge, arrival, cycle: cycle + 2.5 };
}

const CLOCK = `
float growClock() { return mod(time * growSpeed, cycle); }
`;

const EDGE_HOOKS = `
${PERP_GLSL}
${CLOCK}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float len = edgeCustom.w;
    float w = sin(t * len * 0.35 + edgeData.w * 40.0) * 0.6 + sin(t * len * 0.9 + edgeData.w * 13.0) * 0.4;
    return mix(a, b, t) + screenPerp(a, b) * w * wiggle * sin(PI * t);
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return 2.0 * (leafSize * 1.15 + stemWidth + 2.0); }
`;

const EDGE_FRAGMENT = `
${CLOCK}
// a leaf of length L along +x from the origin: an ellipse-like blade, pointed at the tip
float sdLeaf(vec2 q, float L) {
    vec2 p = vec2(q.x - 0.5 * L, q.y);
    float wdt = 0.24 * L * (1.0 - 0.55 * smoothstep(0.0, 0.5 * L, p.x));
    return (length(p / vec2(0.5 * L, max(wdt, 0.01))) - 1.0) * min(0.5 * L, wdt);
}
void main() {
    float g = clamp((growClock() - vCustom.x) / vCustom.z, 0.0, 1.0);
    float tt = vCustom.y > 0.5 ? 1.0 - vT : vT;
    if (tt > g + 0.002 || g <= 0.0) discard;
    float pr = pixelRatio;
    float along = tt * vLengthPx;
    float across = vSide * vWidthPx * 0.5;
    float front = g * vLengthPx;
    // stem: tapers toward the growing tip
    float stemHalf = stemWidth * pr * 0.5 * (0.45 + 0.55 * smoothstep(0.0, 30.0 * pr, front - along)) * (1.0 - 0.3 * tt);
    float stem = fill(abs(across) - stemHalf);
    vec3 col = mix(vec3(0.16, 0.24, 0.08), vec3(0.32, 0.5, 0.16), 0.5 + 0.5 * across / max(stemHalf, 0.1));
    float alpha = stem;
    float S = leafSpacing * pr;
    float cell0 = floor(along / S);
    for (int k = -1; k <= 0; k++) {
        float cell = cell0 + float(k);
        float h = hash12(vec2(cell, vData.w * 97.0));
        float cx = (cell + 0.5) * S;
        if (h > leafDensity || cx < S || cx > vLengthPx - S) continue;
        float side = mod(cell, 2.0) < 1.0 ? 1.0 : -1.0;
        float age = front - cx;
        float grow = smoothstep(0.0, 50.0 * pr, age);
        if (grow <= 0.0) continue;
        vec2 local = vec2(along - cx, across * side - stemHalf * 0.5);
        float ang = 0.85 + 0.25 * sin(time * 1.3 + cell) * grow - (1.0 - grow) * 0.6;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 q = vec2(dot(local, dir), dot(local, vec2(-dir.y, dir.x)));
        float L = max(leafSize * pr * grow * (0.7 + 0.6 * fract(h * 13.7)), 0.5);
        float d = sdLeaf(q, L);
        float leaf = fill(d);
        // flower at the leaf tip once the vine is done
        float fl = step(fract(h * 31.1), flowers) * smoothstep(0.98, 1.0, g) * smoothstep(80.0 * pr, 160.0 * pr, age);
        vec2 fp = q - vec2(L * 1.05, 0.0);
        float fr = length(fp);
        float fa = atan(fp.y, fp.x) + h * 6.0;
        float fs = 0.38 * leafSize * pr * fl;
        float petal = fill(fr - fs * (0.55 + 0.45 * abs(cos(2.5 * fa))));
        float center = fill(fr - fs * 0.28);
        vec3 lc = mix(vec3(0.75, 0.95, 0.35), leafColor, smoothstep(0.0, 120.0 * pr, age));
        lc *= 0.75 + 0.35 * clamp(q.y / max(0.24 * L, 0.5), -1.0, 1.0);
        lc = mix(lc, lc * 0.55, stroke(q.y, 0.45 * pr) * step(0.0, q.x) * step(q.x, L * 0.9));
        col = mix(col, lc, leaf);
        alpha = max(alpha, leaf);
        vec3 pc = mix(flowerColor, vec3(1.0), 0.4 * clamp(1.0 - fr / max(fs, 0.5), 0.0, 1.0));
        col = mix(col, mix(pc, vec3(1.0, 0.85, 0.2), center), petal * step(0.001, fs));
        alpha = max(alpha, petal * step(0.001, fs));
    }
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    col = mix(col, col * 1.6 + 0.1, 0.5 * lit);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(col, alpha);
}
`;

const NODE_HOOKS = `
${CLOCK}
#define LAB_NODE_SCALE
float labNodeScale() { return 0.25 + 0.75 * smoothstep(nodeCustom.x, nodeCustom.x + 0.6, growClock()); }
`;

const NODE_FRAGMENT = `
${CLOCK}
void main() {
    float bloom = smoothstep(vCustom.x, vCustom.x + 0.6, growClock());
    float r = length(vUV);
    float a = atan(vUV.y, vUV.x) + vInfo.x * 6.0;
    float petals = r - (0.6 + 0.4 * abs(cos(2.5 * a))) * mix(0.5, 1.0, bloom);
    float cover = fill(min(petals, r - 0.5));
    if (cover <= 0.0) discard;
    vec3 bud = vec3(0.3, 0.45, 0.15);
    vec3 c = mix(bud, mix(vColor.rgb, vec3(1.0), 0.25 * (1.0 - r)), bloom);
    c = mix(c, vec3(1.0, 0.85, 0.25), fill(r - 0.28) * bloom);
    c = mix(c, vec3(1.0), 0.5 * vState.x + 0.4 * vState.y * stroke(r - 0.95, 0.06));
    gl_FragColor = vec4(c, cover);
}
`;

export const GrowingVines = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.9,
        growSpeed: 0.7,
        wiggle: 1.2,
        stemWidth: 2,
        leafSize: 9,
        leafSpacing: 11,
        leafDensity: 0.85,
        flowers: 0.12,
        leafColor: "#2f8f3a",
        flowerColor: "#ff8fc8",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        growSpeed: range(0, 3),
        wiggle: range(0, 4),
        stemWidth: range(0.5, 6),
        leafSize: range(3, 20),
        leafSpacing: range(5, 30),
        leafDensity: range(0, 1),
        flowers: range(0, 1),
        leafColor: { control: "color" },
        flowerColor: { control: "color" },
    },
    render: (args: Args) => {
        const graph = makeGraph(args.graph, { nodes: args.nodes, dim: args.dim });
        const plan = schedule(graph);
        return mountLab({
            graph,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0b130e",
            uniforms: {
                cycle: plan.cycle,
                growSpeed: args.growSpeed,
                wiggle: args.wiggle,
                stemWidth: args.stemWidth,
                leafSize: args.leafSize,
                leafSpacing: args.leafSpacing,
                leafDensity: args.leafDensity,
                flowers: args.flowers,
                leafColor: args.leafColor,
                flowerColor: args.flowerColor,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                vertexHooks: NODE_HOOKS,
                blend: "alpha",
                custom: (i) => [plan.arrival[i], 0, 0, 0],
            },
            edgeLayer: {
                segments: 40,
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e) => Array.from(plan.edge.subarray(e * 4, e * 4 + 4)),
            },
        });
    },
};

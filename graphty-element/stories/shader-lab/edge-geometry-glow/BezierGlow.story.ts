/**
 * Bezier glow curves: every edge is a quadratic Bezier bent in the screen plane, drawn as a crisp
 * anti-aliased core with an exponential neon glow around it. Width is the edge weight. Parallel
 * edges between the same two nodes bow apart like a fan instead of drawing on top of each other,
 * and a self-loop becomes a teardrop pointing away from the graph's center. A small glint rides
 * each edge from source to target, so direction reads without arrowheads. Click a node to dim
 * everything not touching it.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, makeGraph, mountLab, range } from "../harness";
import { BLOOM_POST, PERP_GLSL } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Bezier Glow", ...labMeta };

interface Args extends GraphArgs {
    curvature: number;
    fanSpread: number;
    multiEdges: number;
    selfLoops: number;
    loopSize: number;
    weightWidth: number;
    taper: number;
    glow: number;
    glowWidth: number;
    glintSpeed: number;
    bloom: number;
}

/**
 * The sample graph plus parallel edges and self-loops, and per edge (fan offset, loop flag, loop
 * angle, orientation sign) for the shader.
 */
function withMultiEdges(base: LabGraph, multi: number, loops: number): { graph: LabGraph; custom: Float32Array } {
    const src: number[] = Array.from(base.src);
    const dst: number[] = Array.from(base.dst);
    const weight: number[] = Array.from(base.weight);
    const h = (i: number, k: number): number => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    for (let e = 0; e < base.m; e++) {
        if (h(e, 1) < multi) {
            const extra = h(e, 2) < 0.4 ? 2 : 1;
            for (let k = 0; k < extra; k++) {
                const flip = h(e, 3 + k) < 0.5;
                src.push(flip ? base.dst[e] : base.src[e]);
                dst.push(flip ? base.src[e] : base.dst[e]);
                weight.push(h(e, 5 + k));
            }
        }
    }
    for (let i = 0; i < base.n; i++) {
        if (h(i, 9) < loops) {
            const count = h(i, 10) < 0.25 ? 2 : 1;
            for (let k = 0; k < count; k++) {
                src.push(i);
                dst.push(i);
                weight.push(h(i, 11 + k));
            }
        }
    }
    const m = src.length;
    // group parallel edges by their unordered pair and spread each group around zero
    const groups = new Map<string, number[]>();
    for (let e = 0; e < m; e++) {
        const key = `${Math.min(src[e], dst[e])}:${Math.max(src[e], dst[e])}`;
        const list = groups.get(key) ?? [];
        list.push(e);
        groups.set(key, list);
    }
    const custom = new Float32Array(m * 4);
    for (const list of groups.values()) {
        list.forEach((e, k) => {
            const loop = src[e] === dst[e];
            custom[e * 4] = loop ? k : k - (list.length - 1) / 2;
            custom[e * 4 + 1] = loop ? 1 : 0;
            custom[e * 4 + 2] = loop ? h(src[e], 13) * 1.2 - 0.6 : 0;
            custom[e * 4 + 3] = src[e] <= dst[e] ? 1 : -1;
        });
    }
    return {
        graph: { ...base, m, src: Uint32Array.from(src), dst: Uint32Array.from(dst), weight: Float32Array.from(weight) },
        custom,
    };
}

const WIDTH_GLSL = `
// half width of the bright core in device pixels at t
float coreHalf(float w, float t) {
    return edgeWidth * pixelRatio * (0.35 + weightWidth * w) * 0.5 * mix(1.0, 0.3, taper * t);
}
`;

const EDGE_HOOKS = `
${PERP_GLSL}
${WIDTH_GLSL}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    if (edgeCustom.y > 0.5) {
        // self-loop: a cubic teardrop in the screen plane, pointing away from the graph center
        vec3 vd = normalize(cameraPosition - a);
        vec3 u = length(a) > 1e-3 ? normalize(a) : vec3(1.0, 0.0, 0.0);
        u = u - dot(u, vd) * vd;
        u = length(u) > 1e-3 ? normalize(u) : normalize(cross(vd, vec3(0.0, 1.0, 0.0)));
        float ang = edgeCustom.z + edgeCustom.x * 1.1;
        u = u * cos(ang) + cross(vd, u) * sin(ang);
        vec3 v = cross(vd, u);
        float r = loopSize * nodeRadius * nodeSize * (1.0 + 0.45 * edgeCustom.x);
        vec3 c1 = a + r * (1.8 * u + 1.0 * v);
        vec3 c2 = a + r * (1.8 * u - 1.0 * v);
        float s = 1.0 - t;
        return s * s * s * a + 3.0 * s * s * t * c1 + 3.0 * s * t * t * c2 + t * t * t * a;
    }
    vec3 n = screenPerp(a, b) * edgeCustom.w;
    float bulge = curvature + edgeCustom.x * fanSpread;
    vec3 c = 0.5 * (a + b) + n * bulge * length(b - a);
    return mix(mix(a, c, t), mix(c, b, t), t);
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return 2.0 * coreHalf(edgeData.x, t) / pixelRatio + 6.0 * glowWidth; }
`;

const EDGE_FRAGMENT = `
${WIDTH_GLSL}
void main() {
    float px = abs(vSide) * vWidthPx * 0.5;          // pixels from the centerline
    float core = coreHalf(vData.x, vT);
    float aa = 1.0 - smoothstep(core - 0.6, core + 0.6, px);
    float halo = exp(-max(px - core, 0.0) / max(glowWidth * pixelRatio, 0.1)) * glow;
    halo *= 1.0 - smoothstep(0.85, 1.0, abs(vSide)); // fade out before the strip ends
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float head = fract(time * glintSpeed * (0.6 + vData.w) + vData.w * 7.0);
    float dt = fract(vT - head + 0.5) - 0.5;
    float glint = exp(-abs(dt) * 30.0) * step(0.001, glintSpeed);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    float focus = selectedNode < 0.0 ? 1.0 : (vInfo.w == 0.0 ? 1.4 : 0.12);
    vec3 coreColor = mix(c, vec3(1.0), 0.2 + 0.7 * glint);
    vec3 col = (coreColor * aa * (0.85 + 1.5 * glint) + c * halo * (0.6 + glint)) * (focus + lit * 0.8);
    gl_FragColor = vec4(col, 1.0);
}
`;

const NODE_FRAGMENT = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    float ring = stroke(d + 0.16, 0.12);
    float focus = selectedNode < 0.0 || vInfo.z >= 0.0 && vInfo.z <= 1.0 ? 1.0 : 0.25;
    vec3 c = vColor.rgb * 0.18 + vColor.rgb * (1.0 - length(vUV)) * 0.25;
    c = mix(c, mix(vColor.rgb, vec3(1.0), 0.35), ring) * focus;
    c = mix(c, vec3(1.0), 0.6 * vState.x + 0.5 * vState.y * ring);
    gl_FragColor = vec4(c, a);
}
`;

export const BezierGlow = {
    args: {
        ...graphArgs,
        dim: 2,
        edgeWidth: 1.5,
        curvature: 0.12,
        fanSpread: 0.22,
        multiEdges: 0.12,
        selfLoops: 0.06,
        loopSize: 2.2,
        weightWidth: 1.6,
        taper: 0.5,
        glow: 0.4,
        glowWidth: 3,
        glintSpeed: 0.35,
        bloom: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        curvature: range(-0.5, 0.5),
        fanSpread: range(0, 0.6),
        multiEdges: range(0, 0.6),
        selfLoops: range(0, 0.4),
        loopSize: range(0.5, 6),
        weightWidth: range(0, 4),
        taper: range(0, 1),
        glow: range(0, 2),
        glowWidth: range(0.5, 10),
        glintSpeed: range(0, 2),
        bloom: range(0, 2),
    },
    render: (args: Args) => {
        const base = makeGraph(args.graph, { nodes: args.nodes, dim: args.dim });
        const { graph, custom } = withMultiEdges(base, args.multiEdges, args.selfLoops);
        return mountLab({
            graph,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#05060b",
            rebuildOn: [args.multiEdges, args.selfLoops, graph.m],
            uniforms: {
                curvature: args.curvature,
                fanSpread: args.fanSpread,
                loopSize: args.loopSize,
                weightWidth: args.weightWidth,
                taper: args.taper,
                glow: args.glow,
                glowWidth: args.glowWidth,
                glintSpeed: args.glintSpeed,
                bloom: args.bloom,
                bloomThreshold: 0.7,
                bloomRadius: 14,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: {
                segments: 32,
                blend: "add",
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e) => Array.from(custom.subarray(e * 4, e * 4 + 4)),
            },
            post: [BLOOM_POST],
        });
    },
};

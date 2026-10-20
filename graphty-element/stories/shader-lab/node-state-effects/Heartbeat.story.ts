/**
 * Heartbeat: every node beats lub-dub, swelling and glowing on each beat. Its rate follows its
 * PageRank (important nodes race), its phase is its own, so the graph never beats in unison --
 * until you click a node: then its neighborhood falls into step with it, the beat spreading out
 * hop by hop, and pulses run down the edges like blood through vessels.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Heartbeat", ...labMeta };

interface Args extends GraphArgs {
    minBpm: number;
    maxBpm: number;
    swell: number;
    glow: number;
    beatColor: string;
    syncHops: number;
    syncBpm: number;
    hopDelay: number;
}

const COMMON = `
// lub-dub: a strong beat then a softer one
float beat(float x) {
    x = fract(x);
    float a = (x - 0.05) * 20.0;
    float b = (x - 0.22) * 20.0;
    return exp(-a * a) + 0.6 * exp(-b * b);
}
// the beat of node i (rank r, hop h from the selected node), seen delay beats late
float pulseFrom(float i, float r, float h, float delay) {
    if (selectedNode >= 0.0 && h >= 0.0 && h <= syncHops) {
        return beat(time * syncBpm / 60.0 + hash11(selectedNode * 0.77) - h * hopDelay - delay);
    }
    // with a node selected, everything outside its neighborhood beats faintly, so the synced part stands out
    float quiet = selectedNode >= 0.0 ? 0.25 : 1.0;
    return quiet * beat(time * mix(minBpm, maxBpm, sqrt(r)) / 60.0 + hash11(i * 0.77) - delay);
}
float nodeBeat(float i, float r, float h) { return pulseFrom(i, r, h, 0.0); }
// a pulse leaves each end of an edge on that node's beat and runs along it
float edgePulse(vec2 ends, vec2 ranks, float h, float t) {
    return max(pulseFrom(ends.x, ranks.x, h, t * 0.6), pulseFrom(ends.y, ranks.y, h, (1.0 - t) * 0.6));
}
`;

const NODE_HOOKS = `
${COMMON}
#define LAB_NODE_SCALE
float labNodeScale() { return 1.0 + swell * nodeBeat(nodeInfo.y, nodeData.y, nodeInfo.z); }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float b = nodeBeat(vInfo.y, vData.y, vInfo.z);
    vec3 c = labShade(n, vColor.rgb);
    // the beat flushes the node from the inside
    c += beatColor * b * glow * (0.35 + 0.65 * (-n.z));
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.4 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const HALO_FRAGMENT = `
${COMMON}
void main() {
    float b = nodeBeat(vInfo.y, vData.y, vInfo.z);
    float r = length(vUV);
    if (r < 0.9 || b < 0.01) discard;
    float h = exp(-(r - 1.0) * 3.5) * b * glow;
    gl_FragColor = vec4(mix(beatColor, vColor.rgb, 0.3) * h, h);
}
`;

const EDGE_HOOKS = `
${COMMON}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth * (1.0 + 2.0 * swell * edgePulse(edgeInfo.xy, edgeCustom.xy, edgeInfo.w, t)); }
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    float h = vInfo.w;
    float synced = selectedNode >= 0.0 && h >= 0.0 && h <= syncHops ? 1.0 : 0.0;
    float p = edgePulse(vInfo.xy, vCustom.xy, h, vT) * (0.45 + 0.55 * synced);
    float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    vec3 col = mix(c, vec3(1.0), 0.4 * lit) + beatColor * p * glow * (0.6 + 0.8 * core);
    gl_FragColor = vec4(col, cov * clamp(mix(0.45, 1.0, lit) + p * 0.6, 0.0, 1.0));
}
`;

export const Heartbeat = {
    args: {
        ...graphArgs,
        edgeWidth: 2,
        minBpm: 40,
        maxBpm: 150,
        swell: 0.35,
        glow: 1,
        beatColor: "#ff3355",
        syncHops: 2,
        syncBpm: 72,
        hopDelay: 0.12,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        minBpm: range(10, 120, 1),
        maxBpm: range(30, 240, 1),
        swell: range(0, 1),
        glow: range(0, 3),
        beatColor: { control: "color" },
        syncHops: range(0, 6, 1),
        syncBpm: range(20, 200, 1),
        hopDelay: range(0, 0.5),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0a0a12",
            uniforms: {
                minBpm: args.minBpm,
                maxBpm: args.maxBpm,
                swell: args.swell,
                glow: args.glow,
                beatColor: args.beatColor,
                syncHops: args.syncHops,
                syncBpm: args.syncBpm,
                hopDelay: args.hopDelay,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            // each edge carries its endpoints' ranks, so pulses leave each end at that node's rate
            edgeLayer: {
                fragment: EDGE_FRAGMENT,
                vertexHooks: EDGE_HOOKS,
                custom: (e, g) => [g.rank[g.src[e]], g.rank[g.dst[e]], 0, 0],
            },
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "halos", fragment: HALO_FRAGMENT, quadScale: 2, vertexHooks: NODE_HOOKS });
            },
        }),
};

/**
 * Shortest-path fuse: a burning spark runs along a weighted shortest path (Dijkstra, from
 * @graphty/algorithms) from the clicked node to the node farthest from it, like a lit fuse. Behind
 * the spark the path smolders as flickering embers that cool to a dull red; ahead of it the path is
 * an unlit cord. In cascade mode the fire spreads through the whole shortest-path tree at once, so
 * you watch it race down cheap edges and crawl along expensive ones. Edges off the path keep their
 * plain look. Heavy edges are cheap to cross (cost = 1.2 - weight).
 */
import { dijkstra } from "@graphty/algorithms";
import { fromEdgeArrays } from "@graphty/graph-format";

import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, onSelection } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Path Fuse", ...labMeta };

interface Args extends GraphArgs {
    cascade: boolean;
    burnSeconds: number;
    hold: number;
    sparkSize: number;
    crackle: number;
    emberHeat: number;
    cooling: number;
    cordColor: string;
    offPathOpacity: number;
    pathWidth: number;
    bloom: number;
    bloomRadius: number;
}

// The burn front in 0..1 of the whole path (or tree); loops after burnSeconds + hold.
const FUSE = `
float burnFront() {
    float age = mod(time - selectTime, burnSeconds + hold);
    return age / burnSeconds;
}
`;

// path edges are drawn wider than the rest
const EDGE_HOOKS = `
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeState.x < 0.0 ? edgeWidth : edgeWidth * pathWidth; }
`;

const EDGE_FRAGMENT = `
${FUSE}
void main() {
    float cov = labEdgeCoverage();
    vec3 base = mix(vColorA.rgb, vColorB.rgb, vT);
    // vState.xy = burn time (0..1) at the source and target end, -1 when off the path
    if (vState.x < 0.0) {
        gl_FragColor = vec4(base * 0.7, cov * offPathOpacity);
        return;
    }
    float tb = mix(vState.x, vState.y, vT);
    float span = max(abs(vState.y - vState.x), 1e-4);
    // pixels between this fragment and the spark, positive once burned
    float px = (burnFront() - tb) / span * vLengthPx;
    float along = vT * vLengthPx;
    float sp = sparkSize * pixelRatio;
    float flick = noise(vec2(along * 0.08, time * 18.0));
    float spark = exp(-abs(px) / sp) * (0.7 + 0.6 * flick);
    // crackling sparks thrown sideways just behind the head
    float jets = step(0.86 - 0.1 * crackle, noise(vec2(along * 0.35 - time * 40.0, vSide * 3.0 + time * 25.0)));
    spark += jets * crackle * exp(-max(px, 0.0) / (sp * 4.0)) * step(-sp, px);
    vec3 col;
    float a = 1.0;
    if (px < 0.0) {
        // the unlit cord: a braided pattern
        float braid = 0.6 + 0.4 * sin(along * 0.7 + vSide * 2.5);
        col = cordColor * braid;
    } else {
        // embers: hot behind the spark, cooling over time, flickering in patches
        float heat = exp(-px / max(cooling * 200.0 * pixelRatio, 1.0));
        float patchy = fbm(vec2(along * 0.06, vSide * 1.5 + time * 0.8) + time * 0.3);
        float glow = emberHeat * (0.25 + heat) * (0.35 + 0.9 * patchy);
        col = blackbody(clamp(glow * 0.75, 0.0, 1.0)) * (0.3 + glow);
    }
    col += vec3(1.0, 0.85, 0.5) * spark * 2.2;
    gl_FragColor = vec4(col, cov * a);
}
`;

const NODE_FRAGMENT = `
${FUSE}
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    // vState.z = burn time of this node (-1 off the path), vState.w = 1 for the end of the fuse
    float tb = vState.z;
    vec3 c = vColor.rgb * 0.75;
    vec3 add = vec3(0.0);
    if (tb >= 0.0) {
        float x = burnFront() - tb;
        if (x >= 0.0) {
            float heat = exp(-x * 3.0 / max(cooling, 0.05));
            c = blackbody(0.35 + 0.6 * heat) * (0.8 + 0.6 * heat);
            // a flash and a ring when the flame reaches the node
            float ring = exp(-pow((r - 1.0 - x * 12.0) * 5.0, 2.0)) * exp(-x * 10.0);
            add += vec3(1.0, 0.7, 0.3) * ring * 2.0;
        } else {
            c = mix(c, cordColor, 0.6);
        }
        if (vState.w > 0.5 && x < 0.0) {
            // the target: a pulsing warning ring
            add += vec3(1.0, 0.4, 0.1) * stroke(r - 1.5 - 0.15 * sin(time * 6.0), 0.08);
        }
    }
    c = mix(c, vec3(1.0), 0.45 * vState.x + stroke(d + 0.08, 0.06) * vState.y);
    vec3 col = c * a + add;
    float alpha = max(a, min(1.0, length(add)));
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
}
`;

/** Dijkstra over the lab graph, with heavy edges cheap: cost = 1.2 - weight. */
function shortestPaths(
    graph: LabGraph,
    source: number,
): { dist: ArrayLike<number>; pathEdges: (t: number) => ArrayLike<number> } {
    const weights = new Float64Array(graph.m);
    for (let e = 0; e < graph.m; e++) {
        weights[e] = 1.2 - graph.weight[e];
    }
    const snapshot = fromEdgeArrays({
        directed: false,
        nodeCount: graph.n,
        src: new Uint32Array(graph.src),
        dst: new Uint32Array(graph.dst),
        weights,
    });
    const result = dijkstra(snapshot, source);
    return { dist: result.dist, pathEdges: (t) => result.pathEdges(t) };
}

export const PathFuse = {
    args: {
        ...graphArgs,
        graph: "weighted",
        dim: 2,
        nodeSize: 1,
        edgeWidth: 3,
        cascade: false,
        burnSeconds: 6,
        hold: 2.5,
        sparkSize: 5,
        crackle: 0.6,
        emberHeat: 0.9,
        cooling: 1,
        cordColor: "#7a6a52",
        offPathOpacity: 0.2,
        pathWidth: 2,
        bloom: 0.9,
        bloomRadius: 4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        cascade: { control: "boolean" },
        burnSeconds: range(1, 30, 0.5),
        hold: range(0, 10, 0.5),
        sparkSize: range(1, 20),
        crackle: range(0, 1),
        emberHeat: range(0, 2),
        cooling: range(0.05, 4),
        cordColor: { control: "color" },
        offPathOpacity: range(0, 1),
        pathWidth: range(1, 6),
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
            background: "#060406",
            uniforms: {
                burnSeconds: args.burnSeconds,
                hold: args.hold,
                sparkSize: args.sparkSize,
                crackle: args.crackle,
                emberHeat: args.emberHeat,
                cooling: args.cooling,
                cordColor: args.cordColor,
                offPathOpacity: args.offPathOpacity,
                pathWidth: args.pathWidth,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 3, blend: "alpha" },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
            post: [BLOOM_POST],
            rebuildOn: [args.cascade],
            setup: (ctx) => {
                const { graph, edges, nodes } = ctx;
                if (!edges || !nodes) {
                    return;
                }
                const write = (source: number): void => {
                    const es = edges.buffers.edgeState;
                    const ns = nodes.buffers.nodeState;
                    for (let e = 0; e < graph.m; e++) {
                        es[e * 4] = es[e * 4 + 1] = -1;
                    }
                    for (let i = 0; i < graph.n; i++) {
                        ns[i * 4 + 2] = -1;
                        ns[i * 4 + 3] = 0;
                    }
                    if (source >= 0) {
                        const { dist, pathEdges } = shortestPaths(graph, source);
                        let far = source;
                        for (let i = 0; i < graph.n; i++) {
                            if (Number.isFinite(dist[i]) && dist[i] > dist[far]) {
                                far = i;
                            }
                        }
                        const maxD = Math.max(dist[far], 1e-6);
                        // cascade: every node's last path edge forms the shortest-path tree
                        const targets = args.cascade ? Array.from({ length: graph.n }, (_, i) => i) : [far];
                        const pathNodes = new Set<number>([source]);
                        for (const t of targets) {
                            const pe = Number.isFinite(dist[t]) && t !== source ? pathEdges(t) : [];
                            const list = args.cascade ? Array.from(pe).slice(-1) : Array.from(pe);
                            for (const e of list) {
                                es[e * 4] = dist[graph.src[e]] / maxD;
                                es[e * 4 + 1] = dist[graph.dst[e]] / maxD;
                                pathNodes.add(graph.src[e]).add(graph.dst[e]);
                            }
                        }
                        for (const i of pathNodes) {
                            ns[i * 4 + 2] = dist[i] / maxD;
                        }
                        ns[far * 4 + 3] = 1;
                    }
                    edges.update("edgeState");
                    nodes.update("nodeState");
                };
                // start from the node farthest from the middle, so the fuse crosses the graph
                let start = 0;
                for (let i = 1; i < graph.n; i++) {
                    if (
                        Math.hypot(graph.pos[i * 3], graph.pos[i * 3 + 1]) >
                        Math.hypot(graph.pos[start * 3], graph.pos[start * 3 + 1])
                    ) {
                        start = i;
                    }
                }
                onSelection(ctx, write, start);
            },
        }),
};

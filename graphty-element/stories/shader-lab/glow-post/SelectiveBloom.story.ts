/**
 * Selective importance bloom: the graph is drawn calm and matte, and only what matters glows --
 * nodes whose PageRank (or degree) is above a threshold, and the active path. With nothing
 * selected the path runs from the top hub to the node farthest from it; click a node and it runs
 * from that node to the top hub, with a pulse of light traveling along it.
 *
 * How: the same node and edge meshes are drawn a second time into an off-screen "emissive mask"
 * texture, where every unimportant pixel is black. Only the mask is blurred (a five-level mip
 * chain), and the blur is added onto the normal picture. So the glow never depends on how bright
 * a node's ordinary color happens to be.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, mountLab, range } from "../harness";
import { addBloom, liveArgs, offscreen } from "./common";

export default { title: "Shader Lab/Glow Bloom And Post/Selective Bloom", ...labMeta };

const IMPORTANCE = ["rank", "degree"] as const;

interface Args extends GraphArgs {
    importance: (typeof IMPORTANCE)[number];
    threshold: number;
    intensity: number;
    radius: number;
    pathGlow: number;
    pulseSpeed: number;
    dimOthers: number;
    glowColor: string;
}

// nodeCustom.x = importance 0..1, nodeCustom.y = on the active path (set at run time)
const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float lit = 0.35 + 0.65 * max(dot(n, normalize(vec3(-0.4, 0.6, -0.7))), 0.0);
    float hot = step(threshold, vCustom.x);
    vec3 base = mix(vec3(luminance(vColor.rgb)), vColor.rgb, 0.55);
    vec3 c = base * lit * mix(1.0, 1.0 - dimOthers, 1.0 - max(hot, vCustom.y));
    c = mix(c, mix(glowColor, vec3(1.0), 0.6) * lit, max(hot, vCustom.y) * 0.75);
    c = mix(c, vec3(1.0), 0.4 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

// What glows: important nodes in the glow color (brighter the more important), path nodes white.
const NODE_MASK = `
void main() {
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    float hot = smoothstep(threshold, min(threshold + 0.25, 1.0), vCustom.x) * step(threshold, vCustom.x);
    vec3 c = glowColor * hot * (0.5 + 0.8 * vCustom.x) + vec3(1.0, 0.95, 0.85) * vCustom.y * pathGlow;
    c *= 0.6 + 0.4 * sqrt(1.0 - r2);
    gl_FragColor = vec4(c, 1.0);
}
`;

// edgeCustom.x = on the active path, edgeCustom.y = 1 when the path runs target to source
const EDGE_FRAGMENT = `
void main() {
    float onPath = vCustom.x;
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * 0.6;
    c = mix(c, vec3(1.0, 0.95, 0.85), onPath);
    float a = labEdgeCoverage() * mix(0.35 * (1.0 - dimOthers * 0.6), 1.0, onPath);
    gl_FragColor = vec4(c, a);
}
`;

const EDGE_MASK = `
void main() {
    if (vCustom.x < 0.5 || abs(vSide) > 1.0) discard;
    float t = vCustom.y > 0.5 ? 1.0 - vT : vT;
    // the pulse: a bright packet moving source to target, edge by edge along the path
    float along = vCustom.z + t;
    float pulse = pow(0.5 + 0.5 * cos(TAU * (along * 0.35 - time * pulseSpeed * 0.5)), 12.0);
    gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * pathGlow * (0.35 + 1.6 * pulse), 1.0);
}
`;

/** Shortest path (BFS) from a to b as node indices, or [] when unreachable. */
function bfsPath(g: LabGraph, a: number, b: number): number[] {
    const prev = new Int32Array(g.n).fill(-1);
    prev[a] = a;
    const queue = [a];
    for (let h = 0; h < queue.length && prev[b] < 0; h++) {
        for (const nb of g.neighbors[queue[h]]) {
            if (prev[nb] < 0) {
                prev[nb] = queue[h];
                queue.push(nb);
            }
        }
    }
    if (prev[b] < 0) {
        return [];
    }
    const path = [b];
    while (path[path.length - 1] !== a) {
        path.push(prev[path[path.length - 1]]);
    }
    return path.reverse();
}

function farthestFrom(g: LabGraph, a: number): number {
    const seen = new Int32Array(g.n).fill(-1);
    seen[a] = 0;
    const queue = [a];
    for (let h = 0; h < queue.length; h++) {
        for (const nb of g.neighbors[queue[h]]) {
            if (seen[nb] < 0) {
                seen[nb] = seen[queue[h]] + 1;
                queue.push(nb);
            }
        }
    }
    return queue[queue.length - 1];
}

const DEFAULTS: Args = {
    ...graphArgs,
    graph: "weighted",
    edgeWidth: 1.5,
    importance: "rank",
    threshold: 0.45,
    intensity: 1.6,
    radius: 0.9,
    pathGlow: 1,
    pulseSpeed: 1,
    dimOthers: 0.45,
    glowColor: "#ffb347",
};
const live = liveArgs(DEFAULTS);

export const SelectiveBloom = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        importance: { control: "select", options: IMPORTANCE },
        threshold: range(0, 1),
        intensity: range(0, 4),
        radius: range(0, 1.5),
        pathGlow: range(0, 2),
        pulseSpeed: range(0, 3),
        dimOthers: range(0, 0.9),
        glowColor: { control: "color" },
    },
    render: (args: Args) => {
        live.update(args);
        const by = args.importance;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#07080d",
            uniforms: {
                threshold: args.threshold,
                pathGlow: args.pathGlow,
                pulseSpeed: args.pulseSpeed,
                dimOthers: args.dimOthers,
                glowColor: args.glowColor,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                custom: (i, g) => [by === "degree" ? g.degree[i] : g.rank[i], 0, 0, 0],
            },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const { graph: g, nodes, edges } = ctx;
                if (!nodes || !edges) {
                    return;
                }
                const mask = offscreen(
                    ctx,
                    [
                        [edges, EDGE_FRAGMENT, EDGE_MASK],
                        [nodes, NODE_FRAGMENT, NODE_MASK],
                    ],
                    { ratio: 0.5 },
                );
                addBloom(
                    ctx,
                    () => ({ threshold: 0, intensity: live.current.intensity, radius: live.current.radius }),
                    () => mask,
                );

                const edgeOf = new Map<number, number>();
                for (let e = 0; e < g.m; e++) {
                    edgeOf.set(g.src[e] * g.n + g.dst[e], e);
                    edgeOf.set(g.dst[e] * g.n + g.src[e], e);
                }
                let hub = 0;
                for (let i = 1; i < g.n; i++) {
                    if (g.rank[i] > g.rank[hub]) {
                        hub = i;
                    }
                }
                const showPath = (path: number[]): void => {
                    nodes.buffers.nodeCustom.forEach((_v, k) => {
                        if (k % 4 === 1) {
                            nodes.buffers.nodeCustom[k] = 0;
                        }
                    });
                    edges.buffers.edgeCustom.fill(0);
                    path.forEach((v, k) => {
                        nodes.buffers.nodeCustom[v * 4 + 1] = 1;
                        if (k > 0) {
                            const e = edgeOf.get(path[k - 1] * g.n + v);
                            if (e !== undefined) {
                                const reversed = g.src[e] === v ? 1 : 0;
                                edges.buffers.edgeCustom.set([1, reversed, k - 1, 0], e * 4);
                            }
                        }
                    });
                    nodes.update("nodeCustom");
                    edges.update("edgeCustom");
                };
                let shownFor = -2;
                ctx.onFrame(() => {
                    let sel = -1;
                    const st = nodes.buffers.nodeState;
                    for (let i = 0; i < g.n; i++) {
                        if (st[i * 4 + 1] > 0.5) {
                            sel = i;
                            break;
                        }
                    }
                    if (sel !== shownFor) {
                        shownFor = sel;
                        showPath(sel >= 0 ? bfsPath(g, sel, hub) : bfsPath(g, hub, farthestFrom(g, hub)));
                    }
                });
            },
        });
    },
};

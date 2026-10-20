/**
 * Jelly wobble: nodes are soft. While the layout moves them they stretch along their direction of
 * travel and squash across it, and when they stop they jiggle like jelly until the energy dies away.
 * The motion here is a stand-in for a running layout: every few seconds each node springs between
 * its layout position and an exploded one, each a moment after the last. The CPU integrates the
 * springs and uploads velocity and "jiggle" per node; the shader does the squash and the wobble.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Jelly Wobble", ...labMeta };

interface Args extends GraphArgs {
    stretch: number;
    wobble: number;
    lobes: number;
    stiffness: number;
    damping: number;
    explode: number;
    period: number;
    gloss: number;
}

// The harness node vertex shader, plus a stretch along the on-screen velocity (nodeCustom.xyz).
const NODE_VERTEX = `
void main() {
    float radius = nodeRadius * nodeSize * nodeInfo.w;
    vec4 vc = view * vec4(nodePos, 1.0);
    vec2 v = (view * vec4(nodeCustom.xyz, 0.0)).xy;
    float speed = length(v) / max(radius, 1e-3);
    vec2 dir = speed > 1e-4 ? normalize(v) : vec2(1.0, 0.0);
    // stretch along travel, squash across it, volume kept: a * b = 1
    float s = 1.0 + stretch * min(speed * 0.08, 1.2);
    vec2 corner = position.xy * quadScale;
    vec2 along = dir * dot(corner, dir);
    vec2 across = corner - along;
    vec2 shaped = along * s + across / sqrt(s);
    gl_Position = projection * (vc + vec4(shaped * radius, 0.0, 0.0));
    vec4 cc = projection * vc;
    vUV = corner;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo; vState = nodeState; vCustom = nodeCustom;
    vCenterView = vc.xyz; vCenterWorld = nodePos; vRadius = radius;
    vPixelRadius = radius * projection[1][1] * resolution.y * 0.5 / max(cc.w, 1e-4);
}
`;

const NODE_FRAGMENT = `
void main() {
    float ang = atan(vUV.y, vUV.x);
    float j = vCustom.w;
    // the rim ripples with lobes that travel round the node, amplitude from the jiggle energy
    float rim = 1.0 + wobble * j * (0.6 * sin(ang * lobes + time * 11.0 + vInfo.x * 30.0)
                                  + 0.4 * sin(ang * (lobes + 2.0) - time * 17.0));
    float r = length(vUV) / rim;
    float a = fill(r - 1.0);
    if (a <= 0.0) discard;
    vec3 n = vec3(vUV / rim, 0.0);
    n.z = -sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
    vec3 L = normalize(vec3(-0.5, 0.65, -0.6));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, -1.0))), 0.0), 40.0);
    float fres = pow(1.0 + n.z, 2.5);
    vec3 base = vColor.rgb;
    // jelly: bright subsurface core, darker saturated rim, wet highlight
    vec3 c = base * (0.35 + 0.65 * diff) + base * base * (1.0 - fres) * 0.6;
    c = mix(c, base * 0.45, fres * 0.6);
    c += vec3(1.0) * spec * gloss + vec3(1.0) * gloss * 0.6 * smoothstep(0.6, 0.0, length(n.xy - vec2(-0.35, 0.4))) * 0.4;
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.5 * vState.y * fres);
    gl_FragColor = vec4(c, a);
}
`;

export const JellyWobble = {
    args: {
        ...graphArgs,
        edgeWidth: 1.5,
        stretch: 1,
        wobble: 0.22,
        lobes: 3,
        stiffness: 30,
        damping: 4,
        explode: 0.45,
        period: 3,
        gloss: 0.8,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        stretch: range(0, 3),
        wobble: range(0, 0.5),
        lobes: range(2, 8, 1),
        stiffness: range(4, 120),
        damping: range(0.5, 20),
        explode: range(0, 2),
        period: range(1, 10),
        gloss: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#11131c",
            uniforms: { stretch: args.stretch, wobble: args.wobble, lobes: args.lobes, gloss: args.gloss },
            nodeLayer: { fragment: NODE_FRAGMENT, vertex: NODE_VERTEX, quadScale: 1.6 },
            rebuildOn: [args.stiffness, args.damping, args.explode, args.period],
            setup: (ctx) => {
                const { graph, nodes, edges } = ctx;
                if (!nodes) {
                    return;
                }
                const { n } = graph;
                const home = Float32Array.from(graph.pos);
                const pos = nodes.buffers.nodePos;
                const custom = nodes.buffers.nodeCustom;
                const vel = new Float32Array(n * 3);
                const flat = graph.dim === 2;
                // the exploded spot: pushed out from the center plus a random kick
                const away = new Float32Array(n * 3);
                for (let i = 0; i < n; i++) {
                    for (let k = 0; k < 3; k++) {
                        const kick = (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
                        away[i * 3 + k] =
                            flat && k === 2 ? 0 : home[i * 3 + k] * (1 + args.explode) + kick * 25 * args.explode;
                    }
                }
                const step = (t: number, h: number): void => {
                    for (let i = 0; i < n; i++) {
                        // each node changes target a little after the last, so motion rolls across the graph
                        const phase = (t / args.period + graph.random[i] * 0.35) % 2;
                        const target = phase < 1 ? home : away;
                        let acc2 = 0;
                        for (let k = 0; k < 3; k++) {
                            const j = i * 3 + k;
                            const a = args.stiffness * (target[j] - pos[j]) - args.damping * vel[j];
                            vel[j] += a * h;
                            pos[j] += vel[j] * h;
                            custom[i * 4 + k] = vel[j];
                            acc2 += a * a;
                        }
                        // jiggle energy: jumps with acceleration, rings down
                        const kick = Math.min(1, Math.sqrt(acc2) / 900);
                        custom[i * 4 + 3] = Math.max(custom[i * 4 + 3] * Math.exp(-h * 2.2), kick);
                    }
                };
                ctx.onFrame((t, dt) => {
                    // substep so the springs keep real time (and settle) on a slow frame rate
                    const total = Math.min(dt, 0.25);
                    const steps = Math.max(1, Math.ceil(total * 60));
                    for (let k = 0; k < steps; k++) {
                        step(t, total / steps);
                    }
                    nodes.update("nodePos");
                    nodes.update("nodeCustom");
                    if (edges) {
                        const ea = edges.buffers.edgeA;
                        const eb = edges.buffers.edgeB;
                        for (let e = 0; e < graph.m; e++) {
                            ea.set(pos.subarray(graph.src[e] * 3, graph.src[e] * 3 + 3), e * 3);
                            eb.set(pos.subarray(graph.dst[e] * 3, graph.dst[e] * 3 + 3), e * 3);
                        }
                        edges.update("edgeA");
                        edges.update("edgeB");
                    }
                });
            },
        }),
};

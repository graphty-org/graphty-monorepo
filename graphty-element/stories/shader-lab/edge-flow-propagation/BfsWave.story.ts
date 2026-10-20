/**
 * Breadth-first signal wave: click a node and a pulse of light leaves it along every edge, reaches
 * its neighbors, and carries on outward in breadth-first order -- the picture of how a message,
 * an infection or a failure spreads hop by hop. Each edge knows its hop and which end is nearer
 * the clicked node, so the pulse always runs outward; edges between two nodes of the same hop
 * light from both ends and meet in the middle. Each hop gets its own hue, so the rings of the
 * search stay readable after the pulse has passed. A hub is clicked for you at start.
 */
import { type GraphArgs, graphArgs, graphArgTypes, hopsFrom, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, hubs, onSelection } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Bfs Wave", ...labMeta };

interface Args extends GraphArgs {
    hopsPerSec: number;
    loop: boolean;
    period: number;
    sharpness: number;
    afterglow: number;
    decay: number;
    swell: number;
    pulseColor: string;
    hueStart: number;
    hueStep: number;
    restOpacity: number;
    bloom: number;
    bloomRadius: number;
}

// shared by the edge vertex hook, the edge fragment and the node fragment
const WAVE = `
float waveFront() {
    float age = time - selectTime;
    if (loop > 0.5) age = mod(age, period);
    return age * hopsPerSec;
}
// position of an edge point in hops from the clicked node: the nearer end's hop plus the way along
float edgeHop(float hop, float dir, float t) {
    float tt = dir > 0.5 ? t : (dir < -0.5 ? 1.0 - t : min(t, 1.0 - t));
    return hop + tt;
}
vec3 hopColor(float h) { return hsv2rgb(vec3(fract(hueStart + h * hueStep), 0.75, 1.0)); }
`;

const EDGE_HOOKS = `
${WAVE}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    if (selectedNode < 0.0 || edgeInfo.w < 0.0) return edgeWidth;
    float x = waveFront() - edgeHop(edgeInfo.w, edgeState.x, t);
    return edgeWidth * (1.0 + swell * exp(-abs(x) * 4.0));
}
`;

const EDGE_FRAGMENT = `
${WAVE}
void main() {
    float cov = labEdgeCoverage();
    vec3 base = mix(vColorA.rgb, vColorB.rgb, vT);
    float h = vInfo.w;
    if (selectedNode < 0.0 || h < 0.0) {
        gl_FragColor = vec4(base * 0.6, cov * restOpacity * (selectedNode < 0.0 ? 1.6 : 1.0));
        return;
    }
    float x = waveFront() - edgeHop(h, vState.x, vT);
    // a sharp head, a softer trailing glow, and a lasting tint in the hop's hue
    float head = exp(-abs(x) * sharpness);
    float glow = x > 0.0 ? exp(-x * decay) : 0.0;
    float stay = x > 0.0 ? afterglow : 0.0;
    float core = exp(-vSide * vSide * 2.5);
    vec3 hc = hopColor(h);
    vec3 c = base * 0.25;
    c = mix(c, hc * 0.9, clamp(stay + glow, 0.0, 1.0));
    c += mix(pulseColor, vec3(1.0), core * 0.6) * head * 2.0;
    float a = max(restOpacity * 0.6, max(stay, max(glow, head)));
    gl_FragColor = vec4(c, cov * clamp(a, 0.0, 1.0));
}
`;

const NODE_FRAGMENT = `
${WAVE}
void main() {
    float r = length(vUV);
    float h = vInfo.z;
    bool isOn = selectedNode >= 0.0 && h >= 0.0;
    float x = isOn ? waveFront() - h : -100.0;
    // expanding ring when the pulse arrives
    float ring = 0.0;
    if (x > 0.0 && x < 1.2) {
        float rr = 1.0 + x * 1.6;
        ring = exp(-pow((r - rr) * 6.0, 2.0)) * (1.0 - x / 1.2);
    }
    float d = r - 1.0;
    float a = fill(d);
    vec3 hc = isOn ? hopColor(h) : vColor.rgb;
    float reached = x >= 0.0 ? 1.0 : 0.0;
    vec3 c = mix(vColor.rgb * 0.35, hc, reached * (afterglow * 0.6 + 0.4));
    c += pulseColor * exp(-abs(x) * sharpness * 0.5) * 1.5 * exp(-r * r * 2.0);
    c = mix(c, vec3(1.0), 0.5 * vState.x + stroke(d + 0.08, 0.06) * vState.y);
    vec3 col = c * a + pulseColor * ring;
    float alpha = max(a, ring);
    if (alpha <= 0.01) discard;
    gl_FragColor = vec4(col, alpha);
}
`;

export const BfsWave = {
    args: {
        ...graphArgs,
        graph: "communities",
        dim: 2,
        nodeSize: 1,
        edgeWidth: 2,
        hopsPerSec: 1.3,
        loop: true,
        period: 7,
        sharpness: 7,
        afterglow: 0.55,
        decay: 2.5,
        swell: 2,
        pulseColor: "#e8fbff",
        hueStart: 0.55,
        hueStep: 0.09,
        restOpacity: 0.25,
        bloom: 0.8,
        bloomRadius: 3.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        hopsPerSec: range(0.2, 6),
        loop: { control: "boolean" },
        period: range(2, 20, 0.5),
        sharpness: range(1, 30),
        afterglow: range(0, 1),
        decay: range(0.2, 10),
        swell: range(0, 6),
        pulseColor: { control: "color" },
        hueStart: range(0, 1),
        hueStep: range(0, 0.5),
        restOpacity: range(0, 1),
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
            background: "#04050b",
            uniforms: {
                hopsPerSec: args.hopsPerSec,
                loop: args.loop,
                period: args.period,
                sharpness: args.sharpness,
                afterglow: args.afterglow,
                decay: args.decay,
                swell: args.swell,
                pulseColor: args.pulseColor,
                hueStart: args.hueStart,
                hueStep: args.hueStep,
                restOpacity: args.restOpacity,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 3, blend: "alpha" },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS, segments: 8 },
            post: [BLOOM_POST],
            setup: (ctx) => {
                const { graph, edges } = ctx;
                // which end of each edge is nearer the clicked node, so the pulse runs outward
                const hub = hubs(graph, 1)[0];
                onSelection(
                    ctx,
                    (selected) => {
                    if (!edges || selected < 0) {
                        return;
                    }
                    const hops = hopsFrom(graph, selected);
                    const state = edges.buffers.edgeState;
                    for (let e = 0; e < graph.m; e++) {
                        const hs = hops[graph.src[e]];
                        const hd = hops[graph.dst[e]];
                        state[e * 4] = Math.sign(hd - hs);
                    }
                    edges.update("edgeState");
                    },
                    hub,
                );
            },
        }),
};

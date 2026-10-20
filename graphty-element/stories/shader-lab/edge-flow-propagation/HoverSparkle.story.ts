/**
 * Hover neighbor sparkle: point at a node and its edges widen into rivers of twinkling four-point
 * stars. Out-edges sparkle in one color and in-edges in another, and the stars drift the way each
 * edge points -- away from the node along its out-edges, toward it along its in-edges -- so you
 * can read who it talks to and who talks to it. With demo on, the busiest nodes take turns when
 * the pointer is not on a node.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, DARK_NODE_FRAGMENT, hubs, RIBBON } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Hover Sparkle", ...labMeta };

interface Args extends GraphArgs {
    outColor: string;
    inColor: string;
    drift: number;
    density: number;
    starSize: number;
    twinkle: number;
    widen: number;
    toNeighbors: boolean;
    restOpacity: number;
    demo: boolean;
    bloom: number;
    bloomRadius: number;
}

// focus = the hovered node, else the demo node; grow eases in after the focus changes
const FOCUS = `
float focusNode() { return hoverNode >= 0.0 ? hoverNode : (demo > 0.5 ? demoNode : -1.0); }
float focusGrow() { return smoothstep(0.0, 0.35, time - (hoverNode >= 0.0 ? hoverTime : demoTime)); }
// +1 the edge leaves the focus node, -1 it arrives at it, 0 neither
float focusTouch(float s, float t) { float f = focusNode(); return s == f ? 1.0 : (t == f ? -1.0 : 0.0); }
`;

const EDGE_HOOKS = `
${FOCUS}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    float on = abs(focusTouch(edgeInfo.x, edgeInfo.y)) * focusGrow();
    return edgeWidth * (1.0 + widen * on);
}
`;

const EDGE_FRAGMENT = `
${RIBBON}
${FOCUS}
void main() {
    float cov = labEdgeCoverage();
    vec3 base = mix(vColorA.rgb, vColorB.rgb, vT);
    float touch = focusTouch(vInfo.x, vInfo.y);
    if (touch == 0.0) {
        float dim = focusNode() >= 0.0 ? 0.35 : 1.0;
        gl_FragColor = vec4(base * 0.7, cov * restOpacity * dim);
        return;
    }
    float grow = focusGrow();
    vec3 tint = touch > 0.0 ? outColor : inColor;
    // stars drift along the edge's own direction, or always away from the focus node
    float dir = toNeighbors > 0.5 ? touch : 1.0;
    float cellPx = starSize * 3.0 * pixelRatio;
    vec2 p = vec2(ribbonX() - time * drift * 60.0 * pixelRatio * dir, ribbonY()) / cellPx;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float stars = 0.0;
    float h = hash12(id + vInfo.z * 3.7);
    if (h < density) {
        vec2 o = (hash22(id + 11.0) - 0.5) * 0.5;
        vec2 q = (f - o) * 3.0;
        float tw = 0.55 + 0.45 * sin(time * twinkle * 6.0 + h * 40.0);
        // four-point star: a bright core plus two thin crossed rays
        float core = exp(-dot(q, q) * 6.0);
        float rays = exp(-abs(q.x) * 14.0) * exp(-abs(q.y) * 2.2) + exp(-abs(q.y) * 14.0) * exp(-abs(q.x) * 2.2);
        stars = (core + rays * 0.7) * tw;
    }
    float glow = exp(-vSide * vSide * 2.0);
    vec3 c = tint * glow * 1.1 + mix(tint, vec3(1.0), 0.5) * stars * 3.0;
    float a = clamp(glow * 0.85 + stars, 0.0, 1.0) * grow;
    gl_FragColor = vec4(c, cov * max(a, restOpacity * 0.5));
}
`;

export const HoverSparkle = {
    args: {
        ...graphArgs,
        graph: "flow",
        dim: 2,
        nodeSize: 1,
        edgeWidth: 2.5,
        outColor: "#ffd166",
        inColor: "#5ad1ff",
        drift: 0.7,
        density: 0.9,
        starSize: 3,
        twinkle: 1,
        widen: 6,
        toNeighbors: true,
        restOpacity: 0.25,
        demo: true,
        bloom: 1.4,
        bloomRadius: 3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        outColor: { control: "color" },
        inColor: { control: "color" },
        drift: range(-3, 3),
        density: range(0, 1),
        starSize: range(1, 12),
        twinkle: range(0, 4),
        widen: range(0, 15),
        toNeighbors: { control: "boolean" },
        restOpacity: range(0, 1),
        demo: { control: "boolean" },
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
            background: "#05060c",
            uniforms: {
                outColor: args.outColor,
                inColor: args.inColor,
                drift: args.drift,
                density: args.density,
                starSize: args.starSize,
                twinkle: args.twinkle,
                widen: args.widen,
                toNeighbors: args.toNeighbors,
                restOpacity: args.restOpacity,
                demo: args.demo,
                demoNode: -1,
                demoTime: 0,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
            post: [BLOOM_POST],
            setup: (ctx) => {
                // demo: the busiest nodes take turns, 3 seconds each (the shader ignores it when demo is off)
                const tour = hubs(ctx.graph, 6);
                let current = -2;
                let since = 0;
                ctx.onFrame((time) => {
                    const pick = tour[Math.floor(time / 3) % tour.length];
                    if (pick !== current) {
                        current = pick;
                        since = time;
                    }
                    ctx.set("demoNode", pick);
                    ctx.set("demoTime", since);
                });
            },
        }),
};

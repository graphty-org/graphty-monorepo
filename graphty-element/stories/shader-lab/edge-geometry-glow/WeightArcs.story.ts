/**
 * 3D arcs by weight: the graph is laid flat on the ground and every edge lifts into an arch, like
 * flight routes on a globe. Arch height and color encode the edge weight (or its length, so long
 * links sail over the local tangle instead of cutting through it), and a bright comet rides each
 * arch from source to target to show direction. In the 3D layout the arches bow outward from the
 * center instead. Practical: heavy links stand up out of the hairball and can be read from the side.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, makeGraph, mountLab, range } from "../harness";
import { edgeLength, groundGraph } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Weight Arcs", ...labMeta };

const HEIGHT_BY = ["weight", "length"] as const;

interface Args extends GraphArgs {
    heightBy: (typeof HEIGHT_BY)[number];
    height: number;
    minHeight: number;
    weightWidth: number;
    cometSpeed: number;
    cometTail: number;
    lowColor: string;
    highColor: string;
    groundLines: number;
    autoRotate: boolean;
}

// edgeCustom.x = edge length / the longest edge, so length can drive the height
const EDGE_HOOKS = `
float arcKey() { return heightBy > 0.5 ? edgeCustom.x : edgeData.x; }
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    vec3 mid = 0.5 * (a + b);
    vec3 up = flatGround > 0.5 ? vec3(0.0, 1.0, 0.0) : (length(mid) > 1e-3 ? normalize(mid) : vec3(0.0, 1.0, 0.0));
    float h = (minHeight + height * arcKey()) * 40.0;
    return mix(a, b, t) + up * h * 4.0 * t * (1.0 - t);
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth * (0.5 + weightWidth * edgeData.x) + 4.0; }
`;

const EDGE_FRAGMENT = `
void main() {
    float key = heightBy > 0.5 ? vCustom.x : vData.x;
    float px = abs(vSide) * vWidthPx * 0.5;
    float coreHalf = 0.5 * edgeWidth * pixelRatio * (0.5 + weightWidth * vData.x);
    float core = 1.0 - smoothstep(coreHalf - 0.6, coreHalf + 0.6, px);
    float halo = exp(-max(px - coreHalf, 0.0) / (1.5 * pixelRatio)) * 0.35;
    vec3 c = mix(lowColor, highColor, smoothstep(0.0, 1.0, key));
    // comet: head runs source to target, tail fades behind it
    float head = fract(time * cometSpeed * (0.4 + 0.6 * vData.w) + vData.w * 5.0);
    float behind = fract(head - vT);
    float comet = exp(-behind / max(cometTail, 0.01)) * step(0.001, cometSpeed);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    float focus = selectedNode < 0.0 ? 1.0 : (vInfo.w == 0.0 ? 1.3 : 0.15);
    vec3 col = c * (0.45 + 0.55 * key) * (core + halo) + mix(c, vec3(1.0), 0.5) * comet * (core * 1.2 + halo * 0.8);
    col = mix(col, vec3(1.0), 0.4 * lit * core);
    gl_FragColor = vec4(col * focus * 0.6, 1.0);
}
`;

// faint straight footprint of every edge on the ground, so the arch reads against its base
const GROUND_FRAGMENT = `
void main() {
    float a = labEdgeCoverage() * groundLines;
    gl_FragColor = vec4(mix(vColorA.rgb, vColorB.rgb, vT) * a, 1.0);
}
`;

const GROUND_VARYINGS = `
varying float vT;
varying float vSide;
varying vec4 vColorA;
varying vec4 vColorB;
`;

const GROUND_VERTEX = `
vec2 toScreen(vec4 c) { return c.xy / max(c.w, 1e-4) * resolution * 0.5; }
void main() {
    float t = position.x;
    vec4 c = viewProjection * vec4(mix(edgeA, edgeB, t), 1.0);
    vec2 dir = toScreen(viewProjection * vec4(edgeB, 1.0)) - toScreen(viewProjection * vec4(edgeA, 1.0));
    dir = length(dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);
    float hw = 0.5 * pixelRatio + 1.0;
    c.xy += vec2(-dir.y, dir.x) * position.y * hw / (resolution * 0.5) * c.w;
    gl_Position = c;
    vT = t; vSide = position.y * hw / (0.5 * pixelRatio);
    vColorA = edgeColorA; vColorB = edgeColorB;
}
`;

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float l = max(dot(n, normalize(vec3(-0.4, 0.6, -0.7))), 0.0);
    vec3 c = vColor.rgb * (0.25 + 0.75 * l) + pow(l, 24.0) * 0.6;
    c = mix(c, vec3(1.0), 0.5 * vState.x + 0.4 * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;

export const WeightArcs = {
    args: {
        ...graphArgs,
        graph: "weighted",
        dim: 2,
        edgeWidth: 1,
        heightBy: "weight",
        height: 0.7,
        minHeight: 0.06,
        weightWidth: 2,
        cometSpeed: 0.25,
        cometTail: 0.12,
        lowColor: "#2a5cff",
        highColor: "#ffb13b",
        groundLines: 0.35,
        autoRotate: true,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        heightBy: { control: "inline-radio", options: HEIGHT_BY },
        height: range(0, 2),
        minHeight: range(0, 0.5),
        weightWidth: range(0, 5),
        cometSpeed: range(0, 1.5),
        cometTail: range(0.01, 0.6),
        lowColor: { control: "color" },
        highColor: { control: "color" },
        groundLines: range(0, 1),
        autoRotate: { control: "boolean" },
    },
    render: (args: Args) => {
        const flat = args.dim === 2;
        const graph = flat ? groundGraph(args.graph, args.nodes) : makeGraph(args.graph, { nodes: args.nodes, dim: 3 });
        let longest = 1e-6;
        for (let e = 0; e < graph.m; e++) {
            longest = Math.max(longest, edgeLength(graph, e));
        }
        return mountLab({
            graph,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            camera: "orbit",
            autoRotate: args.autoRotate,
            background: "#070a12",
            rebuildOn: [flat],
            uniforms: {
                flatGround: flat,
                heightBy: args.heightBy === "length" ? 1 : 0,
                height: args.height,
                minHeight: args.minHeight,
                weightWidth: args.weightWidth,
                cometSpeed: args.cometSpeed,
                cometTail: args.cometTail,
                lowColor: args.lowColor,
                highColor: args.highColor,
                groundLines: args.groundLines,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, size: (i, g) => 0.5 + 0.8 * Math.sqrt(g.degree[i]) },
            edgeLayer: {
                segments: 32,
                blend: "add",
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e, g) => [edgeLength(g, e) / longest, 0, 0, 0],
            },
            setup: (ctx) => {
                ctx.camera.beta = 1.05;
                ctx.camera.radius = 125;
                if (!flat || !ctx.edges) {
                    return;
                }
                const b = ctx.edges.buffers;
                ctx.addInstances({
                    name: "ground",
                    count: graph.m,
                    geometry: 1,
                    attributes: {
                        edgeA: [3, b.edgeA],
                        edgeB: [3, b.edgeB],
                        edgeColorA: [4, b.edgeColorA],
                        edgeColorB: [4, b.edgeColorB],
                        edgeData: [4, b.edgeData],
                        edgeInfo: [4, b.edgeInfo],
                        edgeState: [4, b.edgeState],
                        edgeCustom: [4, b.edgeCustom],
                    },
                    varyings: GROUND_VARYINGS,
                    vertex: GROUND_VERTEX,
                    fragment: `float labEdgeCoverage() { float w = fwidth(vSide); return 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(vSide)); }\n${GROUND_FRAGMENT}`,
                    blend: "add",
                });
            },
        });
    },
};

/**
 * Magnetic hover swell: nodes near the cursor swell like icons in the macOS dock, so a crowded
 * spot opens up under the pointer and small nodes become easy to hit. `lens` adds a fisheye: nodes
 * near the cursor are also pushed apart on screen, and the edges bend with them. Everything happens
 * in the vertex shader from the mouse position; nothing moves in the graph itself.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { SHADE } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Hover Swell", ...labMeta };

interface Args extends GraphArgs {
    magnify: number;
    radiusPx: number;
    lens: number;
    glow: number;
    glowColor: string;
}

// Screen distance (CSS pixels) from a world point to the cursor, and the lens push in world units.
const COMMON = `
vec2 toPx(vec3 p) { vec4 c = viewProjection * vec4(p, 1.0); return (c.xy / max(c.w, 1e-4) * 0.5 + 0.5) * resolution; }
float influence(vec3 p) {
    if (mouse.x < 0.0) return 0.0;
    vec2 d = (toPx(p) - mouse) / (radiusPx * pixelRatio);
    return exp(-dot(d, d));
}
vec3 lensPush(vec3 p) {
    if (mouse.x < 0.0 || lens <= 0.0) return p;
    vec4 c = viewProjection * vec4(p, 1.0);
    vec2 d = (toPx(p) - mouse) / (radiusPx * pixelRatio);
    float r = length(d);
    // fisheye: push outward, strongest about one radius from the cursor
    float push = lens * r * exp(-r * r * 0.6);
    vec2 dirPx = r > 1e-4 ? d / r : vec2(0.0);
    vec2 offPx = dirPx * push * radiusPx * pixelRatio * 0.6;
    // a screen offset back to world: camera right and up, scaled by depth
    vec3 right = vec3(view[0][0], view[1][0], view[2][0]);
    vec3 up = vec3(view[0][1], view[1][1], view[2][1]);
    vec2 world = offPx / (0.5 * resolution) * c.w / vec2(projection[0][0], projection[1][1]);
    return p + right * world.x + up * world.y;
}
`;

const NODE_HOOKS = `
${COMMON}
#define LAB_NODE_SCALE
float labNodeScale() { return 1.0 + magnify * influence(nodePos); }
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return lensPush(p); }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float k = influence(vCenterWorld);
    vec3 c = labShade(n, vColor.rgb * (1.0 + 0.35 * k));
    c += glowColor * glow * k * pow(1.0 + n.z, 2.0);
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_HOOKS = `
${COMMON}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) { return lensPush(mix(a, b, t)); }
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.5 * lit), cov * mix(0.45, 1.0, lit));
}
`;

export const HoverSwell = {
    args: {
        ...graphArgs,
        graph: "large",
        dim: 2,
        edgeWidth: 1,
        magnify: 3.5,
        radiusPx: 110,
        lens: 0.8,
        glow: 0.6,
        glowColor: "#ffd27a",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        magnify: range(0, 6),
        radiusPx: range(20, 300, 1),
        lens: range(0, 3),
        glow: range(0, 2),
        glowColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                magnify: args.magnify,
                radiusPx: args.radiusPx,
                lens: args.lens,
                glow: args.glow,
                glowColor: args.glowColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            // the lens bends edges, so they need pieces
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS, segments: 16 },
        }),
};

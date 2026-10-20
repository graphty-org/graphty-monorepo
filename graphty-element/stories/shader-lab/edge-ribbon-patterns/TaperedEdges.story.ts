/**
 * Tapered direction edges: each edge is wide where it leaves its source and needle-thin where it
 * reaches its target, so direction reads at a glance without arrowheads. A bright ring slides down
 * the taper toward the target to confirm it. Practical: try the "flow" graph.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Tapered Edges", ...labMeta };

interface Args extends GraphArgs {
    startWidth: number;
    endWidth: number;
    ringSpeed: number;
    ringSize: number;
    ringGlow: number;
    opacity: number;
    ringColor: string;
}

const EDGE_HOOKS = `
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth * mix(startWidth, endWidth, t); }
`;

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
void main() {
    float a = labEdgeCoverage();
    // a sub-pixel needle fades instead of breaking up
    a *= clamp(vWidthPx, 0.0, 1.0);
    vec3 c = mix(vColorA.rgb, vColorB.rgb, smoothstep(0.2, 1.0, vT) * 0.6);
    // shading across the ribbon: a soft round body
    c *= 0.75 + 0.35 * sqrt(max(1.0 - vSide * vSide, 0.0));
    // the ring: a gaussian in pixels, at a per-edge phase, travelling to the target
    float head = fract(time * ringSpeed + vData.w);
    float dx = (vT - head) * vLengthPx / max(ringSize, 0.5);
    float ring = exp(-dx * dx) * ringGlow;
    float lit = edgeLit();
    c = mix(c, vec3(1.0), 0.35 * lit);
    c += ringColor * ring;
    gl_FragColor = vec4(c, a * clamp(mix(opacity, 1.0, lit) + ring * 0.6, 0.0, 1.0));
}
`;

export const TaperedEdges = {
    args: {
        ...graphArgs,
        graph: "flow",
        edgeWidth: 3,
        startWidth: 2.5,
        endWidth: 0.15,
        ringSpeed: 0.35,
        ringSize: 6,
        ringGlow: 1.2,
        opacity: 0.8,
        ringColor: "#fff3c4",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        startWidth: range(0.2, 5),
        endWidth: range(0, 2),
        ringSpeed: range(0, 2),
        ringSize: range(1, 30),
        ringGlow: range(0, 3),
        opacity: range(0.1, 1),
        ringColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                startWidth: args.startWidth,
                endWidth: args.endWidth,
                ringSpeed: args.ringSpeed,
                ringSize: args.ringSize,
                ringGlow: args.ringGlow,
                opacity: args.opacity,
                ringColor: args.ringColor,
            },
            edgeLayer: { vertexHooks: EDGE_HOOKS, fragment: EDGE_FRAGMENT, segments: 8 },
        }),
};

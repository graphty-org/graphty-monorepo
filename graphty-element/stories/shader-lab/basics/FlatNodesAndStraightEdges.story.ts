/**
 * The harness's starting point: flat community-colored discs and straight source-to-target
 * gradient edges. Copy this file to start a new shader story.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Basics/Flat Nodes And Straight Edges", ...labMeta };

interface Args extends GraphArgs {
    ringWidth: number;
    shade: number;
}

// The fragment shader runs once per pixel of each node quad. vUV is -1..1 across the quad.
const NODE_FRAGMENT = `
void main() {
    float d = length(vUV) - 1.0;                  // signed distance to the disc edge
    float a = fill(d);                            // anti-aliased coverage
    if (a <= 0.0) discard;
    vec3 c = vColor.rgb * (1.0 - shade * 0.5 * (1.0 - vUV.y) * 0.5);
    c = mix(c, c * 0.45, stroke(d + ringWidth, ringWidth));   // darker rim
    c = mix(c, vec3(1.0), 0.5 * vState.x);                    // hovered
    c = mix(c, vec3(1.0), stroke(d + 0.08, 0.05) * vState.y); // selected ring
    gl_FragColor = vec4(c, a);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));            // touches the hovered or selected node
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.5 * lit), labEdgeCoverage() * mix(0.5, 1.0, lit));
}
`;

export const FlatNodesAndStraightEdges = {
    args: { ...graphArgs, ringWidth: 0.12, shade: 0.4 } satisfies Args,
    argTypes: { ...graphArgTypes, ringWidth: range(0, 0.5), shade: range(0, 1) },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: { ringWidth: args.ringWidth, shade: args.shade },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
        }),
};

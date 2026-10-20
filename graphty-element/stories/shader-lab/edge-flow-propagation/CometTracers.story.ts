/**
 * Comet tracers: white-hot heads with long fading tails race from source to target, each edge
 * with its own phase, so the graph looks like traffic seen from orbit at night. Spacing and tail
 * length are in screen pixels; heavier edges carry faster, brighter comets. Additive blending
 * plus a bloom pass makes crossing comets flare.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, DARK_NODE_FRAGMENT, RIBBON } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Comet Tracers", ...labMeta };

interface Args extends GraphArgs {
    speed: number;
    spacing: number;
    tail: number;
    weightEffect: number;
    headColor: string;
    hueMode: number;
    tailColor: string;
    trackOpacity: number;
    intensity: number;
    bloom: number;
    bloomRadius: number;
}

const EDGE_FRAGMENT = `
${RIBBON}
void main() {
    float cov = labEdgeCoverage();
    float w = vData.x;
    float k = mix(1.0, 0.35 + 1.3 * w, weightEffect);
    float x = ribbonX();
    float sp = spacing * pixelRatio;
    // distance behind the nearest comet head, in pixels (0 at the head, growing along the tail)
    float headPos = time * speed * 120.0 * pixelRatio * k + vData.w * sp * 7.0;
    float behind = mod(headPos - x, sp);
    float tl = tail * pixelRatio * k;
    float trail = exp(-behind / tl);
    float head = exp(-behind / (2.5 * pixelRatio));
    // the tail narrows toward its end, the head is round
    float across = exp(-vSide * vSide * mix(1.2, 6.0, clamp(behind / (tl * 3.0), 0.0, 1.0)));
    vec3 edgeCol = mix(vColorA.rgb, vColorB.rgb, vT);
    vec3 tc = mix(tailColor, edgeCol, hueMode);
    vec3 c = tc * trail * across * 1.2 + headColor * head * exp(-vSide * vSide * 1.5) * 2.0;
    c *= intensity * (0.6 + 0.6 * k) * (1.0 + 1.2 * edgeLit());
    c += edgeCol * trackOpacity * 0.35;
    gl_FragColor = vec4(c * cov, cov);
}
`;

export const CometTracers = {
    args: {
        ...graphArgs,
        nodeSize: 0.7,
        edgeWidth: 4,
        speed: 1,
        spacing: 180,
        tail: 55,
        weightEffect: 1,
        headColor: "#fff6e0",
        hueMode: 1,
        tailColor: "#ff7a2a",
        trackOpacity: 0.25,
        intensity: 1.2,
        bloom: 1,
        bloomRadius: 4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        speed: range(-3, 3),
        spacing: range(30, 800, 5),
        tail: range(4, 200, 1),
        weightEffect: range(0, 1),
        headColor: { control: "color" },
        hueMode: range(0, 1),
        tailColor: { control: "color" },
        trackOpacity: range(0, 1),
        intensity: range(0, 3),
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
            background: "#020308",
            autoRotate: true,
            uniforms: {
                speed: args.speed,
                spacing: args.spacing,
                tail: args.tail,
                weightEffect: args.weightEffect,
                headColor: args.headColor,
                hueMode: args.hueMode,
                tailColor: args.tailColor,
                trackOpacity: args.trackOpacity,
                intensity: args.intensity,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, blend: "add" },
            post: [BLOOM_POST],
        }),
};

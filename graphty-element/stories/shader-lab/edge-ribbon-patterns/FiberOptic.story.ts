/**
 * Fiber optic strands: every edge is a dark glass fiber with a faint rim, carrying racing packets
 * of colored light from source to target. A packet flares where it enters its target. Additive
 * blending and a bloom pass make the light pile up where fibers cross.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, DARK_NODE_FRAGMENT, RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Fiber Optic", ...labMeta };

interface Args extends GraphArgs {
    packets: number;
    speed: number;
    tail: number;
    hueSpread: number;
    glass: number;
    glint: number;
    bloom: number;
    bloomRadius: number;
}

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
void main() {
    float cov = labEdgeCoverage();
    float s = abs(vSide);
    float L = max(vLengthPx, 1.0);
    // glass: a dark body, a bright rim and a thin core line
    float rim = smoothstep(0.55, 0.9, s) * (1.0 - smoothstep(0.9, 1.05, s));
    vec3 tint = mix(vColorA.rgb, vColorB.rgb, vT);
    vec3 c = tint * (0.04 + 0.22 * rim) * glass;
    float core = exp(-s * s * 10.0);
    // packets: a bright head and an exponential tail behind it, in pixels
    float arrive = 0.0;
    for (int k = 0; k < 6; k++) {
        if (float(k) >= packets) break;
        float seed = vData.w * 17.0 + float(k) * 7.31;
        float sp = speed * (0.6 + 0.8 * hash11(seed));
        float head = fract(time * sp * 120.0 / L + hash11(seed + 3.1));
        float behind = fract(head - vT) * L;
        float b = exp(-behind / max(tail, 1.0)) * step(behind, L * 0.95);
        vec3 hue = hsv2rgb(vec3(fract(hash11(seed + 9.7) * hueSpread + vData.y * 0.13), 0.65, 1.0));
        c += hue * b * (0.15 + 1.1 * core);
        // the flare as a packet reaches the target
        arrive += exp(-pow((1.0 - head) * L / 20.0, 2.0));
    }
    float end = exp(-(1.0 - vT) * L / 6.0) * smoothstep(10.0, 40.0, L);
    c += vec3(0.8, 0.95, 1.0) * end * (0.1 + arrive) * glint * (0.3 + core);
    float lit = edgeLit();
    c *= 1.0 + 1.2 * lit;
    gl_FragColor = vec4(c, cov);
}
`;

export const FiberOptic = {
    args: {
        ...graphArgs,
        nodeSize: 0.6,
        edgeWidth: 5,
        packets: 3,
        speed: 1.2,
        tail: 14,
        hueSpread: 0.6,
        glass: 1,
        glint: 0.8,
        bloom: 0.8,
        bloomRadius: 4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        packets: range(1, 6, 1),
        speed: range(0, 4),
        tail: range(2, 150, 1),
        hueSpread: range(0, 1),
        glass: range(0, 3),
        glint: range(0, 4),
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
            uniforms: {
                packets: args.packets,
                speed: args.speed,
                tail: args.tail,
                hueSpread: args.hueSpread,
                glass: args.glass,
                glint: args.glint,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, blend: "add" },
            post: [BLOOM_POST],
        }),
};

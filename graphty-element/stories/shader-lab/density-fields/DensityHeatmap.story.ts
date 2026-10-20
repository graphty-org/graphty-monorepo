/**
 * Node density heat map: every node drops a soft Gaussian of "heat" into a half-resolution
 * floating-point buffer, and a full-screen pass maps the summed heat through a color ramp under
 * the graph. Crowded regions glow; empty space stays dark. The heat can count nodes, or weigh
 * each by PageRank, degree or value, so the map shows where the important nodes gather.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import {
    autoRender,
    DENSITY_SCALE,
    DENSITY_SPLAT,
    makeTarget,
    MEASURES,
    nodeSplat,
    rampGlsl,
    RAMPS,
    screenBackground,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Density Heatmap", ...labMeta };

interface Args extends GraphArgs {
    measure: (typeof MEASURES)[number];
    ramp: (typeof RAMPS)[number];
    bandwidth: number;
    gain: number;
    tintByCommunity: number;
    isolines: number;
}

const background = (ramp: Args["ramp"]): string => `
uniform sampler2D density;
${rampGlsl(ramp)}
void main() {
    vec4 acc = texture2D(density, vUV);
    float t = log(1.0 + acc.a * gain) / log(1.0 + 6.0 * gain);
    vec3 c = ramp(t);
    vec3 hue = acc.rgb / max(acc.a, 1e-4);
    c = mix(c, hue * (0.25 + 0.9 * t), tintByCommunity * smoothstep(0.0, 0.1, t));
    // faint isolines help read levels, like a weather map
    float band = fract(t * 10.0);
    float w = fwidth(t * 10.0);
    c = mix(c, c * 0.55 + 0.25, isolines * (1.0 - smoothstep(0.0, w * 1.5, min(band, 1.0 - band))) * step(0.03, t));
    vec3 bg = vec3(0.02, 0.025, 0.04);
    gl_FragColor = vec4(mix(bg, c, smoothstep(0.0, 0.08, t)), 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = mix(vec3(0.95), vColor.rgb, 0.35);
    c = mix(c, c * 0.3, stroke(d + 0.15, 0.15));
    c = mix(c, vec3(1.0, 0.9, 0.3), max(vState.x, vState.y));
    gl_FragColor = vec4(c, a);
}
`;

const EDGE = `
void main() {
    gl_FragColor = vec4(vec3(0.9), labEdgeCoverage() * 0.12);
}
`;

export const DensityHeatmap = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.5,
        edgeWidth: 1,
        measure: "count",
        ramp: "magma",
        bandwidth: 7,
        gain: 1,
        tintByCommunity: 0,
        isolines: 0.4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        measure: { control: "select", options: MEASURES },
        ramp: { control: "select", options: RAMPS },
        bandwidth: range(1, 30),
        gain: range(0.05, 5),
        tintByCommunity: range(0, 1),
        isolines: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                measure: MEASURES.indexOf(args.measure),
                bandwidth: args.bandwidth,
                gain: args.gain,
                tintByCommunity: args.tintByCommunity,
                isolines: args.isolines,
            },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            rebuildOn: [args.ramp],
            setup: (ctx) => {
                const density = makeTarget(ctx, "density", { size: DENSITY_SCALE, type: "half" });
                nodeSplat(ctx, [density], { name: "density-splat", radius: "bandwidth", fragment: DENSITY_SPLAT });
                autoRender(ctx, density);
                screenBackground(ctx, background(args.ramp), { density });
            },
        }),
};

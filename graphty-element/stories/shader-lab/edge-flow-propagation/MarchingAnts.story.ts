/**
 * Marching ants and chevrons: dashes or arrow chevrons scroll from source to target, so the
 * direction of every edge reads at a glance. Pattern spacing is in screen pixels, so it stays the
 * same size at any zoom. Heavier edges march faster and pack their dashes tighter.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { DARK_NODE_FRAGMENT, RIBBON } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Marching Ants", ...labMeta };

interface Args extends GraphArgs {
    chevrons: boolean;
    speed: number;
    period: number;
    duty: number;
    slant: number;
    weightSpeed: number;
    weightDensity: number;
    antColor: string;
    tintFromEdge: boolean;
    trackOpacity: number;
}

const EDGE_FRAGMENT = `
${RIBBON}
void main() {
    float cov = labEdgeCoverage();
    float w = vData.x;
    float spd = speed * mix(1.0, 0.25 + 1.75 * w, weightSpeed);
    float per = period * pixelRatio * mix(1.0, 1.4 - 0.8 * w, weightDensity);
    float x = ribbonX();
    float y = ribbonY();
    // chevrons bend the stripe back from the center line, so it points toward the target
    float bend = chevrons > 0.5 ? abs(y) * slant : 0.0;
    float phase = fract((x + bend - time * spd * 60.0 * pixelRatio) / per);
    // anti-aliased step: the derivative keeps the edge of each dash one pixel soft
    float aa = fwidth(phase) * 1.5;
    float on = smoothstep(duty + aa, duty - aa, phase) * smoothstep(0.0, aa, phase);
    vec3 base = mix(vColorA.rgb, vColorB.rgb, vT);
    vec3 ant = tintFromEdge > 0.5 ? mix(base, vec3(1.0), 0.35) : antColor;
    float lit = edgeLit();
    vec3 c = mix(base * 0.5, ant * (1.0 + 0.6 * lit), on);
    float a = mix(trackOpacity, 1.0, on) * mix(0.85, 1.0, lit);
    gl_FragColor = vec4(c, cov * a);
}
`;

export const MarchingAnts = {
    args: {
        ...graphArgs,
        graph: "flow",
        dim: 2,
        edgeWidth: 3,
        nodeSize: 1,
        chevrons: true,
        speed: 0.8,
        period: 16,
        duty: 0.45,
        slant: 1.2,
        weightSpeed: 1,
        weightDensity: 0.5,
        antColor: "#ffe08a",
        tintFromEdge: false,
        trackOpacity: 0.12,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        chevrons: { control: "boolean" },
        speed: range(-3, 3),
        period: range(4, 60, 1),
        duty: range(0.05, 0.95),
        slant: range(0, 3),
        weightSpeed: range(0, 1),
        weightDensity: range(0, 1),
        antColor: { control: "color" },
        tintFromEdge: { control: "boolean" },
        trackOpacity: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#07080d",
            uniforms: {
                chevrons: args.chevrons,
                speed: args.speed,
                period: args.period,
                duty: args.duty,
                slant: args.slant,
                weightSpeed: args.weightSpeed,
                weightDensity: args.weightDensity,
                antColor: args.antColor,
                tintFromEdge: args.tintFromEdge,
                trackOpacity: args.trackOpacity,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
        }),
};

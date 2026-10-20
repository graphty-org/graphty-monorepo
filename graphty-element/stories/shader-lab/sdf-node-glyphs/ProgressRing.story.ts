/**
 * Progress ring: a gauge around each node whose sweep is a 0..1 number (PageRank, degree or a
 * smooth value), with round caps and a glowing, pulsing tip. The arc is one distance field: inside
 * the swept angle it is the distance to the ring's center line, outside it the distance to the two
 * cap points, which is what makes the ends round.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Progress Ring", ...labMeta };

interface Args extends GraphArgs {
    metric: number;
    gamma: number;
    thickness: number;
    fillSpeed: number;
    glow: number;
    lowColor: string;
    highColor: string;
}

const NODE_FRAGMENT = `
void main() {
    vec2 p = vUV;
    float r = length(p);
    float v = metric < 0.5 ? vData.y : (metric < 1.5 ? vData.x : vData.z);
    v = pow(clamp(v, 0.0, 1.0), gamma);
    // fill in from zero on load, and again whenever the node is hovered
    float since = vState.x > 0.5 ? time - hoverTime : time;
    float sweep = v * smoothstep(0.0, 1.0, clamp(since * fillSpeed, 0.0, 1.0));
    sweep = max(sweep, 0.004);

    float rc = 0.8;
    float hw = thickness * 0.5;
    float ang = fract(atan(p.x, p.y) / TAU + 1.0);   // clockwise from 12 o'clock
    float endA = sweep * TAU;
    vec2 cap0 = vec2(0.0, rc);
    vec2 cap1 = rc * vec2(sin(endA), cos(endA));
    float dArc = ang < sweep ? abs(r - rc) : min(length(p - cap0), length(p - cap1));
    dArc -= hw;
    float dTrack = abs(r - rc) - hw;
    float dCore = r - (rc - hw - 0.08);

    float u = ang < sweep ? ang / max(sweep, 1e-3) : (length(p - cap0) < length(p - cap1) ? 0.0 : 1.0);
    vec3 arcCol = mix(lowColor, highColor, v * u);
    float tipD = length(p - cap1);
    float pulse = 0.75 + 0.25 * sin(time * 4.0 + vInfo.x * 6.0);
    float tip = glow * exp(-tipD * 7.0) * pulse;

    vec3 c = vec3(0.0);
    float a = 0.0;
    // core disc in the node's community color, darkened so the ring reads first
    float core = fill(dCore);
    c = mix(c, vColor.rgb * (0.55 + 0.25 * p.y), core);
    a = max(a, core);
    float track = fill(dTrack);
    c = mix(c, vec3(0.16, 0.17, 0.22), track);
    a = max(a, track);
    float arc = fill(dArc);
    c = mix(c, arcCol * (1.0 + 0.4 * smoothstep(hw, 0.0, abs(r - rc))), arc);
    a = max(a, arc);
    c += highColor * tip;
    a = max(a, clamp(tip, 0.0, 1.0));
    c = mix(c, vec3(1.0), 0.2 * vState.x * core);
    float sel = vState.y * stroke(r - 1.12, 0.035);
    c = mix(c, vec3(1.0), sel);
    a = max(a, sel);
    if (a <= 0.003) discard;
    gl_FragColor = vec4(c, a);
}
`;

export const ProgressRing = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2,
        metric: 2,
        gamma: 1,
        thickness: 0.2,
        fillSpeed: 0.7,
        glow: 0.8,
        lowColor: "#2b6cb0",
        highColor: "#7ff7c8",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        metric: { control: "select", options: [0, 1, 2], labels: { 0: "PageRank", 1: "degree", 2: "value" } },
        gamma: range(0.2, 2),
        thickness: range(0.05, 0.4),
        fillSpeed: range(0.1, 3),
        glow: range(0, 2),
        lowColor: { control: "color" },
        highColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                metric: args.metric,
                gamma: args.gamma,
                thickness: args.thickness,
                fillSpeed: args.fillSpeed,
                glow: args.glow,
                lowColor: args.lowColor,
                highColor: args.highColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.3, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

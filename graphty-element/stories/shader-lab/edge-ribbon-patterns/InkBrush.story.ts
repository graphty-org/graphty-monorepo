/**
 * Ink brush strokes: every edge is a sumi-e brush stroke on rice paper. The stroke starts with a
 * press, swells in the middle and lifts off toward the target, where the brush runs dry and the
 * ink breaks into streaks -- so direction reads as the stroke's motion. Heavier edges press
 * harder. Nodes are enso circles; a selected node gets a red seal stamp.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Ink Brush", ...labMeta };

interface Args extends GraphArgs {
    pressure: number;
    weightPressure: number;
    dryness: number;
    dryStart: number;
    ragged: number;
    tint: number;
    inkColor: string;
    paperGrain: number;
}

const EDGE_HOOKS = `
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    float press = smoothstep(0.0, 0.06, t) * (0.55 + 0.6 * sin(PI * pow(t, 0.8)));
    float lift = 1.0 - 0.75 * smoothstep(0.7, 1.0, t);
    float w = mix(1.0, 0.3 + 1.6 * edgeData.x, weightPressure);
    return edgeWidth * pressure * w * max(press * lift, 0.08);
}
`;

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
void main() {
    float seed = vData.w * 97.0;
    float x = ribbonX();
    float s = abs(vSide);
    // a ragged outline: the stroke's edge wanders with noise along the edge
    float edge = 0.88 + ragged * 0.35 * (fbm(vec2(x * 0.06 + seed, seed)) - 0.5);
    float cov = 1.0 - smoothstep(edge - fwidth(vSide) * 1.5, edge + fwidth(vSide) * 1.5, s);
    // dry brush: bristle streaks stretched along the stroke break up its end
    float bristle = noise(vec2(x * 0.012 + seed, vSide * 6.0)) * 0.6 + noise(vec2(x * 0.04, vSide * 18.0 + seed)) * 0.4;
    float dry = dryness * smoothstep(dryStart, 1.0, vT) + dryness * 0.25 * smoothstep(0.75, 1.0, s);
    cov *= smoothstep(dry - 0.06, dry + 0.06, bristle);
    // ink pools at the stroke's edges and thins in the middle where the brush was loaded
    float pool = smoothstep(0.4, 0.95, s);
    vec3 ink = mix(inkColor, vColorA.rgb * 0.55, tint);
    vec3 c = ink + vec3(0.07) * (1.0 - pool) * (0.5 + 0.5 * noise(vec2(x * 0.03, vSide * 2.0 + seed)));
    c = mix(c, ink * 0.6, pool * 0.5);
    float alpha = cov * (0.9 + 0.1 * pool);
    float lit = edgeLit();
    c = mix(c, vec3(0.7, 0.1, 0.1), 0.6 * lit);
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(c, alpha);
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    if (r > 1.05) discard;
    float seed = hash11(vInfo.y * 0.37);
    // an enso: one brush circle, open where the stroke began and ended
    float ang = fract(atan(vUV.y, vUV.x) / TAU + seed);
    float along = ang / 0.9;
    float press = smoothstep(0.0, 0.05, along) * (1.0 - 0.7 * smoothstep(0.6, 1.0, along));
    float th = 0.17 * max(press, 0.0) * (0.8 + 0.4 * noise(vec2(ang * 30.0, seed * 9.0)));
    float wob = 0.03 * (noise(vec2(ang * 8.0, seed * 5.0)) - 0.5);
    float d = abs(r - 0.74 - wob) - th;
    float cov = fill(d) * step(along, 1.0);
    float bristle = noise(vec2(ang * 40.0, (r - 0.74) * 40.0 + seed * 10.0));
    cov *= smoothstep(0.75 * smoothstep(0.55, 1.0, along) - 0.05, 0.75 * smoothstep(0.55, 1.0, along) + 0.05, bristle);
    vec3 ink = mix(inkColor, vColor.rgb * 0.5, tint);
    vec3 c = ink;
    float a = cov * 0.92;
    // a pale wash of the community color inside
    float wash = fill(r - 0.7) * (0.18 + 0.25 * vState.x);
    c = mix(vColor.rgb, c, a / max(a + wash * (1.0 - a), 0.001));
    a = a + wash * (1.0 - a);
    // the red seal stamp on the selected node
    if (vState.y > 0.5) {
        float sq = sdRoundBox(vUV, vec2(0.36), 0.05);
        float carve = min(min(sdBox(vUV - vec2(0.0, 0.14), vec2(0.22, 0.035)), sdBox(vUV - vec2(0.0, -0.12), vec2(0.22, 0.035))), sdBox(vUV, vec2(0.035, 0.26)));
        float seal = fill(sq) * (1.0 - fill(carve)) * (0.75 + 0.25 * noise(vUV * 25.0));
        c = mix(c, vec3(0.78, 0.12, 0.1), seal);
        a = max(a, seal);
    }
    if (a <= 0.002) discard;
    gl_FragColor = vec4(c, a);
}
`;

const PAPER_POST = `
void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    vec2 p = vUV * resolution / pixelRatio;
    // rice paper: fine grain and long faint fibers
    float grain = noise(p * 0.9) * 0.5 + noise(p * 0.25) * 0.5;
    float fiber = smoothstep(0.7, 1.0, noise(vec2(p.x * 0.02, p.y * 0.6))) * 0.5;
    float tone = 1.0 - paperGrain * (0.06 * grain + 0.05 * fiber);
    // a soft vignette
    vec2 q = vUV - 0.5;
    tone *= 1.0 - 0.25 * dot(q, q) * paperGrain;
    gl_FragColor = vec4(c * tone, 1.0);
}
`;

export const InkBrush = {
    args: {
        ...graphArgs,
        dim: 2,
        nodes: 120,
        nodeSize: 1.8,
        edgeWidth: 10,
        pressure: 1,
        weightPressure: 0.6,
        dryness: 0.6,
        dryStart: 0.35,
        ragged: 1,
        tint: 0.15,
        inkColor: "#15161b",
        paperGrain: 1,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        edgeWidth: range(1, 24, 0.5),
        pressure: range(0.2, 3),
        weightPressure: range(0, 1),
        dryness: range(0, 1),
        dryStart: range(0, 1),
        ragged: range(0, 3),
        tint: range(0, 1),
        inkColor: { control: "color" },
        paperGrain: range(0, 3),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#efe6d2",
            uniforms: {
                pressure: args.pressure,
                weightPressure: args.weightPressure,
                dryness: args.dryness,
                dryStart: args.dryStart,
                ragged: args.ragged,
                tint: args.tint,
                inkColor: args.inkColor,
                paperGrain: args.paperGrain,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, blend: "alpha" },
            edgeLayer: { vertexHooks: EDGE_HOOKS, fragment: EDGE_FRAGMENT, segments: 24 },
            post: [PAPER_POST],
        }),
};

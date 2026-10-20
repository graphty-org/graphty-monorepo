/**
 * Additive light painting: every edge is a faint streak of light added into a floating-point
 * buffer, like a long-exposure photograph of the graph. Where many edges overlap the light piles
 * up, and a tone curve maps the pile through a fire ramp (or keeps the community hue), so the
 * busy corridors of a hairball glow while single edges stay as thin wisps. Switch "exposure" to
 * "plain alpha" to see the same edges drawn the ordinary way.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { autoRender, GLSL_RAMPS, hideInto, makeTarget, screenBackground, sumBlend } from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Light Painting", ...labMeta };

const MODES = ["long exposure", "plain alpha"] as const;
const COLORS = ["inferno", "magma", "community", "ice"] as const;

interface Args extends GraphArgs {
    mode: (typeof MODES)[number];
    color: (typeof COLORS)[number];
    exposure: number;
    contrast: number;
    weightInfluence: number;
    showNodes: boolean;
}

// Each edge adds light: rgb = its color, alpha = 1 (a count of overlapping edges).
const EDGE_ADD = `
void main() {
    float cov = labEdgeCoverage();
    float core = exp(-vSide * vSide * 1.5);
    float w = mix(1.0, 0.25 + 1.5 * vData.x, weightInfluence);
    float k = core * cov * w * 0.08;
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(c * k, k) * (1.0 + 6.0 * lit);
}
`;

const EDGE_PLAIN = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.35);
}
`;

const BACKGROUND = `
uniform sampler2D light;
${GLSL_RAMPS}
void main() {
    vec4 acc = texture2D(light, vUV);
    float count = acc.a * exposure * 20.0;
    // log tone curve: one edge is a faint wisp, hundreds saturate gently instead of clipping
    float tone = log(1.0 + count * contrast) / log(1.0 + 40.0 * contrast);
    vec3 c;
    if (colorMode < 0.5) c = inferno(tone);
    else if (colorMode < 1.5) c = magma(tone);
    else if (colorMode < 2.5) {
        vec3 hue = acc.rgb / max(acc.a, 1e-5);
        c = hue * tone * 1.6 + vec3(pow(tone, 3.0)) * 0.9;
    } else c = mix(vec3(0.0), vec3(0.25, 0.55, 1.0), smoothstep(0.0, 0.6, tone)) + vec3(1.0) * pow(tone, 2.5);
    // a little film grain keeps the dark from banding
    c += (hash12(gl_FragCoord.xy + fract(time) * 100.0) - 0.5) * 0.015;
    gl_FragColor = vec4(c, 1.0);
}
`;

const NODE_DOT = `
void main() {
    float d = length(vUV);
    float a = exp(-d * d * 3.0);
    if (a < 0.01) discard;
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.6) * (1.0 + 2.0 * vState.x + 2.0 * vState.y);
    gl_FragColor = vec4(c * a * 0.8, 1.0);
}
`;

export const LightPainting = {
    args: {
        ...graphArgs,
        graph: "large",
        dim: 2,
        edgeWidth: 2.5,
        nodeSize: 0.6,
        mode: "long exposure",
        color: "inferno",
        exposure: 1.5,
        contrast: 1,
        weightInfluence: 0.3,
        showNodes: true,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        mode: { control: "inline-radio", options: MODES },
        color: { control: "select", options: COLORS },
        exposure: range(0.1, 4),
        contrast: range(0.05, 5),
        weightInfluence: range(0, 1),
    },
    render: (args: Args) => {
        const exposureMode = args.mode === "long exposure";
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#000000",
            uniforms: {
                exposure: args.exposure,
                contrast: args.contrast,
                weightInfluence: args.weightInfluence,
                colorMode: COLORS.indexOf(args.color),
            },
            nodeLayer: args.showNodes ? { fragment: NODE_DOT, blend: "add", quadScale: 1.5 } : false,
            edgeLayer: { fragment: exposureMode ? EDGE_ADD : EDGE_PLAIN, blend: exposureMode ? "add" : "alpha" },
            rebuildOn: [exposureMode, args.showNodes],
            setup: (ctx) => {
                if (!exposureMode || !ctx.edges) {
                    return;
                }
                const light = makeTarget(ctx, "light", { size: 1, type: "half" });
                sumBlend(ctx.edges);
                hideInto(ctx.edges, [light]);
                autoRender(ctx, light);
                screenBackground(ctx, BACKGROUND, { light });
            },
        });
    },
};

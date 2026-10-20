/**
 * Colorblind preview: see the graph as a reader with a color vision deficiency would. A
 * full-screen pass converts each pixel to linear light and multiplies it by the Machado, Oliveira
 * and Fernandes (2009) matrix for protanopia (no red cones), deuteranopia (no green cones) or
 * tritanopia (no blue cones), or takes its luminance for achromatopsia. Severity blends from
 * normal vision to the full deficiency; the split line puts normal vision on the left.
 *
 * The practical fix shown alongside: `patterns` gives every community its own stripe angle and
 * density inside the node, so communities stay apart even when their colors collapse together.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Glow Bloom And Post/Colorblind Preview", ...labMeta };

const MODES = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia", "normal"] as const;

interface Args extends GraphArgs {
    mode: (typeof MODES)[number];
    severity: number;
    split: number;
    patterns: boolean;
}

const NODE_FRAGMENT = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = vColor.rgb * (0.85 + 0.15 * vUV.y);
    if (patterns > 0.5) {
        // one stripe angle and spacing per community: a second channel that is not color
        float k = vData.w;
        float ang = mod(k, 4.0) * PI / 4.0;
        float freq = 2.5 + floor(k / 4.0) * 1.5;
        float s = sin(dot(vUV, vec2(cos(ang), sin(ang))) * freq * PI);
        float stripe = mod(k, 8.0) == 7.0 ? step(0.6, length(fract(vUV * 2.0) - 0.5) * 2.0) : smoothstep(-0.15, 0.15, s);
        c = mix(c, c * 0.35, stripe * 0.75);
    }
    c = mix(c, c * 0.4, stroke(d + 0.06, 0.06));
    c = mix(c, vec3(1.0), 0.5 * vState.x);
    gl_FragColor = vec4(c, a);
}
`;

const POST = `
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
vec3 simulate(vec3 c) {
    vec3 l = toLin(c);
    vec3 o = l;
    if (mode < 0.5) {
        o = vec3(dot(l, vec3(0.152286, 1.052583, -0.204868)), dot(l, vec3(0.114503, 0.786281, 0.099216)), dot(l, vec3(-0.003882, -0.048116, 1.051998)));
    } else if (mode < 1.5) {
        o = vec3(dot(l, vec3(0.367322, 0.860646, -0.227968)), dot(l, vec3(0.280085, 0.672501, 0.047413)), dot(l, vec3(-0.011820, 0.042940, 0.968881)));
    } else if (mode < 2.5) {
        o = vec3(dot(l, vec3(1.255528, -0.076749, -0.178779)), dot(l, vec3(-0.078411, 0.930809, 0.147602)), dot(l, vec3(0.004733, 0.691367, 0.303900)));
    } else if (mode < 3.5) {
        o = vec3(dot(l, vec3(0.2126, 0.7152, 0.0722)));
    }
    return toSrgb(mix(l, o, severity));
}
void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    bool left = vUV.x < split;
    vec3 o = left ? c : simulate(c);
    // the split line
    float px = abs(vUV.x - split) * resolution.x;
    o = mix(o, vec3(1.0), (1.0 - smoothstep(0.5, 1.5, px)) * step(0.001, split) * step(split, 0.999) * 0.8);
    gl_FragColor = vec4(o, 1.0);
}
`;

const DEFAULTS: Args = {
    ...graphArgs,
    dim: 2,
    nodeSize: 1.6,
    mode: "deuteranopia",
    severity: 1,
    split: 0.5,
    patterns: false,
};

export const ColorblindPreview = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        mode: { control: "select", options: MODES },
        severity: range(0, 1),
        split: range(0, 1),
        patterns: { control: "boolean" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#f4f4f2",
            uniforms: {
                mode: MODES.indexOf(args.mode),
                severity: args.severity,
                split: args.split,
                patterns: args.patterns,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.1 },
            post: [POST],
        }),
};

/**
 * Film grade and tilt-shift: the camera-and-darkroom finish that makes a render look shot rather
 * than drawn. The graph lies on the ground like a model railway, its hubs lit as lamps, and a
 * chain of full-screen passes finishes it:
 * - tilt-shift: everything outside a horizontal band of focus is blurred (two passes, across then
 *   down), and color is pushed up. The eye reads that shallow depth of field as a tiny model
 *   photographed up close: the miniature effect.
 * - anamorphic streaks: bright highlights are smeared into long thin horizontal blue flares,
 *   the signature of anamorphic cinema lenses (wide horizontal-only blurs at half resolution)
 * - grading: a filmic tone curve, exposure, contrast, saturation and a look (teal and orange,
 *   bleach bypass, warm film stock, noir)
 * - lens and film: chromatic aberration toward the corners, vignette, animated grain, letterbox
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, makeGraph, mountLab, range } from "../harness";
import { addPass, liveArgs } from "./common";

export default { title: "Shader Lab/Glow Bloom And Post/Camera Finish", ...labMeta };

const LOOKS = ["teal and orange", "bleach bypass", "warm film", "noir", "none"] as const;

interface Args extends Omit<GraphArgs, "dim"> {
    look: (typeof LOOKS)[number];
    exposure: number;
    contrast: number;
    saturation: number;
    tiltShift: number;
    focusY: number;
    focusBand: number;
    streaks: number;
    aberration: number;
    vignette: number;
    grain: number;
    letterbox: boolean;
}

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    vec3 L = normalize(vec3(-0.4, 0.75, -0.5));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(L, n), labViewDir), 0.0), 60.0);
    vec3 c = vColor.rgb * (0.12 + 0.85 * diff) + vec3(1.0) * spec * 0.9;
    // the top hubs are lamps
    float lamp = smoothstep(0.7, 0.85, vData.y);
    c = mix(c, vec3(1.0, 0.92, 0.75) * (1.2 - 0.3 * length(vUV)), lamp);
    c = mix(c, vec3(1.0), 0.4 * vState.x + 0.4 * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;
const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * 0.7;
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.55);
}
`;

const TILT = (dir: string): string => `
void main() {
    float y = vUV.y;
    float dist = max(abs(y - focusY) - focusBand * 0.5, 0.0);
    float rpx = tiltShift * 14.0 * pixelRatio * smoothstep(0.0, 0.35, dist);
    const int K = LAB_Q(2, 3, 4);
    vec2 step1 = ${dir} * texel * rpx / float(K);
    vec3 acc = vec3(0.0); float wsum = 0.0;
    for (int i = -K; i <= K; i++) {
        float fi = float(i);
        float w = exp(-fi * fi / (0.5 * float(K * K)));
        acc += texture2D(textureSampler, vUV + step1 * fi).rgb * w;
        wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, 1.0);
}`;

const STREAK_EXTRACT = `
void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    float l = luminance(c);
    gl_FragColor = vec4(c * smoothstep(0.72, 0.95, l), 1.0);
}`;
const STREAK_BLUR = (spacing: number): string => `
void main() {
    vec3 acc = vec3(0.0); float wsum = 0.0;
    const int K = LAB_Q(6, 9, 12);
    for (int i = -K; i <= K; i++) {
        float fi = float(i) * 12.0 / float(K);
        float w = exp(-abs(fi) / 5.0);
        acc += texture2D(textureSampler, vUV + vec2(fi * ${spacing.toFixed(1)} * texel.x, 0.0)).rgb * w;
        wsum += w;
    }
    gl_FragColor = vec4(acc / wsum * 2.0, 1.0);
}`;

const FINAL = `
vec3 filmic(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
    vec2 q = vUV - 0.5;
    // chromatic aberration grows toward the corners
    vec2 ca = q * dot(q, q) * aberration * 0.06;
    vec3 c = vec3(texture2D(sceneSampler, vUV + ca).r, texture2D(sceneSampler, vUV).g, texture2D(sceneSampler, vUV - ca).b);
    vec3 streak = texture2D(textureSampler, vUV).rgb;
    c += streak * vec3(0.35, 0.6, 1.3) * streaks;
    c *= exp2(exposure);
    c = filmic(c * 1.6);
    // contrast around mid gray, then saturation (tilt-shift adds its own push of color)
    c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
    float l = luminance(c);
    c = mix(vec3(l), c, saturation + tiltShift * 0.35);
    if (look < 0.5) {
        vec3 shadows = vec3(0.0, 0.42, 0.48); vec3 highs = vec3(1.0, 0.62, 0.32);
        c = mix(c, c * 0.6 + shadows * 0.4, (1.0 - smoothstep(0.0, 0.5, l)) * 0.45);
        c = mix(c, c * 0.7 + highs * 0.45, smoothstep(0.45, 1.0, l) * 0.45);
    } else if (look < 1.5) {
        vec3 overlay = mix(2.0 * c * l, 1.0 - 2.0 * (1.0 - c) * (1.0 - l), step(0.5, l));
        c = mix(c, overlay, 0.75);
        c = mix(vec3(luminance(c)), c, 0.55);
    } else if (look < 2.5) {
        c = c * vec3(1.06, 0.98, 0.86) + vec3(0.045, 0.03, 0.02);
        c = mix(c, smoothstep(0.0, 1.0, c), 0.35);
    } else if (look < 3.5) {
        float g = luminance(c);
        g = smoothstep(0.05, 0.9, g);
        c = vec3(g) * vec3(1.0, 0.98, 0.94);
    }
    // vignette and grain
    c *= mix(1.0, smoothstep(0.85, 0.2, length(q * vec2(1.0, 0.8))), vignette);
    float n = hash12(gl_FragCoord.xy + floor(time * 24.0) * vec2(17.0, 31.0)) - 0.5;
    c += n * grain * 0.16 * (1.0 - 0.6 * luminance(c));
    if (letterbox > 0.5) {
        float aspect = resolution.x / resolution.y;
        // 2:1 rather than 2.39:1, so a 4:3 window keeps the whole graph inside the bars
        float bar = max(0.0, 0.5 * (1.0 - aspect / 2.0));
        c *= step(bar, vUV.y) * step(vUV.y, 1.0 - bar);
    }
    gl_FragColor = vec4(c, 1.0);
}`;

const DEFAULTS: Args = {
    ...graphArgs,
    graph: "communities",
    nodeSize: 1.1,
    edgeWidth: 1.5,
    look: "teal and orange",
    exposure: 0.2,
    contrast: 1.1,
    saturation: 1.1,
    tiltShift: 0.8,
    focusY: 0.5,
    focusBand: 0.06,
    streaks: 0.8,
    aberration: 0.6,
    vignette: 0.6,
    grain: 0.35,
    letterbox: true,
};
const live = liveArgs(DEFAULTS);
const { dim: _dim, ...argTypesNoDim } = graphArgTypes;

export const CameraFinish = {
    args: DEFAULTS,
    argTypes: {
        ...argTypesNoDim,
        look: { control: "select", options: LOOKS },
        exposure: range(-2, 2),
        contrast: range(0.5, 2),
        saturation: range(0, 2),
        tiltShift: range(0, 1),
        focusY: range(0, 1),
        focusBand: range(0, 0.6),
        streaks: range(0, 3),
        aberration: range(0, 3),
        vignette: range(0, 1),
        grain: range(0, 1),
        letterbox: { control: "boolean" },
    },
    render: (args: Args) => {
        live.update(args);
        // the 2D layout laid flat on the ground, so the camera looks down on it like a model
        const flat = makeGraph(args.graph, { nodes: args.nodes, dim: 2 });
        const pos = new Float32Array(flat.n * 3);
        for (let i = 0; i < flat.n; i++) {
            pos[i * 3] = flat.pos[i * 3];
            pos[i * 3 + 2] = flat.pos[i * 3 + 1];
        }
        return mountLab({
            graph: { ...flat, pos, dim: 3 },
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0b0d12",
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                ctx.camera.beta = 0.95;
                ctx.camera.radius = 135;
                const a = (): Args => live.current;
                const look = (): number => LOOKS.indexOf(a().look);
                const tiltU = {
                    tiltShift: () => a().tiltShift,
                    focusY: () => a().focusY,
                    focusBand: () => a().focusBand,
                };
                addPass(ctx, { samples: 4, uniforms: tiltU, fragment: TILT("vec2(1.0, 0.0)") });
                addPass(ctx, { uniforms: tiltU, fragment: TILT("vec2(0.0, 1.0)") });
                const extract = addPass(ctx, { fragment: STREAK_EXTRACT });
                addPass(ctx, { ratio: 0.5, fragment: STREAK_BLUR(2) });
                addPass(ctx, { ratio: 0.5, fragment: STREAK_BLUR(9) });
                addPass(ctx, {
                    ratio: 0.5,
                    fragment: FINAL,
                    samplers: { sceneSampler: () => ({ input: extract }) },
                    uniforms: {
                        look,
                        exposure: () => a().exposure,
                        contrast: () => a().contrast,
                        saturation: () => a().saturation,
                        tiltShift: () => a().tiltShift,
                        streaks: () => a().streaks,
                        aberration: () => a().aberration,
                        vignette: () => a().vignette,
                        grain: () => a().grain,
                        letterbox: () => (a().letterbox ? 1 : 0),
                    },
                });
            },
        });
    },
};

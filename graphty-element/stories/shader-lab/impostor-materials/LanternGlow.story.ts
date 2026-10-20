/**
 * Lantern inner glow: each node is a paper lantern lit from inside, and how brightly it glows
 * encodes a number (value, rank or degree), so hue stays free for the community. The light is
 * strongest where you look through the thinnest paper (the middle), ribs and caps shadow it, and
 * a one-pass bloom post-process lets the bright lanterns bleed light into the night around them.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Lantern Glow", ...labMeta };

const ENCODES = ["value", "rank", "degree"] as const;
const HUES = ["community", "warm"] as const;

interface Args extends GraphArgs {
    encode: (typeof ENCODES)[number];
    hue: (typeof HUES)[number];
    intensity: number;
    falloff: number;
    ribs: number;
    flicker: number;
    bloom: number;
    bloomRadius: number;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
void main() {
    vec3 n = labSphereNormal();
    float ndv = max(-n.z, 0.0);
    float raw = encode < 0.5 ? vData.z : (encode < 1.5 ? sqrt(vData.y) : sqrt(vData.x));
    float val = clamp(raw, 0.0, 1.0);
    val *= 1.0 + flicker * (noise(vec2(time * 9.0, vInfo.x * 77.0)) - 0.5) * 0.5;
    vec3 hueC = hueMode < 0.5 ? vColor.rgb : vec3(1.0, 0.62, 0.25);
    vec3 lightC = mix(hueC, vec3(1.0, 0.95, 0.85), 0.08 + 0.12 * val);

    vec3 nw = labToWorld(n);
    float lat = asin(clamp(nw.y, -1.0, 1.0)) / PI + 0.5;
    float rib = smoothstep(0.75, 1.0, 1.0 - abs(fract(lat * ribs) - 0.5) * 2.0);
    float caps = smoothstep(0.82, 0.86, abs(nw.y));
    float paper = 0.85 + 0.15 * fbm(nw * 18.0 + vInfo.x * 5.0);

    float glow = exp(-falloff * (1.0 - ndv));
    float core = pow(ndv, 10.0) * 0.6;
    vec3 c = lightC * (0.05 + val * intensity) * (glow + core) * paper;
    c *= 1.0 - 0.55 * rib;
    c = mix(c, vec3(0.04, 0.03, 0.03) + lightC * 0.02, caps);
    // a little moonlight on the outside so dark lanterns still read as shapes
    c += vec3(0.05, 0.06, 0.09) * max(dot(n, labLight()), 0.0);
    c = mix(c, c * 1.5 + 0.06, vState.x);
    c = mix(c, vec3(1.0, 0.9, 0.6), smoothstep(0.9, 0.95, length(vUV)) * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;

const BLOOM = `
void main() {
    vec3 base = texture2D(textureSampler, vUV).rgb;
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    vec2 px = 1.0 / resolution;
    const int TAPS = LAB_Q(12, 24, 40);
    for (int i = 0; i < TAPS; i++) {
        float fi = float(i) + 0.5;
        float r = sqrt(fi / float(TAPS)) * bloomRadius * pixelRatio;
        float a = fi * 2.39996;
        vec3 s = texture2D(textureSampler, vUV + vec2(cos(a), sin(a)) * r * px).rgb;
        float w = 1.0 - 0.8 * fi / float(TAPS);
        acc += max(s - vec3(0.35), 0.0) * w;
        wsum += w;
    }
    gl_FragColor = vec4(base + acc / wsum * bloom * 4.0, 1.0);
}
`;

export const LanternGlow = {
    args: {
        ...graphArgs,
        nodeSize: 1.3,
        encode: "value",
        hue: "community",
        intensity: 1.1,
        falloff: 2.2,
        ribs: 9,
        flicker: 0.3,
        bloom: 0.7,
        bloomRadius: 28,
        edgeAlpha: 0.12,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        encode: { control: "inline-radio", options: ENCODES },
        hue: { control: "inline-radio", options: HUES },
        intensity: range(0, 4),
        falloff: range(0, 8),
        ribs: range(0, 20, 1),
        flicker: range(0, 1),
        bloom: range(0, 3),
        bloomRadius: range(4, 80, 1),
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#04050a",
            uniforms: {
                encode: ENCODES.indexOf(args.encode),
                hueMode: HUES.indexOf(args.hue),
                intensity: args.intensity,
                falloff: args.falloff,
                ribs: args.ribs,
                flicker: args.flicker,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
            post: [BLOOM],
            rebuildOn: [args.encode, args.hue],
            setup: (ctx) => {
                const legend = document.createElement("div");
                legend.textContent = `brightness = ${args.encode} (dim 0 .. bright 1), hue = ${args.hue}`;
                ctx.overlay.appendChild(legend);
            },
        }),
};

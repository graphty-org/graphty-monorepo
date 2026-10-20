/**
 * Matcap material sampler: a "matcap" (material capture) shades a sphere by looking up its
 * screen-facing normal in a picture of a lit ball. Here the pictures are procedural GLSL, so the
 * dropdown switches every node between clay, chrome, jade, pearl, velvet, wax and toon with no
 * texture assets, and "mix" cross-fades into a second material. "per community" gives each
 * community its own material.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Matcap Sampler", ...labMeta };

const MATERIALS = ["clay", "chrome", "jade", "pearl", "velvet", "wax", "toon"] as const;
type Material = (typeof MATERIALS)[number];

interface Args extends GraphArgs {
    material: Material;
    blendTo: Material;
    mix: number;
    perCommunity: boolean;
    tint: number;
    animate: boolean;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
// Each material is a function of the view-space normal n (a matcap lookup is uv = n.xy * 0.5 + 0.5).
vec3 matClay(vec3 n, vec3 base) {
    vec3 l = labLight();
    float d = max(dot(n, l), 0.0);
    float wrap = clamp((dot(n, l) + 0.4) / 1.4, 0.0, 1.0);
    vec3 c = base * (0.18 + 0.75 * wrap * wrap) + vec3(0.06) * pow(d, 6.0);
    return c * (0.92 + 0.08 * noise(n.xy * 40.0));
}
vec3 matChrome(vec3 n, vec3 base) {
    vec3 rw = labToWorld(reflect(vec3(0.0, 0.0, 1.0), n));
    // the studio floor is near black; a bright horizon band keeps chrome readable on a dark page
    vec3 env = labStudio(rw) + vec3(0.6, 0.65, 0.75) * exp(-abs(rw.y) * 5.0) + vec3(0.07);
    return labTone(env * mix(vec3(1.0), base * 1.6, 0.25));
}
vec3 matJade(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    vec3 deep = vec3(0.02, 0.18, 0.10) + base * 0.15;
    vec3 lit = vec3(0.45, 0.85, 0.55) * 0.6 + base * 0.35;
    float veins = smoothstep(0.55, 0.75, fbm(n * 3.0 + vInfo.x * 10.0));
    vec3 c = mix(deep, lit, pow(ndv, 1.2) * 0.8 + 0.25 * max(dot(n, l), 0.0));
    c = mix(c, c * 1.5 + 0.08, veins * 0.5);
    c += vec3(0.9) * pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, -1.0)), 0.0), 60.0);
    c += labStudio(labToWorld(reflect(vec3(0.0, 0.0, 1.0), n))) * 0.06 * pow(1.0 - ndv, 2.0);
    return c;
}
vec3 matPearl(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    vec3 irid = palette(ndv * 0.9 + n.y * 0.15 + time * 0.03 * animate, vec3(0.82), vec3(0.14), vec3(1.0), vec3(0.0, 0.33, 0.67));
    vec3 c = irid * (0.55 + 0.45 * clamp((dot(n, l) + 0.3) / 1.3, 0.0, 1.0));
    c = mix(c, c * (0.7 + base * 0.6), 0.35);
    c += vec3(0.8) * pow(max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0), 40.0);
    return c;
}
vec3 matVelvet(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    float sheen = pow(1.0 - ndv, 2.0);
    vec3 c = base * 0.45 * (0.4 + 0.6 * max(dot(n, l), 0.0));
    c += mix(base, vec3(1.0), 0.35) * sheen * 1.1;
    return c * (0.9 + 0.1 * hash12(gl_FragCoord.xy));
}
vec3 matWax(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndl = dot(n, l);
    float sss = clamp((ndl + 0.6) / 1.6, 0.0, 1.0);
    vec3 warm = mix(base, vec3(1.0, 0.55, 0.35), 0.35);
    vec3 c = mix(warm * 0.25, base * 1.05 + 0.05, sss);
    c += warm * 0.35 * pow(1.0 - (-n.z), 3.0);
    c += vec3(0.25) * pow(max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0), 12.0);
    return c;
}
vec3 matToon(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndl = max(dot(n, l), 0.0);
    float band = ndl > 0.65 ? 1.0 : (ndl > 0.25 ? 0.7 : 0.42);
    vec3 c = base * band;
    c = mix(c, vec3(1.0), step(0.96, max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0)));
    c = mix(c, base * 0.15, smoothstep(0.86, 0.9, length(vUV)));
    return c;
}
vec3 material(float id, vec3 n, vec3 base) {
    if (id < 0.5) return matClay(n, base);
    if (id < 1.5) return matChrome(n, base);
    if (id < 2.5) return matJade(n, base);
    if (id < 3.5) return matPearl(n, base);
    if (id < 4.5) return matVelvet(n, base);
    if (id < 5.5) return matWax(n, base);
    return matToon(n, base);
}
void main() {
    vec3 n = labSphereNormal();
    vec3 base = mix(vec3(0.75), vColor.rgb, tint);
    float a = perCommunity > 0.5 ? mod(vData.w, 7.0) : materialA;
    float b = perCommunity > 0.5 ? mod(vData.w + 1.0, 7.0) : materialB;
    float k = animate > 0.5 ? 0.5 + 0.5 * sin(time * 0.8 + vInfo.x * 0.5) : mixAmount;
    vec3 c = mix(material(a, n, base), material(b, n, base), k);
    c = mix(c, c + vec3(0.3), vState.x);
    c = mix(c, vec3(1.0, 0.9, 0.5), smoothstep(0.85, 0.9, length(vUV)) * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;

export const MatcapSampler = {
    args: {
        ...graphArgs,
        material: "chrome",
        blendTo: "pearl",
        mix: 0,
        perCommunity: true,
        tint: 0.8,
        animate: false,
        edgeAlpha: 0.25,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        material: { control: "select", options: MATERIALS },
        blendTo: { control: "select", options: MATERIALS },
        mix: range(0, 1),
        perCommunity: { control: "boolean" },
        tint: range(0, 1),
        animate: { control: "boolean" },
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#15171f",
            uniforms: {
                materialA: MATERIALS.indexOf(args.material),
                materialB: MATERIALS.indexOf(args.blendTo),
                mixAmount: args.mix,
                perCommunity: args.perCommunity,
                tint: args.tint,
                animate: args.animate,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
        }),
};

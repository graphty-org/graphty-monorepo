/**
 * Every node is a living cell under a fluorescence microscope: a wobbling membrane, a nucleus
 * sized by degree, drifting organelles. How fast it wobbles and churns encodes a data attribute
 * (value, read as activity, by default). Cells are drawn additively, like stained cells glowing
 * on a dark slide, so overlaps brighten instead of hiding each other.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { colorArg, DIM_EDGE_FRAGMENT, encodeArgType } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Living Cell", ...labMeta };

interface Args extends GraphArgs {
    encode: number;
    wobble: number;
    speed: number;
    nucleusScale: number;
    organelles: number;
    membraneGlow: number;
    nucleusColor: string;
    organelleColor: string;
}

const NODE_FRAGMENT = `
float pickData(float which) { return which < 0.5 ? vData.z : (which < 1.5 ? vData.y : vData.x); }
void main() {
    float act = pickData(encode);
    float rnd = vInfo.x;
    float r = length(vUV);
    vec2 dir = vUV / max(r, 1e-4);
    float tt = time * speed * (0.25 + 2.5 * act) + rnd * 100.0;
    // membrane radius: two octaves of noise around the circle, changing in time
    float R = 1.08 + wobble * 1.2 * (2.0 * noise(vec3(dir * 1.4 + rnd * 9.0, tt * 0.5)) - 1.0)
                   + wobble * 0.5 * (2.0 * noise(vec3(dir * 3.5 + rnd * 3.0, tt * 0.9)) - 1.0);
    float d = r - R;
    float inside = fill(d);
    float rim = exp(-abs(d) * 26.0) * membraneGlow;
    if (inside <= 0.0 && rim < 0.01) discard;

    vec3 tint = mix(vColor.rgb, vec3(1.0), 0.15);
    // cytoplasm: faint gel, brighter toward the membrane, with speckle
    float speck = noise(vUV * 16.0 + vec2(tt * 0.15, -tt * 0.11));
    vec3 col = tint * (0.07 + 0.22 * pow(clamp(r / R, 0.0, 1.0), 3.0) + 0.07 * speck) * inside;

    // nucleus: drifts a little, chromatin texture, bright envelope
    vec2 c0 = 0.14 * vec2(noise(vec2(tt * 0.2, rnd * 10.0)) - 0.5, noise(vec2(rnd * 10.0, tt * 0.2)) - 0.5) * 2.0;
    vec2 q = vUV - c0;
    float nrBase = (0.18 + nucleusScale * 0.42 * sqrt(vData.x)) * R;
    float nr = nrBase * (1.0 + 0.07 * (2.0 * noise(vec3(normalize(q + 1e-4) * 2.0, tt * 0.3)) - 1.0));
    float nd = length(q) - nr;
    float chrom = fbm(q * 9.0 / max(nr, 0.1) + rnd * 7.0 + tt * 0.03);
    vec3 nuc = nucleusColor * (0.25 + 0.65 * smoothstep(0.35, 0.75, chrom));
    nuc += nucleusColor * 0.8 * exp(-abs(nd) * 40.0);
    float nucleolus = 1.0 - smoothstep(0.0, 0.05, length(q - 0.35 * nr * vec2(cos(rnd * 20.0), sin(rnd * 20.0))) - nr * 0.22);
    nuc += vec3(0.9, 0.95, 1.0) * nucleolus * 0.6;
    col += nuc * fill(nd);

    // organelles: Worley blobs carried by the cytoplasm, kept out of the nucleus
    vec2 flow = vec2(sin(tt * 0.31), cos(tt * 0.23)) * 0.9 + vec2(tt * 0.06, tt * 0.04);
    vec2 vo = voronoi(vUV * 4.2 + rnd * 20.0 + flow);
    float size = 0.06 + 0.12 * noise(vUV * 2.0 + rnd * 5.0 + flow * 0.5);
    float blob = 1.0 - smoothstep(size * 0.6, size, vo.x);
    col += organelleColor * blob * organelles * 0.7 * inside * smoothstep(0.0, 0.06, nd);

    // membrane: bright double line, brighter on hover, plus a ring when selected
    col += mix(tint, vec3(1.0), 0.35) * rim * (1.0 + 1.2 * vState.x);
    col += vec3(1.0) * vState.y * exp(-abs(d - 0.12) * 40.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

export const LivingCell = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 1.6,
        edgeWidth: 1,
        encode: 0,
        wobble: 0.08,
        speed: 0.8,
        nucleusScale: 0.6,
        organelles: 0.7,
        membraneGlow: 1,
        nucleusColor: "#4a7bff",
        organelleColor: "#6dff9e",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        encode: encodeArgType,
        wobble: range(0, 0.2),
        speed: range(0, 3),
        nucleusScale: range(0, 1),
        organelles: range(0, 1.5),
        membraneGlow: range(0, 2),
        nucleusColor: colorArg,
        organelleColor: colorArg,
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#020407",
            uniforms: {
                encode: args.encode,
                wobble: args.wobble,
                speed: args.speed,
                nucleusScale: args.nucleusScale,
                organelles: args.organelles,
                membraneGlow: args.membraneGlow,
                nucleusColor: args.nucleusColor,
                organelleColor: args.organelleColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.4, blend: "add" },
            edgeLayer: { fragment: DIM_EDGE_FRAGMENT },
        }),
};

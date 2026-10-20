/**
 * Every node is a ball of cooled basalt cracked by glowing lava veins. The cracks are the edges
 * of Worley cells on the sphere, slowly shifting; how wide and how hot the veins run encodes a
 * data attribute (value, read as load, by default), so a busy node glows and an idle one is
 * nearly dark rock. An additive halo adds the heat shimmer around hot nodes.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addHalo, DIM_EDGE_FRAGMENT, encodeArgType, SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Lava Node", ...labMeta };

interface Args extends GraphArgs {
    encode: number;
    veinWidth: number;
    glow: number;
    flow: number;
    crackScale: number;
    heatHalo: number;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
void main() {
    vec3 n = labSphereNormal();
    vec3 w = toWorld(n);
    float rnd = vInfo.x;
    float load = pickData(encode);
    vec3 p = w * crackScale + rnd * 40.0;
    p += 0.45 * vec3(fbm(p * 0.5 + time * flow * 0.12), fbm(p * 0.5 + 5.2 - time * flow * 0.1), fbm(p * 0.5 + 9.1));
    vec2 v = voronoiTri(p, w);
    float edge = v.y - v.x;
    float width = 0.025 + veinWidth * load;
    float vein = 1.0 - smoothstep(width * 0.5, width, edge);
    float core = 1.0 - smoothstep(0.0, width * 0.4, edge);
    float heat = fbm(p * 1.4 + vec3(0.0, time * flow * 0.8, 0.0));
    float t = clamp(0.2 + 0.55 * load + 0.5 * (heat - 0.5) + 0.25 * core, 0.0, 1.0);
    vec3 lava = blackbody(t * 0.8) * glow * (0.55 + 0.9 * heat) * (0.35 + 0.65 * load);

    // crust: dark rough basalt tinted by the community color
    float rock = fbm(p * 2.6);
    float pits = noise(p * 9.0);
    vec3 crust = mix(vec3(0.045, 0.04, 0.038), vec3(0.17, 0.14, 0.12), rock) * (0.8 + 0.4 * pits);
    crust = mix(crust, crust * vColor.rgb * 2.2, 0.3);
    // plates bulge: shade each plate darker toward its edges
    float plate = smoothstep(0.0, 0.5, edge);
    vec3 crustLit = crust * (0.18 + 1.1 * lambert(n)) * (0.6 + 0.4 * plate) + specular(n, 24.0) * 0.08 * plate;
    // underglow on the plate edges near hot veins
    crustLit += blackbody(0.35) * 0.6 * (1.0 - smoothstep(width, width * 3.5, edge)) * load * glow;
    // level of detail: a node a few pixels wide shows its average heat instead of a fine net
    float detail = smoothstep(8.0, 36.0, vPixelRadius);
    vec3 col = mix(crustLit, lava, mix(0.12 + 0.6 * load * load, vein, detail));
    col *= 1.0 + 0.4 * vState.x;
    col += vec3(1.0, 0.6, 0.3) * 0.35 * vState.y * pow(1.0 + n.z, 2.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

const HALO_FRAGMENT = `
void main() {
    float r = length(vUV);
    if (r < 0.97) discard;
    float load = pickData(encode);
    vec2 dir = vUV / r;
    float flick = 0.75 + 0.5 * noise(vec3(dir * 3.0, time * 2.0 + vInfo.x * 30.0));
    float g = exp(-(r - 1.0) * 6.0) * load * load * heatHalo * flick * smoothstep(2.0, 1.5, r);
    gl_FragColor = vec4(blackbody(0.35 + 0.35 * load) * g, 1.0);
}
`;

export const LavaNode = {
    args: {
        ...graphArgs,
        encode: 0,
        veinWidth: 0.16,
        glow: 1.5,
        flow: 0.6,
        crackScale: 4.5,
        heatHalo: 0.9,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        encode: encodeArgType,
        veinWidth: range(0, 0.4),
        glow: range(0, 3),
        flow: range(0, 3),
        crackScale: range(1.5, 12, 0.25),
        heatHalo: range(0, 3),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#08050a",
            uniforms: {
                encode: args.encode,
                veinWidth: args.veinWidth,
                glow: args.glow,
                flow: args.flow,
                crackScale: args.crackScale,
                heatHalo: args.heatHalo,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: DIM_EDGE_FRAGMENT },
            setup: (ctx) => {
                addHalo(ctx, HALO_FRAGMENT, 2);
            },
        }),
};

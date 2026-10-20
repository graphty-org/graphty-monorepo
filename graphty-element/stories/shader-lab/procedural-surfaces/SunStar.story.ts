/**
 * Every node is a star: a boiling granulated photosphere (animated Worley cells over a warped
 * sphere) with limb darkening and sunspots, and a streaming corona in an additive halo layer.
 * Its temperature color encodes a data attribute (rank by default): dull red for low, blue-white
 * for high. Hover or select a star to make it flare.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addHalo, DIM_EDGE_FRAGMENT, encodeArgType, SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Sun Star", ...labMeta };

interface Args extends GraphArgs {
    encode: number;
    tempLow: number;
    tempHigh: number;
    granuleScale: number;
    boil: number;
    spots: number;
    corona: number;
    coronaReach: number;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
void main() {
    vec3 n = labSphereNormal();
    vec3 w = toWorld(n);
    float rnd = vInfo.x;
    float temp = mix(tempLow, tempHigh, sqrt(pickData(encode)));
    // slow rotation so the surface drifts
    float a = time * 0.05 + rnd * 6.0;
    w.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * w.xz;
    vec3 p = w * granuleScale + rnd * 50.0;
    vec3 warp = vec3(fbm(p * 0.4 + time * boil * 0.2), fbm(p * 0.4 + 7.3 - time * boil * 0.17), fbm(p * 0.4 + 3.1 + time * boil * 0.13));
    vec2 v = voronoiTri(p + warp * 1.6, w);
    float cell = 1.0 - smoothstep(0.0, 0.85, v.x);
    float lane = smoothstep(0.0, 0.35, v.y - v.x);
    float gran = mix(0.5, 1.0, cell) * mix(0.55, 1.0, lane);
    // level of detail: a star a few pixels wide shows its average color instead of shimmering static
    float detail = smoothstep(10.0, 40.0, vPixelRadius);
    gran = mix(0.85, gran, detail);
    float facing = -n.z;
    float limb = pow(facing, 0.5);
    vec3 hot = blackbody(temp + 0.08) * 1.3;
    vec3 cool = blackbody(temp - 0.22);
    vec3 col = mix(cool, hot, gran) * (0.15 + 1.1 * gran * gran);
    col = mix(blackbody(temp - 0.35) * 0.7, col, limb);
    // sunspots: dark umbra, brown penumbra
    float sp = fbm(w * 2.4 + rnd * 13.0 + time * 0.015);
    float pen = smoothstep(0.7 - spots * 0.12, 0.74 - spots * 0.12, sp) * step(0.01, spots);
    float umb = smoothstep(0.76 - spots * 0.12, 0.79 - spots * 0.12, sp) * step(0.01, spots);
    col *= 1.0 - (0.55 * pen + 0.4 * umb) * detail;
    // faculae: bright mottling near the limb
    col += hot * 0.25 * smoothstep(0.55, 0.7, fbm(p * 0.5)) * (1.0 - facing);
    col *= mix(vec3(1.0), vec3(0.7, 0.85, 1.25), smoothstep(0.75, 1.0, temp));
    col *= 1.0 + 0.35 * vState.x + 0.35 * vState.y;
    // soft shoulder so hot stars keep their granulation instead of clipping to white
    col = col / (1.0 + 0.2 * col);
    gl_FragColor = vec4(col, 1.0);
}
`;

const HALO_FRAGMENT = `
void main() {
    float r = length(vUV);
    if (r < 0.97) discard;
    vec2 dir = vUV / r;
    float rnd = vInfo.x;
    float temp = mix(tempLow, tempHigh, sqrt(pickData(encode)));
    float flare = 1.0 + 1.2 * vState.x + 1.2 * vState.y;
    float base = exp(-(r - 1.0) * coronaReach);
    float streams = fbm(vec3(dir * 3.0, r * 1.6 - time * boil * 0.7 + rnd * 10.0));
    float rays = pow(fbm(vec3(dir * 7.0 + rnd * 5.0, time * 0.08)), 2.5) * 3.0;
    float g = base * (0.35 + 1.1 * streams) + exp(-(r - 1.0) * coronaReach * 0.35) * rays * 0.35;
    g *= corona * flare * smoothstep(3.4, 2.2, r);
    g += exp(-(r - 1.0) * 30.0) * 0.6;
    vec3 c = blackbody(temp + 0.1) * mix(vec3(1.0), vec3(0.6, 0.8, 1.3), smoothstep(0.75, 1.0, temp)) * g;
    gl_FragColor = vec4(c, 1.0);
}
`;

export const SunStar = {
    args: {
        ...graphArgs,
        encode: 1,
        tempLow: 0.15,
        tempHigh: 1,
        granuleScale: 9,
        boil: 0.7,
        spots: 0.4,
        corona: 0.4,
        coronaReach: 4.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        encode: encodeArgType,
        tempLow: range(0, 1),
        tempHigh: range(0, 1),
        granuleScale: range(2, 24, 0.5),
        boil: range(0, 3),
        spots: range(0, 1),
        corona: range(0, 3),
        coronaReach: range(1, 12),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#020208",
            uniforms: {
                encode: args.encode,
                tempLow: args.tempLow,
                tempHigh: args.tempHigh,
                granuleScale: args.granuleScale,
                boil: args.boil,
                spots: args.spots,
                corona: args.corona,
                coronaReach: args.coronaReach,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: DIM_EDGE_FRAGMENT },
            setup: (ctx) => {
                addHalo(ctx, HALO_FRAGMENT, 3.4);
            },
        }),
};

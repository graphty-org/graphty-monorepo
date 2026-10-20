/**
 * Node age as material wear. New nodes are glossy, saturated and clear-coated; old ones fade to
 * sepia, lose their shine, grow craquelure and green verdigris blotches. Age comes from arrival
 * order (node index; in the scale-free "weighted" graph that is the order nodes joined) or from a
 * random number. "elapsed" pushes every node older, and "cycle" sweeps it back and forth.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Aging Patina", ...labMeta };

interface Args extends GraphArgs {
    ageSource: number;
    elapsed: number;
    cycle: boolean;
    crackDensity: number;
    verdigris: number;
    grain: number;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
void main() {
    vec3 n = labSphereNormal();
    vec3 w = toWorld(n);
    float facing = -n.z;
    float rnd = vInfo.x;
    float age = mix(vCustom.x, vCustom.y, ageSource) + elapsed + cycle * 0.6 * sin(time * 0.5);
    age = clamp(age, 0.0, 1.0);

    // color: saturated when new, sepia and darker when old
    vec3 albedo = vColor.rgb;
    vec3 sepia = vec3(luminance(albedo)) * vec3(1.25, 1.0, 0.72);
    vec3 c = mix(albedo, sepia, smoothstep(0.15, 0.75, age));
    c *= mix(1.0, 0.68, age);

    // verdigris blotches spread from the crevices as the node ages
    float vg = fbm(w * 3.2 + rnd * 17.0);
    float th = 0.74 - 0.3 * age * verdigris;
    float vmask = smoothstep(th, th + 0.04, vg) * smoothstep(0.3, 0.6, age) * step(0.001, verdigris);
    vec3 verdi = mix(vec3(0.25, 0.56, 0.47), vec3(0.5, 0.78, 0.68), noise(w * 14.0));
    c = mix(c, verdi, vmask * 0.88);

    // craquelure: crack lines get denser and darker with age
    vec2 v = voronoiTri(w * (2.5 + 7.0 * crackDensity * age) + rnd * 9.0, w);
    float crack = (1.0 - smoothstep(0.0, 0.045, v.y - v.x)) * smoothstep(0.35, 0.85, age) * step(0.001, crackDensity);
    float detail = smoothstep(8.0, 30.0, vPixelRadius);
    c *= 1.0 - 0.75 * crack * detail;

    // grain (fixed to the surface, so it does not crawl)
    c *= 1.0 + detail * grain * age * (hash13(floor(w * 160.0)) - 0.5) * 0.7;

    // shading: sharp specular and a clear-coat horizon reflection when new, matte when old
    float spec = specular(n, mix(90.0, 8.0, age)) * mix(1.1, 0.06, age);
    float horizon = smoothstep(-0.15, 0.35, n.y);
    vec3 env = mix(vec3(0.08, 0.08, 0.1), vec3(0.85, 0.9, 1.0), horizon) * pow(1.0 - facing, 3.0) * (1.0 - age);
    vec3 col = c * (0.22 + 0.9 * lambert(n)) + vec3(spec) + env * 0.7;
    // old nodes: darker toward the edge, like an old photograph
    col *= mix(1.0, 0.55 + 0.45 * smoothstep(0.0, 0.7, facing), age);
    col = mix(col, col * 1.25 + 0.06, vState.x * 0.7);
    col += vec3(1.0, 0.9, 0.6) * stroke(length(vUV) - 0.96, 0.03) * vState.y;
    gl_FragColor = vec4(col, 1.0);
}
`;

export const AgingPatina = {
    args: {
        ...graphArgs,
        graph: "weighted",
        ageSource: 0,
        elapsed: 0,
        cycle: false,
        crackDensity: 0.6,
        verdigris: 0.7,
        grain: 0.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        ageSource: { control: "select", options: [0, 1], labels: { 0: "arrival order", 1: "random" } },
        elapsed: range(-1, 1),
        cycle: { control: "boolean" },
        crackDensity: range(0, 1),
        verdigris: range(0, 1),
        grain: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0d0b09",
            uniforms: {
                ageSource: args.ageSource,
                elapsed: args.elapsed,
                cycle: args.cycle,
                crackDensity: args.crackDensity,
                verdigris: args.verdigris,
                grain: args.grain,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                // age 1 = the first node to arrive, 0 = the last
                custom: (i, g) => [1 - i / Math.max(1, g.n - 1), g.random[i], 0, 0],
            },
        }),
};

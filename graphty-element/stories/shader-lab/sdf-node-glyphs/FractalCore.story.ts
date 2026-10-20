/**
 * Fractal core: every node holds its own animated Julia set. The constant c sits just inside the
 * edge of the Mandelbrot set's main cardioid, at an angle set by the node's PageRank and its random
 * seed, then drifts with time,
 * so each node has a visual fingerprint that slowly breathes. Hover a node to make its fractal
 * dive faster. Smooth iteration counts feed a cosine palette shifted by community.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Fractal Core", ...labMeta };

interface Args extends GraphArgs {
    iterations: number;
    zoom: number;
    drift: number;
    colorCycle: number;
    glow: number;
    rimColor: string;
}

const NODE_FRAGMENT = `
void main() {
    vec2 p = vUV;
    float r = length(p);
    float a = fill(r - 0.95);
    float halo = exp(-max(r - 0.95, 0.0) * 10.0) * glow;
    float sel = vState.y * stroke(r - 1.1, 0.035);
    if (max(max(a, sel), halo * 0.4) <= 0.003) discard;

    float speed = drift * (1.0 + 3.0 * vState.x);
    // c walks just inside the edge of the Mandelbrot cardioid, where every Julia set is connected
    // and intricate (rabbits, dendrites, spirals), so no node turns into dust
    float theta = vData.y * TAU + vInfo.x * TAU + time * speed;
    vec2 e1 = vec2(cos(theta), sin(theta));
    vec2 e2 = vec2(cos(2.0 * theta), sin(2.0 * theta));
    vec2 cc = (0.5 * e1 - 0.25 * e2) * 0.985;
    vec2 z = p * zoom;
    float n = 0.0;
    float escaped = 0.0;
    float trap = 10.0;
    for (int i = 0; i < 96; i++) {
        if (float(i) >= iterations) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cc;
        trap = min(trap, min(abs(length(z) - 0.5), min(abs(z.x), abs(z.y)) * 1.5));   // ring + cross trap: filaments inside
        if (dot(z, z) > 256.0) { escaped = 1.0; break; }
        n += 1.0;
    }
    float sn = n - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
    float t = clamp(sn / iterations, 0.0, 1.0);
    vec3 pd = vec3(0.0, 0.1, 0.2) + vData.w * 0.12;
    vec3 c = palette(pow(t, 0.4) * 1.5 + time * colorCycle, vec3(0.5), vec3(0.5), vec3(1.0), pd);
    c *= smoothstep(0.02, 0.5, pow(t, 0.5)) * 1.3;
    // inside the set: an orbit-trap glow in the node's own color
    vec3 inside = vColor.rgb * (0.05 + 1.0 * exp(-trap * 30.0)) + vec3(1.0) * exp(-trap * 120.0) * 0.35;
    c = mix(inside, c, escaped);
    // glassy rim and vignette
    c *= mix(1.0, 0.55, smoothstep(0.6, 0.95, r));
    c = mix(c, rimColor, stroke(r - 0.93, 0.025) * 0.9);
    c += vec3(1.0) * 0.18 * smoothstep(0.3, 0.0, length(p - vec2(-0.35, 0.4)));

    vec3 col = mix(rimColor * halo, c, a);
    col = mix(col, vec3(1.0), sel);
    gl_FragColor = vec4(col, max(max(a, sel), halo * 0.4));
}
`;

export const FractalCore = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2.2,
        iterations: 64,
        zoom: 1.5,
        drift: 0.15,
        colorCycle: 0.05,
        glow: 0.6,
        rimColor: "#9fd8ff",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        iterations: range(8, 96, 1),
        zoom: range(0.5, 3),
        drift: range(0, 1),
        colorCycle: range(0, 0.5),
        glow: range(0, 1.5),
        rimColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                iterations: args.iterations,
                zoom: args.zoom,
                drift: args.drift,
                colorCycle: args.colorCycle,
                glow: args.glow,
                rimColor: args.rimColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.25, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

/**
 * Energy plasma flow: turbulent plasma streams from source to target inside each edge. The noise
 * scrolls along the edge in pixels, warped by a second noise so it curls; heavier edges flow
 * faster and boil harder. A cosine palette maps the plasma's density to color.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, DARK_NODE_FRAGMENT, RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Energy Flow", ...labMeta };

interface Args extends GraphArgs {
    speed: number;
    flowScale: number;
    turbulence: number;
    weightEffect: number;
    intensity: number;
    hueShift: number;
    bloom: number;
    bloomRadius: number;
}

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
void main() {
    float cov = labEdgeCoverage();
    float w = vData.x;
    float k = mix(1.0, 0.4 + 1.6 * w, weightEffect);
    // pixel coordinates scaled to the noise; the ribbon's own width sets the across scale
    vec2 p = vec2(ribbonX() / (flowScale * ribbonHalf() * 2.0), vSide * 0.9);
    float flow = time * speed * k;
    vec2 q = vec2(p.x - flow, p.y + vData.w * 10.0);
    // one domain warp makes the plasma curl
    vec2 warp = vec2(fbm(q * 1.3 + vec2(0.0, time * 0.3)), fbm(q * 1.3 + vec2(5.2, -time * 0.25)));
    float n = fbm(q + turbulence * k * (warp - 0.5) * 2.0);
    float core = exp(-vSide * vSide * 1.4) * smoothstep(1.05, 0.7, abs(vSide));
    float dens = smoothstep(0.22, 0.68, n) * core;
    vec3 col = palette(n * 1.4 + hueShift + 0.2 * vData.y / 8.0,
                       vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));
    vec3 c = col * dens * intensity + vec3(1.0, 0.95, 0.9) * pow(dens, 4.0) * intensity * 0.5;
    // a hot filament down the middle
    c += col * exp(-vSide * vSide * 30.0) * 0.35 * intensity;
    c *= 1.0 + 1.5 * edgeLit();
    gl_FragColor = vec4(c, cov);
}
`;

export const EnergyFlow = {
    args: {
        ...graphArgs,
        nodeSize: 0.5,
        edgeWidth: 12,
        speed: 0.8,
        flowScale: 1.6,
        turbulence: 1.2,
        weightEffect: 1,
        intensity: 1,
        hueShift: 0.55,
        bloom: 0.6,
        bloomRadius: 4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        speed: range(-3, 3),
        flowScale: range(0.3, 6),
        turbulence: range(0, 3),
        weightEffect: range(0, 1),
        intensity: range(0, 3),
        hueShift: range(0, 1),
        bloom: range(0, 3),
        bloomRadius: range(0.5, 10),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#03020a",
            uniforms: {
                speed: args.speed,
                flowScale: args.flowScale,
                turbulence: args.turbulence,
                weightEffect: args.weightEffect,
                intensity: args.intensity,
                hueShift: args.hueShift,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: DARK_NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, blend: "add" },
            post: [BLOOM_POST],
        }),
};

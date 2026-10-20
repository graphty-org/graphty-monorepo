/**
 * Source-to-target gradient: each edge blends from its source community's color to its target's,
 * so a reader sees which communities an edge connects and which way it points. The blend runs in
 * OKLab, a perceptual color space, which keeps the middle of a red-to-green edge from turning muddy
 * brown (switch `perceptual` off to compare with a plain RGB blend). A faint shimmer scrolls toward
 * the target to confirm direction.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Gradient Edges", ...labMeta };

interface Args extends GraphArgs {
    perceptual: boolean;
    shimmer: number;
    shimmerSpeed: number;
    wavelength: number;
    opacity: number;
    saturation: number;
}

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toGamma(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
// Bjorn Ottosson's OKLab
vec3 linearToOklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    l = pow(l, 1.0 / 3.0); m = pow(m, 1.0 / 3.0); s = pow(s, 1.0 / 3.0);
    return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLinear(vec3 c) {
    float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
void main() {
    float a = labEdgeCoverage();
    vec3 c;
    if (perceptual > 0.5) {
        vec3 la = linearToOklab(toLinear(vColorA.rgb));
        vec3 lb = linearToOklab(toLinear(vColorB.rgb));
        vec3 lab = mix(la, lb, vT);
        lab.yz *= saturation;
        // a pixel-length wave of lightness, scrolling to the target
        lab.x += shimmer * 0.15 * sin(TAU * (ribbonX() / wavelength - time * shimmerSpeed));
        c = toGamma(oklabToLinear(lab));
    } else {
        c = mix(vColorA.rgb, vColorB.rgb, vT);
        c *= 1.0 + shimmer * 0.3 * sin(TAU * (ribbonX() / wavelength - time * shimmerSpeed));
    }
    float lit = edgeLit();
    c = mix(c, vec3(1.0), 0.3 * lit);
    gl_FragColor = vec4(c, a * mix(opacity, 1.0, lit));
}
`;

export const GradientEdges = {
    args: {
        ...graphArgs,
        nodeSize: 0.6,
        edgeWidth: 4,
        perceptual: true,
        shimmer: 0.6,
        shimmerSpeed: 0.6,
        wavelength: 40,
        opacity: 0.85,
        saturation: 1.15,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        perceptual: { control: "boolean" },
        shimmer: range(0, 2),
        shimmerSpeed: range(-3, 3),
        wavelength: range(5, 200, 1),
        opacity: range(0.1, 1),
        saturation: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                perceptual: args.perceptual,
                shimmer: args.shimmer,
                shimmerSpeed: args.shimmerSpeed,
                wavelength: args.wavelength,
                opacity: args.opacity,
                saturation: args.saturation,
            },
            edgeLayer: { fragment: EDGE_FRAGMENT },
        }),
};

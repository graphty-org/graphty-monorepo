/**
 * Colorblind patterns: each community gets a texture (diagonal stripes, horizontal stripes, dots,
 * checks, crosshatch, rings, diamonds, solid) on top of its color, so the categories stay distinct when the hues do
 * not. Turn on `simulate` to see the whole picture as a reader with protanopia, deuteranopia or
 * tritanopia would (Machado 2009 matrices), or in grayscale, and watch the patterns carry it.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/SDF Node Glyphs/Colorblind Patterns", ...labMeta };

interface Args extends GraphArgs {
    simulate: number;
    density: number;
    contrast: number;
    rotate: number;
}

const CVD = `
vec3 simulateCvd(vec3 c, float mode) {
    if (mode < 0.5) return c;
    if (mode < 1.5) return vec3(dot(vec3(0.152286, 1.052583, -0.204868), c), dot(vec3(0.114503, 0.786281, 0.099216), c), dot(vec3(-0.003882, -0.048116, 1.051998), c));
    if (mode < 2.5) return vec3(dot(vec3(0.367322, 0.860646, -0.227968), c), dot(vec3(0.280085, 0.672501, 0.047413), c), dot(vec3(-0.011820, 0.042940, 0.968881), c));
    if (mode < 3.5) return vec3(dot(vec3(1.255528, -0.076749, -0.178779), c), dot(vec3(-0.078411, 0.930809, 0.147602), c), dot(vec3(0.004733, 0.691367, 0.303900), c));
    return vec3(luminance(c));
}
`;

const NODE_FRAGMENT = `
${CVD}
// 1 inside the pattern's ink, anti-aliased. k picks the pattern, q is in node radii.
float pattern(float k, vec2 q) {
    k = mod(k, 8.0);
    float f = clamp(vPixelRadius / 7.0, 1.5, density);   // >= ~7 px per cycle, so small nodes do not alias to mush
    if (k < 0.5) { float x = (q.x + q.y) * f * 0.7071; return fill((abs(fract(x) - 0.5) - 0.22) / f); }
    if (k < 1.5) { float x = q.y * f; return fill((abs(fract(x) - 0.5) - 0.2) / f); }
    if (k < 2.5) { vec2 g = fract(q * f) - 0.5; return fill((length(g) - 0.26) / f); }
    if (k < 3.5) { vec2 g = fract(q * f * 0.5) - 0.5; return fill(g.x * g.y / f); }
    if (k < 4.5) {
        float la = fill((0.36 - abs(fract((q.x + q.y) * f * 0.7071) - 0.5)) / f);
        float lb = fill((0.36 - abs(fract((q.x - q.y) * f * 0.7071) - 0.5)) / f);
        return max(la, lb);
    }
    if (k < 5.5) { float x = length(q) * f; return fill((abs(fract(x) - 0.5) - 0.22) / f); }
    if (k < 6.5) { vec2 g = abs(fract(q * f * 0.6) - 0.5); return fill((g.x + g.y - 0.32) / f); }   // diamonds
    return 0.0;   // solid
}
void main() {
    float d = length(vUV) - 0.92;
    float a = fill(d);
    float sel = vState.y * stroke(d - 0.12, 0.04);
    if (max(a, sel) <= 0.003) discard;
    vec2 q = rot2(rotate) * vUV;
    float ink = pattern(vData.w, q);
    vec3 base = vColor.rgb;
    float lum = luminance(base);
    vec3 inkC = lum > 0.45 ? base * (1.0 - contrast) : mix(base, vec3(1.0), contrast);
    vec3 c = mix(base, inkC, ink);
    c = mix(c, vec3(0.08), stroke(d + 0.04, 0.04));      // outline so shapes separate
    c = mix(c, vec3(1.0), 0.3 * vState.x);
    c = mix(c, vec3(1.0), sel);
    gl_FragColor = vec4(simulateCvd(c, simulate), max(a, sel));
}
`;

const EDGE_FRAGMENT = `
${CVD}
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(simulateCvd(mix(c * 0.8, vec3(1.0), 0.4 * lit), simulate), labEdgeCoverage() * mix(0.3, 0.9, lit));
}
`;

export const ColorblindPatterns = {
    args: { ...graphArgs, dim: 2, nodeSize: 2, simulate: 0, density: 4, contrast: 0.55, rotate: 0 } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        simulate: {
            control: "select",
            options: [0, 1, 2, 3, 4],
            labels: { 0: "normal vision", 1: "protanopia", 2: "deuteranopia", 3: "tritanopia", 4: "grayscale" },
        },
        density: range(2, 8, 0.1),
        contrast: range(0, 1),
        rotate: range(0, 3.14, 0.01),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: { simulate: args.simulate, density: args.density, contrast: args.contrast, rotate: args.rotate },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.15, blend: "alpha" },
            edgeLayer: { fragment: EDGE_FRAGMENT },
        }),
};

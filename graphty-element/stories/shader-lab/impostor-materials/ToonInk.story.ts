/**
 * Toon node with ink outline: comic-book shading on a ray-cast sphere. Light is quantized into
 * hard bands, the highlight is one crisp white dot, the shadow side is printed as a rotated
 * halftone dot screen, and the outline is a hand-drawn ink line whose width and wobble come from
 * noise around the rim. "boil" re-draws the line a few times a second, the way animators make
 * hand-drawn lines shimmer.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Toon Ink", ...labMeta };

interface Args extends GraphArgs {
    bands: number;
    inkWidth: number;
    wobble: number;
    boil: number;
    halftone: number;
    lightAngle: number;
    inkColor: string;
    paper: string;
    edgeInk: number;
}

const NODE_FRAGMENT = `${LIGHTING}
void main() {
    float r = length(vUV);
    vec2 dir = vUV / max(r, 1e-4);
    float boilStep = floor(time * boil);
    float seed = vInfo.x * 37.0;
    // the drawn rim wobbles around the true sphere edge
    float wob = noise(vec3(dir * 2.2, seed + boilStep * 1.7)) - 0.5;
    float rimR = 1.0 + wob * wobble * 0.22;
    float sel = vState.y;
    float w = inkWidth * (0.55 + 0.9 * noise(vec3(dir * 3.5, seed * 0.7 + boilStep * 2.3))) * (1.0 + sel * 0.8);
    float outer = rimR + w * 0.3;
    if (r > outer) discard;

    // the sphere under the pen line (r is rescaled so the shading fills the drawn shape)
    vec2 uv = vUV / max(rimR, 0.5);
    float r2 = min(dot(uv, uv), 1.0);
    vec3 n = vec3(uv, -sqrt(1.0 - r2));
    vec4 clip = projection * vec4(vCenterView + n * vRadius, 1.0);
    gl_FragDepthEXT = 0.5 * clip.z / clip.w + 0.5;

    float a = lightAngle * TAU;
    vec3 l = normalize(vec3(cos(a) * 0.75, 0.65, sin(a) * 0.75 - 0.5));
    float ndl = dot(n, l);
    float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    float q = floor(lit * bands) / max(bands - 1.0, 1.0);
    vec3 base = mix(vColor.rgb, vec3(1.0), 0.12 + 0.25 * vState.x);
    vec3 c = base * mix(0.5, 1.08, q);

    // halftone in the shadow: dot size grows with darkness
    float shade = clamp(1.0 - lit * 1.6, 0.0, 1.0);
    vec2 cell = rot2(0.785) * gl_FragCoord.xy / (halftone * pixelRatio);
    vec2 f = fract(cell) - 0.5;
    float dotR = sqrt(shade) * 0.55;
    float dots = 1.0 - smoothstep(dotR - 0.08, dotR + 0.08, length(f));
    c = mix(c, base * 0.28, dots * step(0.01, shade));

    // hard specular glint
    vec3 h = normalize(l + vec3(0.0, 0.0, -1.0));
    float spec = dot(n, h);
    c = mix(c, vec3(1.0), smoothstep(0.955, 0.965, spec));

    // ink: the band between the inner and outer edge of the pen stroke
    float ink = smoothstep(outer - w - 0.03, outer - w, r);
    vec3 inkC = mix(inkColor, vec3(0.82, 0.16, 0.12), sel);
    c = mix(c, inkC, ink);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    float pen = 0.45 + 0.55 * noise(vec2(vT * vLengthPx * 0.04, vData.w * 50.0));
    float d = abs(vSide) / pen;
    float a = 1.0 - smoothstep(1.0 - fwidth(vSide), 1.0 + fwidth(vSide), d);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec3 c = mix(inkColor, mix(vColorA.rgb, vColorB.rgb, vT) * 0.8, lit);
    gl_FragColor = vec4(c, a * mix(edgeInk, 1.0, lit));
}
`;

export const ToonInk = {
    args: {
        ...graphArgs,
        nodeSize: 1.2,
        edgeWidth: 1.75,
        bands: 3,
        inkWidth: 0.16,
        wobble: 0.5,
        boil: 4,
        halftone: 5,
        lightAngle: 0.12,
        inkColor: "#1b1720",
        paper: "#f3ead6",
        edgeInk: 0.45,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        bands: range(2, 6, 1),
        inkWidth: range(0, 0.4),
        wobble: range(0, 1),
        boil: range(0, 12, 0.5),
        halftone: range(2, 12, 0.5),
        lightAngle: range(0, 1),
        inkColor: { control: "color" },
        paper: { control: "color" },
        edgeInk: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: args.paper,
            uniforms: {
                bands: args.bands,
                inkWidth: args.inkWidth,
                wobble: args.wobble,
                boil: args.boil,
                halftone: args.halftone,
                lightAngle: args.lightAngle,
                inkColor: args.inkColor,
                edgeInk: args.edgeInk,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.25 },
            edgeLayer: { fragment: EDGE_FRAGMENT, segments: 8 },
        }),
};

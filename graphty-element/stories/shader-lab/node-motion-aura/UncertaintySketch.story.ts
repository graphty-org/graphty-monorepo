/**
 * Uncertainty fuzz and sketch: how sure we are about a node or an edge, drawn as how carefully it
 * was drawn. Certain things are crisp ink; uncertain nodes go soft and grainy with a hesitant,
 * re-drawn outline, and uncertain edges wobble like a pencil line that will not hold still (the
 * hand "boils" a few times a second, as in hand-drawn animation). On paper, or on a dark sheet.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Uncertainty Sketch", ...labMeta };

const SOURCES = ["value", "rank", "random"] as const;

interface Args extends GraphArgs {
    uncertaintyFrom: (typeof SOURCES)[number];
    amount: number;
    wobble: number;
    boilRate: number;
    grain: number;
    paper: boolean;
    inkColor: string;
}

// a node's uncertainty in nodeCustom.x, an edge's in edgeCustom.x (the larger of its ends)
const NODE_FRAGMENT = `
void main() {
    float u = clamp(vCustom.x * amount, 0.0, 1.0);
    float boil = floor(time * boilRate);
    float r = length(vUV);
    float ang = atan(vUV.y, vUV.x);
    // the outline is redrawn each boil frame with a slightly different, uneven radius
    float wob = (noise(vec2(ang * 1.7 + vInfo.x * 40.0, boil * 3.1)) - 0.5) * 0.25 * u;
    float d = r - (1.0 + wob);
    float soft = fwidth(r) + u * 0.45;
    float fillA = 1.0 - smoothstep(-soft, soft, d);
    // grain: dithered speckle that eats into uncertain fills
    float g = hash12(floor(gl_FragCoord.xy / max(pixelRatio, 1.0)) + boil * 7.0);
    fillA *= mix(1.0, step(u * grain * 0.85, g), u);
    // pencil outline: one firm stroke when certain, two loose offset strokes when not
    float w = 0.06 + 0.02 * (1.0 - u);
    float s1 = stroke(d, w);
    float wob2 = (noise(vec2(ang * 2.3 - vInfo.x * 13.0, boil * 5.7 + 9.0)) - 0.5) * 0.4 * u;
    float s2 = stroke(r - (1.05 + wob2), w * 0.7) * u;
    float line = max(s1 * (1.0 - 0.5 * u), s2 * 0.7);
    line *= mix(1.0, 0.55 + 0.45 * hash12(gl_FragCoord.xy * 0.7 + boil), u);
    vec3 wash = paper > 0.5 ? mix(vColor.rgb, vec3(0.97, 0.95, 0.9), 0.35) : vColor.rgb * 0.85;
    vec3 c = mix(wash, inkColor, line);
    float a = max(fillA * mix(0.95, 0.55, u), line);
    a = max(a, (0.5 * vState.x + 0.6 * vState.y) * stroke(r - 1.25, 0.05));
    if (a <= 0.01) discard;
    gl_FragColor = vec4(c, a);
}
`;

const EDGE_HOOKS = `
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float u = clamp(edgeCustom.x * amount, 0.0, 1.0);
    vec3 p = mix(a, b, t);
    vec3 ab = b - a;
    vec3 side = cross(ab, p - cameraPosition);
    float ls = length(side);
    side = ls > 1e-5 ? side / ls : vec3(0.0);
    float boil = floor(time * boilRate);
    float n = noise(vec2(t * 3.5 + edgeInfo.z * 0.37, boil * 7.3 + edgeInfo.z)) - 0.5;
    return p + side * n * u * wobble * length(ab) * 0.18 * sin(PI * t);
}
`;

const EDGE_FRAGMENT = `
void main() {
    float u = clamp(vCustom.x * amount, 0.0, 1.0);
    float boil = floor(time * boilRate);
    // wider, softer falloff across uncertain edges, and a dry broken stroke along them
    float w = fwidth(vSide) + u * 0.7;
    float cov = 1.0 - smoothstep(1.0 - w, 1.0 + w * 0.5, abs(vSide));
    float along = vT * vLengthPx / max(pixelRatio, 1.0);
    float dry = noise(vec2(along * 0.35, vSide * 2.0 + boil * 3.0));
    cov *= mix(1.0, smoothstep(0.25, 0.6, dry), u * grain);
    vec3 c = mix(inkColor, mix(vColorA.rgb, vColorB.rgb, vT), 0.35);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(c, cov * mix(0.8, 0.4, u) * mix(1.0, 1.25, lit));
}
`;

function uncertainty(kind: Args["uncertaintyFrom"], v: number, rank: number, random: number): number {
    if (kind === "rank") {
        return 1 - Math.sqrt(rank);
    }
    return kind === "random" ? random : v;
}

export const UncertaintySketch = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 1.4,
        edgeWidth: 1.75,
        uncertaintyFrom: "value",
        amount: 1.2,
        wobble: 1,
        boilRate: 8,
        grain: 0.8,
        paper: true,
        inkColor: "#2b2a33",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        uncertaintyFrom: { control: "select", options: SOURCES },
        amount: range(0, 2),
        wobble: range(0, 3),
        boilRate: range(0, 24, 1),
        grain: range(0, 1),
        paper: { control: "boolean" },
        inkColor: { control: "color" },
    },
    render: (args: Args) => {
        const from = args.uncertaintyFrom;
        const unc = (i: number, g: { value: Float32Array; rank: Float32Array; random: Float32Array }): number =>
            uncertainty(from, g.value[i], g.rank[i], g.random[i]);
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: args.paper ? "#f2ede1" : "#14141a",
            uniforms: {
                amount: args.amount,
                wobble: args.wobble,
                boilRate: args.boilRate,
                grain: args.grain,
                paper: args.paper,
                inkColor: args.inkColor,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                quadScale: 1.6,
                blend: "alpha",
                custom: (i, g) => [unc(i, g), 0, 0, 0],
            },
            edgeLayer: {
                fragment: EDGE_FRAGMENT,
                vertexHooks: EDGE_HOOKS,
                segments: 24,
                custom: (e, g) => [Math.max(unc(g.src[e], g), unc(g.dst[e], g)), 0, 0, 0],
            },
            rebuildOn: [from],
        });
    },
};

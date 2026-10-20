/**
 * Sparkline badge: each node is a small card with a line chart of its value over the last 32 time
 * steps, scrolling left as new samples arrive, with a gradient area fill and a glowing "now" dot.
 * The line is green when the series ends higher than it started, red when lower. The series here
 * is synthetic (seeded noise around the node's value); real data would come from a float texture
 * with one row per node.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Sparkline Badge", ...labMeta };

interface Args extends GraphArgs {
    scrollSpeed: number;
    volatility: number;
    lineWidth: number;
    areaFill: number;
    upColor: string;
    downColor: string;
}

const NODE_FRAGMENT = `
const float N = 32.0;
// sample k of this node's series, 0..1
float series(float k) {
    float seed = vInfo.x * 97.0;
    float n = noise(vec2(k * 0.23, seed)) * 0.65 + noise(vec2(k * 0.71, seed + 13.0)) * 0.35;
    return clamp(mix(vData.z, n, volatility) * 0.9 + 0.05, 0.0, 1.0);
}
void main() {
    vec2 cardSize = vec2(1.0, 0.62);
    float card = sdRoundBox(vUV, cardSize, 0.2);
    float a = fill(card);
    float sel = vState.y * stroke(card - 0.08, 0.035);
    if (max(a, sel) <= 0.003) discard;

    // plot area inside the card
    vec2 lo = vec2(-0.82, -0.42);
    vec2 hi = vec2(0.82, 0.3);
    vec2 q = (vUV - lo) / (hi - lo);             // 0..1 in the plot
    float T = time * scrollSpeed;
    float base = floor(T);
    float slide = fract(T);
    // x of sample k is (k - slide) / (N - 2): sample N-1 enters on the right as the series scrolls
    float fx = q.x * (N - 2.0) + slide;
    float k0 = floor(fx);
    float dLine = 10.0;
    for (int j = -1; j <= 1; j++) {
        float k = k0 + float(j);
        vec2 pa = vec2((k - slide) / (N - 2.0), series(base + k));
        vec2 pb = vec2((k + 1.0 - slide) / (N - 2.0), series(base + k + 1.0));
        pa = lo + pa * (hi - lo);
        pb = lo + pb * (hi - lo);
        dLine = min(dLine, sdSegment(vUV, pa, pb));
    }
    float yHere = mix(series(base + k0), series(base + k0 + 1.0), fract(fx));
    float under = step(q.y, yHere) * step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y);

    float first = series(base + 1.0);
    float last = series(base + N - 1.0);
    vec3 lineC = last >= first ? upColor : downColor;

    vec3 c = mix(vec3(0.09, 0.1, 0.14), vec3(0.13, 0.14, 0.19), vUV.y * 0.5 + 0.5);
    // community stripe across the top
    c = mix(c, vColor.rgb, smoothstep(0.42, 0.44, vUV.y));
    // faint grid
    float grid = stroke(fract(q.y * 3.0) - 0.5, 0.01) * step(0.0, q.y) * step(q.y, 1.0);
    c = mix(c, vec3(0.25), 0.25 * grid * step(0.0, q.x) * step(q.x, 1.0));
    c = mix(c, lineC, under * areaFill * (0.15 + 0.55 * q.y / max(yHere, 0.05)) * 0.6);
    float lineMask = fill(dLine - lineWidth * 0.5) * step(-0.02, q.x) * step(q.x, 1.02);
    c = mix(c, lineC * 1.2, lineMask);
    // now dot on the right end
    vec2 nowP = lo + vec2((N - 2.0 - slide) / (N - 2.0), series(base + N - 2.0) * (1.0 - slide) + series(base + N - 1.0) * slide) * (hi - lo);
    float nd = length(vUV - nowP);
    c = mix(c, vec3(1.0), fill(nd - lineWidth * 1.1));
    c += lineC * exp(-nd * 18.0) * 0.6 * (0.7 + 0.3 * sin(time * 5.0));
    // card rim
    c = mix(c, vColor.rgb * 0.8, stroke(card + 0.02, 0.02));
    c = mix(c, vec3(1.0), 0.15 * vState.x);
    c = mix(c, vec3(1.0), sel);
    gl_FragColor = vec4(c, max(a, sel));
}
`;

export const SparklineBadge = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2,
        scrollSpeed: 2,
        volatility: 0.8,
        lineWidth: 0.05,
        areaFill: 0.7,
        upColor: "#3ddc97",
        downColor: "#ff5d73",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        scrollSpeed: range(0, 10),
        volatility: range(0, 1),
        lineWidth: range(0.01, 0.15),
        areaFill: range(0, 1),
        upColor: { control: "color" },
        downColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                scrollSpeed: args.scrollSpeed,
                volatility: args.volatility,
                lineWidth: args.lineWidth,
                areaFill: args.areaFill,
                upColor: args.upColor,
                downColor: args.downColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.12, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

/**
 * Dew on spider silk: edges are near-invisible threads that sag a little under gravity and sway
 * in a breeze, beaded with droplets that catch the light. The number of beads is the edge weight.
 * Each droplet is a fake glass sphere drawn from its 2D distance: a dark refracting body, a
 * bright caustic crescent at the bottom, a fresnel rim and a specular glint that orbits as the
 * light moves. A soft bloom lets the glints sparkle.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, makeGraph, mountLab, range } from "../harness";
import { BLOOM_POST, edgeLength } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Dew On Silk", ...labMeta };

interface Args extends GraphArgs {
    sag: number;
    breeze: number;
    threadAlpha: number;
    maxBeads: number;
    beadSize: number;
    sparkle: number;
    lightSpeed: number;
    tint: number;
    bloom: number;
}

const EDGE_HOOKS = `
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float len = edgeCustom.x;
    float bow = 4.0 * t * (1.0 - t);
    vec3 down = vec3(0.0, -1.0, 0.0);
    vec3 wind = normalize(vec3(0.3, 0.0, 1.0));
    float gust = sin(time * 0.9 + edgeData.w * 20.0) * 0.6 + sin(time * 2.3 + edgeData.w * 7.0) * 0.25;
    return mix(a, b, t) + (down * sag + wind * gust * breeze) * 0.05 * len * bow;
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return 2.0 * beadSize * 1.6 + 2.0; }
`;

const EDGE_FRAGMENT = `
void main() {
    float pr = pixelRatio;
    float across = vSide * vWidthPx * 0.5;
    float thread = fill(abs(across) - 0.35 * pr) * threadAlpha;
    // beads: count from the weight, each jittered along the thread with its own size
    float count = 1.0 + floor(vData.x * maxBeads);
    float cell = floor(vT * count);
    float h = hash12(vec2(cell, vData.w * 131.0));
    float tc = (cell + 0.5 + (h - 0.5) * 0.3) / count;
    float spacingPx = vLengthPx / count;
    float r = beadSize * pr * (0.45 + 0.75 * fract(h * 7.3));
    r = min(r, spacingPx * 0.4);
    vec2 p = vec2((vT - tc) * vLengthPx, across);
    float d = length(p) - r;
    float cover = fill(d);
    float onBead = step(1.5 * pr, r) * cover;
    vec3 tintc = mix(vec3(0.85, 0.92, 1.0), mix(vColorA.rgb, vColorB.rgb, vT), tint);
    // fake sphere: normal from the disc position (screen up is +across only roughly, fine for a glint)
    vec2 q = clamp(p / max(r, 0.01), -1.0, 1.0);
    float nz = sqrt(max(1.0 - dot(q, q), 0.0));
    vec3 n = vec3(q, nz);
    float la = time * lightSpeed + vData.w * 3.0;
    vec3 L = normalize(vec3(cos(la) * 0.6, 0.55 + 0.25 * sin(la * 0.7), 0.7));
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0) * sparkle;
    float fres = pow(1.0 - nz, 3.0);
    float caustic = smoothstep(0.2, 0.9, -q.y * 0.8 + 0.2) * smoothstep(1.0, 0.6, length(q)) * 0.6;
    vec3 body = tintc * (0.07 + 0.25 * nz) + tintc * caustic;
    vec3 bead = body + tintc * fres * 0.9 + vec3(1.0) * spec * 2.5;
    float beadA = clamp(0.35 + fres * 0.6 + spec + caustic, 0.0, 1.0);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec3 threadC = tintc * (0.7 + 0.3 * sin(vT * 40.0 + time)) * (1.0 + lit);
    vec3 col = mix(threadC, bead, onBead);
    float a = max(thread * (1.0 + 2.0 * lit), onBead * beadA);
    if (a <= 0.003) discard;
    gl_FragColor = vec4(col, a);
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float a = fill(r - 1.0);
    if (a <= 0.0) discard;
    float nz = sqrt(max(1.0 - r * r, 0.0));
    vec3 tintc = mix(vec3(0.85, 0.92, 1.0), vColor.rgb, tint);
    vec3 c = tintc * (0.05 + 0.15 * nz) + tintc * pow(1.0 - nz, 3.0) * 0.6;
    c += vec3(1.0) * pow(max(dot(normalize(vec3(vUV, nz)), normalize(vec3(-0.4, 0.5, 0.8))), 0.0), 40.0) * sparkle;
    c = mix(c, vec3(1.0), 0.4 * vState.x + 0.4 * vState.y * stroke(r - 0.92, 0.06));
    gl_FragColor = vec4(c, a * (0.55 + 0.45 * (1.0 - nz)));
}
`;

// a dark forest-dawn gradient behind everything, so the glints have something to sparkle against
const BACKDROP_POST = `
void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    vec3 sky = mix(vec3(0.02, 0.035, 0.03), vec3(0.07, 0.09, 0.12), vUV.y);
    vec2 q = vUV - vec2(0.7, 0.8);
    sky += vec3(0.12, 0.1, 0.06) * exp(-dot(q, q) * 6.0);
    gl_FragColor = vec4(c + sky, 1.0);
}
`;

export const DewOnSilk = {
    args: {
        ...graphArgs,
        nodeSize: 0.3,
        sag: 1,
        breeze: 0.6,
        threadAlpha: 0.35,
        maxBeads: 5,
        beadSize: 5,
        sparkle: 1.6,
        lightSpeed: 0.5,
        tint: 0.25,
        bloom: 0.9,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        sag: range(-2, 4),
        breeze: range(0, 3),
        threadAlpha: range(0, 1),
        maxBeads: range(0, 20, 1),
        beadSize: range(1, 10),
        sparkle: range(0, 3),
        lightSpeed: range(0, 3),
        tint: range(0, 1),
        bloom: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: makeGraph(args.graph, { nodes: args.nodes, dim: args.dim }),
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#000000",
            uniforms: {
                sag: args.sag,
                breeze: args.breeze,
                threadAlpha: args.threadAlpha,
                maxBeads: args.maxBeads,
                beadSize: args.beadSize,
                sparkle: args.sparkle,
                lightSpeed: args.lightSpeed,
                tint: args.tint,
                bloom: args.bloom,
                bloomThreshold: 0.65,
                bloomRadius: 10,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, blend: "alpha" },
            edgeLayer: {
                segments: 24,
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e, g) => [edgeLength(g, e), 0, 0, 0],
            },
            post: [BACKDROP_POST, BLOOM_POST],
        }),
};

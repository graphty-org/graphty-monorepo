/**
 * Heat-haze refraction edges: every edge runs hot by its load (weight, and more when it touches
 * the hovered or selected node). The edge ribbons are drawn a second time, much wider, into a
 * half-float texture where each pixel stores a rising, noisy screen offset (summed where edges
 * cross); a full-screen pass then shifts the scene by that offset, so whatever is behind a busy
 * edge -- other edges, nodes, the faint backdrop grid -- wobbles like air over a hot road.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addPass, offscreen, rgb } from "./common";

export default {
    title: "Shader Lab/Scene render targets, backdrops and transitions/Heat Haze Edges",
    ...labMeta,
};

interface Args extends GraphArgs {
    strength: number;
    hazeWidth: number;
    rise: number;
    scale: number;
    minLoad: number;
    glow: number;
    grid: number;
    chroma: number;
}

const BACKGROUND = "#0a0c12";

// the ribbon is hazeWidth times wider than the visible line: the haze copy uses all of it
const EDGE_HOOKS = `
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth * hazeWidth; }
`;

const LOAD = `
float edgeLoad() {
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    return clamp(smoothstep(minLoad, 1.0, vData.x) + lit, 0.0, 1.5);
}
`;

const EDGE_FRAGMENT = `${LOAD}
void main() {
    float dpx = abs(vSide) * vWidthPx * 0.5;
    float core = max(edgeWidth * pixelRatio * 0.5, 0.6);
    float a = 1.0 - smoothstep(core - 0.7, core + 0.7, dpx);
    float load = edgeLoad();
    float flick = 0.85 + 0.15 * noise(vec2(vT * vLengthPx * 0.05 - time * 3.0, vInfo.z));
    vec3 cool = mix(vColorA.rgb, vColorB.rgb, vT) * 0.6;
    vec3 hot = blackbody(0.35 + 0.55 * load * flick) * 1.3;
    vec3 c = mix(cool, hot, smoothstep(0.05, 0.6, load));
    float halo = exp(-dpx / (core * 4.0)) * load * glow * 0.35;
    gl_FragColor = vec4(c, clamp(a * (0.55 + 0.45 * load) + halo, 0.0, 1.0));
}
`;

const HAZE_FRAGMENT = `${LOAD}
void main() {
    float hw = vWidthPx * 0.5;
    float dpx = abs(vSide) * hw;
    float fall = 1.0 - smoothstep(0.0, hw, dpx);
    fall *= fall;
    float load = edgeLoad();
    // screen-space noise rising up the screen, two octaves
    vec2 q = gl_FragCoord.xy / (scale * pixelRatio) - vec2(0.0, time * rise);
    vec2 n = vec2(noise(q), noise(q + 31.7)) - 0.5;
    n += 0.5 * (vec2(noise(q * 2.3 + 7.1), noise(q * 2.3 + 53.2)) - 0.5);
    gl_FragColor = vec4(n * fall * load * 2.0, fall * load, 1.0);
}
`;

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.3, 0.6, -0.75))), 0.0);
    vec3 c = vColor.rgb * (0.2 + 0.75 * diff) + vec3(0.5) * pow(diff, 40.0);
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

let live: Args | undefined;

export const HeatHazeEdges = {
    args: {
        ...graphArgs,
        edgeWidth: 1.25,
        strength: 18,
        hazeWidth: 14,
        rise: 1.2,
        scale: 24,
        minLoad: 0.35,
        glow: 1,
        grid: 0.5,
        chroma: 0.25,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        strength: range(0, 40),
        hazeWidth: range(2, 40),
        rise: range(0, 5),
        scale: range(2, 30),
        minLoad: { ...range(0, 1), description: "weight below which an edge runs cool" },
        glow: range(0, 3),
        grid: range(0, 1),
        chroma: range(0, 2),
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: BACKGROUND,
            uniforms: {
                hazeWidth: args.hazeWidth,
                rise: args.rise,
                scale: args.scale,
                minLoad: args.minLoad,
                glow: args.glow,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
            setup: (ctx) => {
                if (!ctx.edges) {
                    return;
                }
                const haze = offscreen(ctx, ctx.edges, EDGE_FRAGMENT, HAZE_FRAGMENT, { float: true, add: true });
                addPass(ctx, {
                    samples: 4,
                    uniforms: {
                        strength: () => live?.strength ?? 0,
                        grid: () => live?.grid ?? 0,
                        chroma: () => live?.chroma ?? 0,
                        bg: () => rgb(BACKGROUND),
                        pixelScale: () => ctx.engine.getRenderWidth() / Math.max(1, ctx.canvas.clientWidth),
                    },
                    samplers: { hazeSampler: () => ({ texture: haze }) },
                    fragment: `
void main() {
    vec4 h = texture2D(hazeSampler, vUV);
    // crossings sum their offsets: soft-clamp so dense clusters wobble, not shatter
    vec2 hv = h.xy / (1.0 + length(h.xy));
    vec2 off = hv * strength * pixelScale / resolution;
    vec2 uv = vUV + off;
    vec3 c = vec3(texture2D(textureSampler, uv + off * chroma * 0.3).r,
                  texture2D(textureSampler, uv).g,
                  texture2D(textureSampler, uv - off * chroma * 0.3).b);
    // a faint grid on the backdrop, so the refraction shows even where nothing is behind an edge
    float isBg = 1.0 - smoothstep(0.01, 0.04, length(c - bg));
    vec2 g = abs(fract(uv * resolution / 48.0 + 0.5) - 0.5) * 48.0;
    float line = 1.0 - smoothstep(0.5, 1.5, min(g.x, g.y));
    c += vec3(0.1, 0.13, 0.2) * line * grid * isBg;
    // warm shimmer where it is hottest
    c += vec3(1.0, 0.45, 0.15) * h.z * 0.06 * strength / 7.0;
    gl_FragColor = vec4(c, 1.0);
}`,
                });
            },
        });
    },
};

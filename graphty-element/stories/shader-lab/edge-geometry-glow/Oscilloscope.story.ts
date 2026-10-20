/**
 * Oscilloscope wave edges: every edge is a green phosphor sine trace scrolling from source to
 * target on a CRT with a graticule and scanlines. Frequency encodes the edge weight (heavier =
 * more cycles), amplitude encodes how different the two endpoints' values are (a calm flat line
 * between similar nodes, a big swing between dissimilar ones). Like a real beam the trace is
 * bright where it moves slowly (the crests) and faint on the steep flanks.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, makeGraph, mountLab, range } from "../harness";
import { BLOOM_POST, edgeLength, PERP_GLSL } from "./common";

export default { title: "Shader Lab/Curved And Displaced Edges/Oscilloscope", ...labMeta };

interface Args extends GraphArgs {
    phosphor: string;
    amplitude: number;
    frequency: number;
    scrollSpeed: number;
    beamFade: number;
    glow: number;
    graticule: number;
    scanlines: number;
    bloom: number;
}

// edgeCustom: x = world length, y = value difference of the endpoints 0..1
const WAVE_GLSL = `
float cyclesOf(float w, float len) { return frequency * (0.3 + 1.7 * w) * len / 10.0; }
float ampOf(float v) { return amplitude * (0.08 + 0.92 * v); }
float phaseOf(float t, float w, float len) { return TAU * (t * cyclesOf(w, len) - time * scrollSpeed); }
`;

const EDGE_HOOKS = `
${PERP_GLSL}
${WAVE_GLSL}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float y = ampOf(edgeCustom.y) * sin(phaseOf(t, edgeData.x, edgeCustom.x)) * sin(PI * t);
    return mix(a, b, t) + screenPerp(a, b) * y;
}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth + 8.0 * glow; }
`;

const EDGE_FRAGMENT = `
${WAVE_GLSL}
void main() {
    float len = max(vCustom.x, 1e-3);
    float ph = phaseOf(vT, vData.x, len);
    // slope of the trace (world units across per world unit along): the beam dims where it is fast
    float amp = ampOf(vCustom.y);
    float dy = amp * (TAU * cyclesOf(vData.x, len) * cos(ph) * sin(PI * vT) + PI * sin(ph) * cos(PI * vT)) / len;
    float beam = mix(1.0, 1.0 / sqrt(1.0 + dy * dy * 6.0), beamFade);
    float px = abs(vSide) * vWidthPx * 0.5;
    float coreHalf = edgeWidth * pixelRatio * 0.5;
    float core = 1.0 - smoothstep(coreHalf - 0.5, coreHalf + 0.8, px);
    float halo = exp(-px / (2.5 * pixelRatio)) * glow * (1.0 - smoothstep(0.8, 1.0, abs(vSide)));
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec3 col = (mix(phosphor, vec3(1.0), 0.5) * core + phosphor * halo * 0.6) * beam * (0.8 + 0.8 * lit);
    gl_FragColor = vec4(col, 1.0);
}
`;

const NODE_FRAGMENT = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    float ring = stroke(d + 0.12, 0.1);
    float pip = fill(length(vUV) - 0.22);
    vec3 c = phosphor * (ring + pip) * (0.9 + 0.6 * vState.x) + vec3(0.0, 0.02, 0.01);
    c = mix(c, vec3(1.0), 0.5 * vState.y * ring);
    gl_FragColor = vec4(c, a);
}
`;

// CRT: graticule (8 x 10 major divisions with minor ticks on the center lines), scanlines, vignette
const SCOPE_POST = `
void main() {
    vec2 uv = vUV;
    vec3 c = texture2D(textureSampler, uv).rgb;
    vec2 p = uv * resolution;
    float cell = resolution.y / 8.0;
    vec2 g = abs(fract(p / cell + 0.5) - 0.5) * cell;
    float grid = 1.0 - smoothstep(0.0, pixelRatio, min(g.x, g.y));
    vec2 cc = abs(p - resolution * 0.5);
    vec2 tk = abs(fract(p / (cell / 5.0) + 0.5) - 0.5) * cell / 5.0;
    float ticks = (1.0 - smoothstep(0.0, pixelRatio, tk.x)) * step(cc.y, 4.0 * pixelRatio)
                + (1.0 - smoothstep(0.0, pixelRatio, tk.y)) * step(cc.x, 4.0 * pixelRatio);
    c += phosphor * 0.09 * graticule * clamp(grid + ticks, 0.0, 1.0);
    c *= 1.0 - scanlines * 0.35 * (0.5 + 0.5 * sin(p.y * PI / pixelRatio / 1.5));
    vec2 q = uv - 0.5;
    c *= 1.0 - dot(q, q) * 1.4;
    c += phosphor * 0.015;
    gl_FragColor = vec4(c, 1.0);
}
`;

export const Oscilloscope = {
    args: {
        ...graphArgs,
        dim: 2,
        edgeWidth: 1.25,
        nodeSize: 0.8,
        phosphor: "#3dff7a",
        amplitude: 2.2,
        frequency: 1,
        scrollSpeed: 0.6,
        beamFade: 0.8,
        glow: 1,
        graticule: 1,
        scanlines: 0.5,
        bloom: 0.7,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        phosphor: { control: "color" },
        amplitude: range(0, 8),
        frequency: range(0, 4),
        scrollSpeed: range(-3, 3),
        beamFade: range(0, 1),
        glow: range(0, 3),
        graticule: range(0, 2),
        scanlines: range(0, 1),
        bloom: range(0, 2),
    },
    render: (args: Args) => {
        const graph = makeGraph(args.graph, { nodes: args.nodes, dim: args.dim });
        let maxDiff = 1e-6;
        for (let e = 0; e < graph.m; e++) {
            maxDiff = Math.max(maxDiff, Math.abs(graph.value[graph.src[e]] - graph.value[graph.dst[e]]));
        }
        return mountLab({
            graph,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#020604",
            uniforms: {
                phosphor: args.phosphor,
                amplitude: args.amplitude,
                frequency: args.frequency,
                scrollSpeed: args.scrollSpeed,
                beamFade: args.beamFade,
                glow: args.glow,
                graticule: args.graticule,
                scanlines: args.scanlines,
                bloom: args.bloom,
                bloomThreshold: 0.5,
                bloomRadius: 12,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, size: (i, g) => 0.6 + 0.6 * Math.sqrt(g.degree[i]) },
            edgeLayer: {
                segments: 64,
                blend: "add",
                vertexHooks: EDGE_HOOKS,
                fragment: EDGE_FRAGMENT,
                custom: (e, g) => [
                    edgeLength(g, e),
                    Math.abs(g.value[g.src[e]] - g.value[g.dst[e]]) / maxDiff,
                    0,
                    0,
                ],
            },
            post: [BLOOM_POST, SCOPE_POST],
        });
    },
};

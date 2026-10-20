/**
 * Matrix glyph streams: procedural glyphs rain along every edge toward its target, like the code
 * in The Matrix. Each glyph is a 5 x 7 bitmap built from a hash and mirrored so it looks like a
 * character; glyphs flicker to new shapes, the head of each stream is near-white and its tail
 * fades to dark green. The edges are the only light in the scene.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, RIBBON_GLSL } from "./common";

export default { title: "Shader Lab/Fragment Patterns Along The Edge Ribbon/Matrix Glyphs", ...labMeta };

interface Args extends GraphArgs {
    speed: number;
    streamLength: number;
    flicker: number;
    density: number;
    glyphColor: string;
    bloom: number;
    bloomRadius: number;
}

const EDGE_FRAGMENT = `
${RIBBON_GLSL}
void main() {
    float hw = ribbonHalf();
    // one glyph per cell: 5 bits along the edge, 7 across it, plus a gap between glyphs
    float cellW = max(hw * 2.0 * 5.0 / 7.0 * 1.25, 3.0);
    float x = ribbonX();
    float cell = floor(x / cellW);
    vec2 lp = vec2(fract(x / cellW) * 1.25, (vSide * 0.5 + 0.5));
    float on = 0.0;
    if (lp.x < 1.0 && abs(vSide) <= 1.0) {
        float gx = floor(lp.x * 5.0);
        float gy = floor(lp.y * 7.0);
        // mirror the left half onto the right so the glyph is symmetric, like a character
        float mx = min(gx, 4.0 - gx);
        float seedCell = cell + vInfo.z * 131.0;
        float glyph = floor(time * flicker * (0.5 + hash11(seedCell * 1.7)) + hash11(seedCell));
        float bit = step(1.0 - density, hash13(vec3(seedCell, glyph, mx * 7.0 + gy)));
        // round each bitmap pixel a little
        vec2 sub = fract(lp * vec2(5.0, 7.0)) - 0.5;
        on = bit * smoothstep(0.62, 0.45, max(abs(sub.x), abs(sub.y)));
    }
    // the stream: a bright head moving to the target, a tail fading behind it
    float f = fract(cell / max(streamLength, 1.0) - time * speed * 6.0 / max(streamLength, 1.0) + vData.w);
    float b = exp(-(1.0 - f) * 5.0);
    float head = smoothstep(0.93, 1.0, f);
    vec3 c = glyphColor * (0.12 + b) * on * 1.4 + vec3(0.85, 1.0, 0.9) * head * on * 1.5;
    // a faint trace of the edge, so it is still readable between streams
    c += glyphColor * 0.06 * exp(-vSide * vSide * 4.0);
    c *= 1.0 + 1.5 * edgeLit();
    gl_FragColor = vec4(c, labEdgeCoverage());
}
`;

const NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    // a terminal screen: dark disc with scanlines and a phosphor rim
    float scan = 0.75 + 0.25 * sin(gl_FragCoord.y * 2.0);
    vec3 c = glyphColor * (0.08 + 0.9 * stroke(d + 0.1, 0.06)) * scan;
    float blink = step(0.5, fract(time * 1.5 + vInfo.x));
    c += glyphColor * fill(sdBox(vUV - vec2(0.0, -0.05), vec2(0.18, 0.28))) * blink * 0.8;
    c = mix(c, vec3(0.8, 1.0, 0.85), 0.4 * vState.x + 0.6 * vState.y * stroke(d + 0.03, 0.05));
    gl_FragColor = vec4(c, a);
}
`;

export const MatrixGlyphs = {
    args: {
        ...graphArgs,
        nodes: 120,
        nodeSize: 0.6,
        edgeWidth: 16,
        speed: 1.2,
        streamLength: 14,
        flicker: 3,
        density: 0.5,
        glyphColor: "#3dff6e",
        bloom: 1,
        bloomRadius: 3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        edgeWidth: range(2, 30, 0.5),
        speed: range(-4, 4),
        streamLength: range(2, 40, 1),
        flicker: range(0, 12),
        density: range(0.2, 0.8),
        glyphColor: { control: "color" },
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
            background: "#000000",
            uniforms: {
                speed: args.speed,
                streamLength: args.streamLength,
                flicker: args.flicker,
                density: args.density,
                glyphColor: args.glyphColor,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, blend: "add" },
            post: [BLOOM_POST],
        }),
};

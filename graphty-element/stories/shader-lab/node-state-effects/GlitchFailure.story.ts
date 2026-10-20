/**
 * Glitch for failures: failed nodes carry a steady red error ring and cross (readable at a glance)
 * and every so often tear apart with an RGB split, sliding bands and a jump; their edges break up
 * into flickering red segments with chromatic fringes. Healthy nodes stay calm.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { NODE_FLAG, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Glitch Failure", ...labMeta };

interface Args extends GraphArgs {
    failShare: number;
    errorColor: string;
    split: number;
    tearRate: number;
    ticks: number;
    jump: number;
}

const COMMON = `
${NODE_FLAG}
float isFailed(float i) { return nodeFlag(i, 11.0, failShare); }
float burstOf(float id) { return step(1.0 - tearRate, hash12(vec2(floor(time * ticks), id * 1.37))); }
`;

const VERTEX_HOOKS = `
${COMMON}
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) {
    float id = nodeInfo.y;
    float b = isFailed(id) * burstOf(id);
    vec3 j = hash33(vec3(floor(time * ticks), id, 1.0)) - 0.5;
    return p + j * b * jump * nodeRadius * 2.0;
}
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    float id = vInfo.y;
    if (isFailed(id) < 0.5) {
        vec3 n = labSphereNormal();
        vec3 c = labShade(n, vColor.rgb);
        c = mix(c, vec3(1.0), 0.35 * vState.x + 0.4 * vState.y * pow(1.0 + n.z, 2.0));
        gl_FragColor = vec4(c, 1.0);
        return;
    }
    float tick = floor(time * ticks);
    float burst = burstOf(id);
    vec2 uv = vUV;
    // tear: horizontal bands slide
    float band = floor(uv.y * 4.0 + hash11(tick + id) * 4.0);
    uv.x += burst * (hash12(vec2(band, tick + id * 3.1)) - 0.5) * 0.9;
    // blocky dropout
    vec2 blk = floor(uv * 5.0);
    float drop = burst * step(0.82, hash13(vec3(blk, tick + id)));
    float ang = hash11(tick * 1.3 + id) * TAU;
    vec2 o = vec2(cos(ang), sin(ang)) * split * (0.25 + 0.75 * burst);
    float cr = fill(length(uv + o) - 0.92);
    float cg = fill(length(uv) - 0.92);
    float cb = fill(length(uv - o) - 0.92);
    float cov = max(cr, max(cg, cb)) * (1.0 - drop);
    // steady error ring, always readable
    float ring = stroke(length(vUV) - 1.18, 0.07);
    if (cov <= 0.02 && ring <= 0.02) discard;
    vec3 base = mix(vColor.rgb, errorColor, 0.55);
    float both = min(cr, min(cg, cb));
    vec3 col = both * base * 0.95 + (vec3(cr, cg, cb) - both) * 1.3;
    // an X glyph
    float xd = min(sdSegment(uv, vec2(-0.42, -0.42), vec2(0.42, 0.42)), sdSegment(uv, vec2(-0.42, 0.42), vec2(0.42, -0.42)));
    col = mix(col, vec3(1.0, 0.95, 0.95), fill(xd - 0.1) * cg);
    // CRT scanlines
    col *= 0.78 + 0.22 * step(0.5, fract(gl_FragCoord.y / (3.0 * pixelRatio)));
    float pulse = 0.6 + 0.4 * sin(time * 6.0 + id);
    col = mix(col, errorColor * (0.7 + 0.6 * pulse), ring * (1.0 - cov));
    col += vec3(0.3) * burst * cov;
    gl_FragColor = vec4(col, 1.0);
}
`;

const EDGE_HOOKS = `
${COMMON}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    float f = max(isFailed(edgeInfo.x), isFailed(edgeInfo.y));
    return edgeWidth * (1.0 + 0.8 * f);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float f = max(isFailed(vInfo.x), isFailed(vInfo.y));
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    if (f < 0.5) {
        float lit = max(abs(vTouch.x), abs(vTouch.y));
        gl_FragColor = vec4(mix(c, vec3(1.0), 0.4 * lit), labEdgeCoverage() * mix(0.4, 1.0, lit));
        return;
    }
    float tick = floor(time * ticks);
    float burst = burstOf(vInfo.z + 500.0);
    float seg = floor(vT * vLengthPx / (18.0 * pixelRatio));
    // broken: random segments missing, more while bursting
    float gone = step(0.75 - 0.35 * burst, hash12(vec2(seg, tick * (0.2 + burst) + vInfo.z)));
    float off = burst * (hash12(vec2(seg, tick)) - 0.5) * 1.5;
    float s = vSide + off;
    float w = fwidth(vSide);
    float cr = 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(s + 0.5 * burst));
    float cg = 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(s));
    float cb = 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(s - 0.5 * burst));
    vec3 col = vec3(cr, cg * 0.35, cb * 0.45) * errorColor * 1.4 + vec3(cr, cg, cb) * 0.15;
    float a = max(cr, max(cg, cb)) * (1.0 - gone * 0.85) * (0.6 + 0.4 * sin(time * 6.0 + vInfo.z));
    gl_FragColor = vec4(col, a);
}
`;

export const GlitchFailure = {
    args: {
        ...graphArgs,
        edgeWidth: 1.75,
        failShare: 0.12,
        errorColor: "#ff2448",
        split: 0.22,
        tearRate: 0.18,
        ticks: 12,
        jump: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        failShare: range(0, 1),
        errorColor: { control: "color" },
        split: range(0, 0.6),
        tearRate: range(0, 1),
        ticks: range(1, 30, 1),
        jump: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                failShare: args.failShare,
                errorColor: args.errorColor,
                split: args.split,
                tearRate: args.tearRate,
                ticks: args.ticks,
                jump: args.jump,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: VERTEX_HOOKS, quadScale: 1.6 },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
        }),
};

/**
 * Change flash and cool-down: a simulated stream of updates. A node that changes flashes white
 * with a four-point star glint and a ring, then fades back over a second or two, so "what just
 * changed" stays readable for a moment. A new edge draws itself out from its source white-hot and
 * cools through a heat ramp to its normal color; a removed edge shrinks to its middle and vanishes.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Change Flash", ...labMeta };

interface Args extends GraphArgs {
    activity: number;
    decay: number;
    glint: number;
    flashColor: string;
    edgeChurn: number;
    coolTime: number;
    drawTime: number;
}

const COMMON = `
// seconds since node i last changed (large = not recently)
float sinceChange(float i) {
    if (hash11(i * 0.6180339 + 21.0) >= activity) return 1e3;
    float P = mix(3.0, 11.0, hash11(i * 1.37 + 5.1));
    return mod(time + hash11(i * 2.71 + 2.9) * P, P);
}
float flash(float i) { return exp(-sinceChange(i) * decay); }
// edge life: x = age since it appeared, y = 0..1 removal progress (0 = alive)
vec2 edgeLife(float e) {
    if (hash11(e * 0.4142 + 7.0) >= edgeChurn) return vec2(1e3, 0.0);
    float P = mix(7.0, 15.0, hash11(e * 1.13 + 3.3));
    float c = mod(time + hash11(e * 3.17 + 1.1) * P, P);
    return vec2(c, clamp((c - (P - 1.2)) / 1.0, 0.0, 1.0));
}
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    float f = flash(vInfo.y);
    c = mix(c, flashColor * 1.3, f * (0.6 + 0.4 * pow(1.0 + n.z, 2.0)));
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.4 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

// additive star glint and expanding ring, only drawn while the flash lasts
const GLINT_HOOKS = `
${COMMON}
#define OV_SCALE
float ovScale(float pixelRadius) { return flash(nodeInfo.y) > 0.01 ? max(1.0, 10.0 / max(pixelRadius, 1.0)) : 0.0; }
`;

const GLINT_FRAGMENT = `
${COMMON}
void main() {
    float s = sinceChange(vInfo.y);
    float f = exp(-s * decay);
    if (f < 0.01) discard;
    vec2 uv = vUV;
    float r = length(uv);
    // four-point star, slowly turning, plus a fainter diagonal pair
    vec2 q = rot2(s * 0.6) * uv;
    float star = exp(-abs(q.y) * 18.0) * exp(-abs(q.x) * 0.9) + exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 0.9);
    vec2 q2 = rot2(0.785398) * q;
    star += 0.4 * (exp(-abs(q2.y) * 26.0) * exp(-abs(q2.x) * 1.8) + exp(-abs(q2.x) * 26.0) * exp(-abs(q2.y) * 1.8));
    float core = exp(-r * r * 2.5);
    float ring = stroke(r - (1.0 + s * 5.0), 0.06 + s * 0.05) * exp(-s * 2.0);
    float e = (star * glint * 1.8 + core) * f + ring;
    vec3 col = mix(flashColor, vColor.rgb, 0.25) * e;
    gl_FragColor = vec4(col, min(e, 1.5) * (1.0 - smoothstep(4.0, 5.5, r)));
}
`;

const EDGE_HOOKS = `
${COMMON}
#define LAB_EDGE_WIDTH
float labEdgeWidth(float t) {
    vec2 L = edgeLife(edgeInfo.z);
    float heat = exp(-L.x / coolTime);
    return edgeWidth * (1.0 + 2.5 * heat);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec2 L = edgeLife(vInfo.z);
    // drawing in from the source
    float grow = clamp(L.x / drawTime, 0.0, 1.0);
    if (vT > grow) discard;
    // removal: shrink toward the middle
    if (abs(vT - 0.5) > 0.5 * (1.0 - L.y)) discard;
    float heat = exp(-L.x / coolTime);
    vec3 col = mix(c, vec3(1.0), 0.4 * lit);
    col = mix(col, blackbody(heat) * (1.0 + heat), clamp(heat * 1.3, 0.0, 1.0));
    // the drawing tip is brightest
    col += vec3(1.0) * exp(-(grow - vT) * vLengthPx / (6.0 * pixelRatio)) * step(grow, 0.999);
    // removed edges dim and redden as they go
    col = mix(col, vec3(0.6, 0.1, 0.1), L.y);
    float a = cov * mix(mix(0.5, 1.0, lit), 1.0, heat) * (1.0 - 0.5 * L.y);
    gl_FragColor = vec4(col, a);
}
`;

export const ChangeFlash = {
    args: {
        ...graphArgs,
        activity: 0.35,
        decay: 2.2,
        glint: 1,
        flashColor: "#e8f4ff",
        edgeChurn: 0.25,
        coolTime: 1.4,
        drawTime: 0.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        activity: range(0, 1),
        decay: range(0.3, 8),
        glint: range(0, 3),
        flashColor: { control: "color" },
        edgeChurn: range(0, 1),
        coolTime: range(0.2, 5),
        drawTime: range(0.05, 3),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                activity: args.activity,
                decay: args.decay,
                glint: args.glint,
                flashColor: args.flashColor,
                edgeChurn: args.edgeChurn,
                coolTime: args.coolTime,
                drawTime: args.drawTime,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
            setup: (ctx) => {
                addNodeOverlay(ctx, {
                    name: "glints",
                    fragment: GLINT_FRAGMENT,
                    quadScale: 5.5,
                    vertexHooks: GLINT_HOOKS,
                });
            },
        }),
};

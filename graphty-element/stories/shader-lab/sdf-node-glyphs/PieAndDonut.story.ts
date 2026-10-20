/**
 * Pie and donut: each node is a small pie chart of which communities its neighbors belong to (its
 * own top four, the rest in gray). Slices sweep open on load and, with `loop` on, keep replaying.
 * The four shares travel in one vec4 attribute: the integer part is the community id and the
 * fraction part is the share, so a single attribute carries both colors and sizes.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabGraph, labMeta, mountLab, range } from "../harness";
import { COMMUNITY_RGB, QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Pie And Donut", ...labMeta };

interface Args extends GraphArgs {
    hole: number;
    gap: number;
    openSpeed: number;
    loop: boolean;
    stagger: number;
    explode: number;
    ownDim: number;
}

/** Top four neighbor communities as community + share (share kept below 1). */
function neighborShares(i: number, g: LabGraph): number[] {
    const counts = new Map<number, number>();
    for (const j of g.neighbors[i]) {
        counts.set(g.community[j], (counts.get(g.community[j]) ?? 0) + 1);
    }
    const total = Math.max(1, g.neighbors[i].length);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const out = [0, 0, 0, 0];
    top.forEach(([c, k], s) => {
        out[s] = c + Math.min(0.999, k / total);
    });
    if (top.length === 0) {
        out[0] = g.community[i] + 0.999;
    }
    return out;
}

const NODE_FRAGMENT = `
${COMMUNITY_RGB}
void main() {
    float r = length(vUV);
    float outerD = r - 0.95;
    float holeR = hole * 0.95;
    float ringD = max(outerD, holeR - r);
    float hoverLift = vState.x * explode;
    float a = fill(ringD - hoverLift * 0.05);
    float sel = vState.y * stroke(r - 1.08, 0.035);
    if (max(a, sel) <= 0.003) discard;

    // clockwise angle from 12 o'clock, 0..1
    float ang = fract(atan(vUV.x, vUV.y) / TAU + 1.0);
    // open, hold, close, rest: an 8-unit loop (or open once and stay open)
    float t = loop > 0.5 ? mod(time * openSpeed, 8.0) : time * openSpeed;
    float delay = vInfo.x * stagger;
    float grow = smoothstep(0.0, 1.0, clamp(t - delay, 0.0, 1.0));
    if (loop > 0.5) grow *= 1.0 - smoothstep(0.0, 1.0, clamp(t - 6.0 - delay, 0.0, 1.0));
    float s = ang / max(grow, 1e-3);

    vec3 c = vec3(0.32, 0.34, 0.4);   // remaining neighbors
    float cum = 0.0;
    float edgeDist = 10.0;
    for (int k = 0; k < 4; k++) {
        float v = vCustom[k];
        float share = fract(v);
        if (share <= 0.0) continue;
        float lo = cum;
        cum += share;
        edgeDist = min(edgeDist, abs(s - cum) * grow);
        // the node's own community is dimmed so links into other communities stand out
        if (s >= lo && s < cum) c = communityRGB(floor(v)) * (abs(floor(v) - vData.w) < 0.5 ? ownDim : 1.15);
    }
    edgeDist = min(edgeDist, min(s, abs(1.0 - s)) * grow);
    if (s > 1.0) c = vec3(0.12, 0.13, 0.17);      // the track before it opens
    // a thin transparent gap between slices, measured in quad units along the arc
    float gapD = edgeDist * TAU * r - gap * 0.5;
    if (gap > 0.0 && s <= 1.0 && hole < 0.999) a *= fill(-gapD);
    // shading: a soft radial gradient and an inner shadow at the hole
    c *= 0.8 + 0.25 * smoothstep(holeR, 0.95, r);
    c = mix(c, c * 0.55, (1.0 - smoothstep(0.0, 0.08, r - holeR)) * step(0.01, hole));
    // own community dot in the hole
    float dotD = r - holeR * 0.55;
    float dotA = fill(dotD) * step(0.2, hole);
    c = mix(c, vColor.rgb, dotA);
    a = max(a, dotA);
    c = mix(c, vec3(1.0), 0.25 * vState.x);
    c = mix(c, vec3(1.0), sel);
    gl_FragColor = vec4(c, max(a, sel));
}
`;

export const PieAndDonut = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 2,
        hole: 0.5,
        gap: 0.05,
        openSpeed: 0.8,
        loop: true,
        stagger: 0.6,
        explode: 1,
        ownDim: 0.55,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        hole: range(0, 0.85),
        gap: range(0, 0.2),
        openSpeed: range(0.1, 3),
        loop: { control: "boolean" },
        stagger: range(0, 2),
        explode: range(0, 2),
        ownDim: range(0.2, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                hole: args.hole,
                gap: args.gap,
                openSpeed: args.openSpeed,
                loop: args.loop,
                stagger: args.stagger,
                explode: args.explode,
                ownDim: args.ownDim,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.15, blend: "alpha", custom: neighborShares },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

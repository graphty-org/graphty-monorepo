/**
 * Voronoi territory map: every pixel of the background belongs to the nearest node, and takes
 * its community's color, so the screen is carved into each community's territory. Thick borders
 * mark where territories of different communities meet, thin lines split each node's own cell,
 * and color fades with distance from the nearest node so empty space reads as no-man's-land.
 *
 * The nearest node of every pixel comes from the jump-flood algorithm: node seeds are drawn into
 * a float texture, then about ten full-screen passes each look 8 neighbors at halving distances
 * (512, 256 ... 1 pixel) and keep the closest seed seen, so the whole map costs a few passes
 * however many nodes there are.
 */
import type { RenderTargetTexture } from "@babylonjs/core";

import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, type Quality, range } from "../harness";
import {
    autoRender,
    effectRenderer,
    everyFrame,
    GLSL_COMMUNITY,
    makePass,
    makeTarget,
    screenBackground,
    splat,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Voronoi Territory", ...labMeta };

const STYLES = ["map", "stained glass", "cells"] as const;

interface Args extends GraphArgs {
    style: (typeof STYLES)[number];
    fade: number;
    borderWidth: number;
    cellLines: number;
    saturation: number;
}

/** Jump-flood target size relative to the canvas: a quarter at low quality, else a half. */
const SCALE_GLSL = "LAB_Q(0.25, 0.5, 0.5)";
const scaleFor = (q: Quality): number => (q === "low" ? 0.25 : 0.5);

// seed texel: (screen uv of the node, community, index + 1); alpha 0 means "no seed here"
const SEED_VERTEX = `
void main() {
    vec4 c = viewProjection * vec4(nodePos, 1.0);
    vSeed = c.xy / c.w * 0.5 + 0.5;
    vCommunity = nodeData.x;
    vIndex = nodeData.y;
    gl_Position = c + vec4(position.xy * 2.0 / (resolution * ${SCALE_GLSL}) * c.w, 0.0, 0.0);
}
`;
const SEED_FRAGMENT = `
void main() {
    gl_FragColor = vec4(vSeed, vCommunity, vIndex + 1.0);
}
`;

const JFA = `
uniform sampler2D src;
uniform float stepPx;
uniform vec2 texSize;
void main() {
    vec4 best = vec4(0.0);
    float bd = 1e9;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 q = vUV + vec2(float(x), float(y)) * stepPx / texSize;
            if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
            vec4 s = texture2D(src, q);
            if (s.a <= 0.0) continue;
            float d = length((s.xy - vUV) * texSize);
            if (d < bd) { bd = d; best = s; }
        }
    }
    gl_FragColor = best;
}
`;

const BACKGROUND = `
uniform sampler2D jfa;
${GLSL_COMMUNITY}
void main() {
    vec2 res = resolution;
    vec4 s = texture2D(jfa, vUV);
    vec2 p = vUV * res;
    vec2 a = s.xy * res;
    // distance to the nearest bisector against neighbors' seeds: exact, so borders anti-alias
    float bComm = 1e5;
    float bCell = 1e5;
    for (int k = 0; k < 8; k++) {
        float ang = float(k) * 0.785398;
        vec2 o = vec2(cos(ang), sin(ang)) * 3.0 / res;
        vec4 t = texture2D(jfa, vUV + o);
        if (t.a <= 0.0 || abs(t.a - s.a) < 0.5) continue;
        vec2 b = t.xy * res;
        vec2 dir = normalize(b - a + 1e-6);
        float d = abs(dot(p - 0.5 * (a + b), dir));
        bCell = min(bCell, d);
        if (abs(t.z - s.z) > 0.5) bComm = min(bComm, d);
    }
    float dist = length(p - a) / res.y;
    float near = exp(-dist * dist / max(fade * fade, 1e-4));
    vec3 cc = communityRGB(s.z);
    cc = mix(vec3(luminance(cc)), cc, saturation);
    float hovered = step(abs(s.w - 1.0 - hoverNode), 0.5);
    float sel = selectedNode >= 0.0 ? 1.0 : 0.0;
    vec3 bg = vec3(0.03, 0.035, 0.05);
    vec3 c;
    float bw = borderWidth * pixelRatio;
    float border = 1.0 - smoothstep(bw * 0.5 - 0.75, bw * 0.5 + 0.75, bComm);
    float cell = 1.0 - smoothstep(0.0, 1.2 * pixelRatio, bCell);
    if (style < 0.5) {
        c = mix(bg, cc * 0.55 + 0.05, near * 0.85);
        c = mix(c, c * 0.6, cell * cellLines);
        // borders fade out with the territory, so empty space is not crossed by stray lines
        c = mix(c, mix(bg, vec3(0.92), near * 0.9), border);
    } else if (style < 1.5) {
        // stained glass: saturated panes lit from behind, lead between communities and cells
        float glow = 0.55 + 0.45 * exp(-dist * 9.0);
        float grain = noise(p * 0.08 + s.w * 3.1) * 0.25 + noise(p * 0.02) * 0.2;
        c = cc * (glow + grain) * (0.25 + 0.75 * near);
        c = mix(c, vec3(0.02), max(border, cell * cellLines * 0.85));
    } else {
        c = mix(bg, cc * 0.25, near);
        c = mix(c, cc * 1.1, cell * cellLines * near);
        c = mix(c, vec3(1.0), border * near);
    }
    c += vec3(0.25) * hovered * near;
    gl_FragColor = vec4(c * (1.0 - 0.15 * sel * (1.0 - step(abs(s.w - 1.0 - selectedNode), 0.5))), 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.45);
    c = mix(c, vec3(0.05), stroke(d + 0.12, 0.12));
    c = mix(c, vec3(1.0, 0.95, 0.5), max(vState.x, vState.y));
    gl_FragColor = vec4(c, a);
}
`;

const EDGE = `
void main() {
    gl_FragColor = vec4(vec3(0.0), labEdgeCoverage() * 0.35);
}
`;

export const VoronoiTerritory = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.6,
        edgeWidth: 1,
        style: "map",
        fade: 0.08,
        borderWidth: 2.5,
        cellLines: 0.5,
        saturation: 1,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        style: { control: "inline-radio", options: STYLES },
        fade: range(0.01, 0.5),
        borderWidth: range(0, 8),
        cellLines: range(0, 1),
        saturation: range(0, 1.5),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                style: STYLES.indexOf(args.style),
                fade: args.fade,
                borderWidth: args.borderWidth,
                cellLines: args.cellLines,
                saturation: args.saturation,
            },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            setup: (ctx) => {
                const g = ctx.graph;
                const scale = scaleFor(ctx.quality);
                const seeds = makeTarget(ctx, "seeds", { size: scale, type: "float", nearest: true });
                const data = new Float32Array(g.n * 2);
                for (let i = 0; i < g.n; i++) {
                    data[i * 2] = g.community[i];
                    data[i * 2 + 1] = i;
                }
                splat(ctx, [seeds], {
                    name: "seeds",
                    count: g.n,
                    attributes: { nodePos: [3, Float32Array.from(g.pos)], nodeData: [2, data] },
                    varyings: "varying vec2 vSeed;\nvarying float vCommunity;\nvarying float vIndex;",
                    vertex: SEED_VERTEX,
                    fragment: SEED_FRAGMENT,
                });
                autoRender(ctx, seeds);
                const a = makeTarget(ctx, "jfa-a", { size: scale, type: "float", nearest: true });
                const b = makeTarget(ctx, "jfa-b", { size: scale, type: "float", nearest: true });
                const result = makeTarget(ctx, "jfa-result", { size: scale, type: "float", nearest: true });
                const renderer = effectRenderer(ctx);
                const pass = makePass(ctx, renderer, "jfa", JFA, ["stepPx", "texSize"], ["src"]);
                const stop = everyFrame(ctx, () => {
                    if (!pass.ready()) {
                        return;
                    }
                    const { width, height } = seeds.getSize();
                    const steps: number[] = [];
                    for (let s = 2 ** Math.ceil(Math.log2(Math.max(width, height))) / 2; s >= 1; s /= 2) {
                        steps.push(s);
                    }
                    steps.push(1); // JFA+1: one more 1-pixel pass fixes the rare wrong pixel
                    let src: RenderTargetTexture = seeds;
                    steps.forEach((stepPx, k) => {
                        let out = src === a ? b : a;
                        if (k === steps.length - 1) {
                            out = result;
                        }
                        pass.run(out, { src, stepPx, texSize: [width, height] });
                        src = out;
                    });
                });
                screenBackground(ctx, BACKGROUND, { jfa: result });
                return stop;
            },
        }),
};

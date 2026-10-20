/**
 * Hop-distance ripple: click a node and a wave of light runs out through the graph in hop order --
 * the clicked node first, then its neighbors, then theirs. Each node flashes and throws a shock
 * ring as the wave reaches it, the wave runs along the edges between hops, and an optional
 * screen-space water ring refracts the whole picture around the clicked node. With `autoPulse`
 * on, a high-PageRank node is clicked for you every few seconds.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE, topNode, trackSelection } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Hop Ripple", ...labMeta };

interface Args extends GraphArgs {
    speed: number;
    sharpness: number;
    waveColor: string;
    afterglow: number;
    water: number;
    autoPulse: boolean;
    period: number;
}

const COMMON = `
float front() { return (time - selectTime) * speed; }
// 1 when the wave is at hop h, fading either side
float wave(float h) {
    if (selectedNode < 0.0 || h < 0.0) return 0.0;
    float x = front() - h;
    return exp(-sharpness * x * x);
}
// 0 before the wave arrives, eases from 1 down to afterglow behind it
float reached(float h) {
    if (selectedNode < 0.0 || h < 0.0) return 0.0;
    float x = front() - h;
    return x < 0.0 ? 0.0 : mix(afterglow, 1.0, exp(-x * 1.5));
}
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float h = vInfo.z;
    float w = wave(h);
    float r = reached(h);
    float dim = selectedNode >= 0.0 ? 0.35 + 0.65 * r : 1.0;
    vec3 c = labShade(n, vColor.rgb) * dim;
    c = mix(c, waveColor * (0.9 + 0.5 * (-n.z)), w * 0.8);
    c += waveColor * (w * 0.5 + r * 0.3) * pow(1.0 + n.z, 2.0);
    c = mix(c, vec3(1.0), 0.4 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

// a ring expanding out of each node as the wave reaches it
const RING_FRAGMENT = `
${COMMON}
void main() {
    float h = vInfo.z;
    if (selectedNode < 0.0 || h < 0.0) discard;
    float x = front() - h;
    if (x < 0.0 || x > 1.0) discard;
    float rad = 1.0 + x * 2.6;
    float d = length(vUV) - rad;
    float a = exp(-d * d * 30.0) * (1.0 - x) * 1.4;
    a += exp(-dot(vUV, vUV) * 1.2) * exp(-x * 6.0) * 0.8;
    gl_FragColor = vec4(waveColor * a, a);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec2 hops = vCustom.xy;
    float h = (hops.x < 0.0 || hops.y < 0.0) ? -1.0 : mix(hops.x, hops.y, vT);
    float w = wave(h);
    float r = reached(h);
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float base = selectedNode >= 0.0 ? 0.15 + 0.35 * r : 0.45;
    float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    vec3 col = c * (0.6 + 0.4 * r) + waveColor * w * (1.0 + core);
    gl_FragColor = vec4(col, cov * clamp(base + w, 0.0, 1.0));
}
`;

// A water ring: a raised circular swell expanding from the clicked node bends the picture.
const WATER_POST = `
void main() {
    vec4 base = texture2D(textureSampler, vUV);
    if (water <= 0.0 || focusScreen.x < 0.0 || selectedNode < 0.0) { gl_FragColor = base; return; }
    vec2 px = vUV * resolution;
    vec2 dv = px - focusScreen;
    float dist = length(dv);
    float age = time - selectTime;
    float radius = age * 520.0 * pixelRatio * speed / 3.0;
    float width = 38.0 * pixelRatio;
    float x = (dist - radius) / width;
    float fade = exp(-age * 0.9);
    // derivative of a gaussian bump: pushes pixels out on the leading slope, in on the trailing
    float slope = -2.0 * x * exp(-x * x) * fade;
    vec2 dir = dist > 0.0 ? dv / dist : vec2(0.0);
    vec2 uv = vUV - dir * slope * water * 22.0 * pixelRatio / resolution;
    vec3 c = texture2D(textureSampler, uv).rgb;
    float spec = max(slope, 0.0);
    c += waveColor * spec * 0.35 * water + vec3(1.0) * pow(spec, 3.0) * 0.4 * water;
    gl_FragColor = vec4(c, 1.0);
}
`;

export const HopRipple = {
    args: {
        ...graphArgs,
        edgeWidth: 2,
        speed: 2,
        sharpness: 3,
        waveColor: "#7fe6ff",
        afterglow: 0.35,
        water: 1,
        autoPulse: true,
        period: 4,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        speed: range(0.5, 10),
        sharpness: range(0.5, 12),
        waveColor: { control: "color" },
        afterglow: range(0, 1),
        water: range(0, 3),
        autoPulse: { control: "boolean" },
        period: range(1.5, 10),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#06080f",
            uniforms: {
                speed: args.speed,
                sharpness: args.sharpness,
                waveColor: args.waveColor,
                afterglow: args.afterglow,
                water: args.water,
                focusScreen: [-1, -1],
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [WATER_POST],
            rebuildOn: [args.autoPulse, args.period],
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "rings", fragment: RING_FRAGMENT, quadScale: 4, lift: 1.2 });
                const selected = trackSelection(ctx, 0, "focusScreen");
                if (!args.autoPulse) {
                    return;
                }
                // re-pulse the reader's pick; otherwise hop to another well-connected node each time
                let next = 0;
                let mine = topNode(ctx);
                let first = true;
                ctx.onFrame((t) => {
                    if (t < next) {
                        return;
                    }
                    next = t + args.period;
                    const s = selected();
                    if (s >= 0 && s !== mine) {
                        ctx.select(s);
                        return;
                    }
                    const g = ctx.graph;
                    let pick = Math.floor(Math.random() * g.n);
                    for (let k = 0; k < 30 && g.rank[pick] < 0.25; k++) {
                        pick = Math.floor(Math.random() * g.n);
                    }
                    mine = first ? mine : pick;
                    first = false;
                    ctx.select(mine);
                });
            },
        }),
};

/**
 * Gommage disintegration: a removed node crumbles cell by cell into glowing petals that peel off
 * in a sweep, swirl on the wind and fade; its edges burn back from that end. Click a node to
 * erase it (click empty space to bring it back), or let `autoShare` erase a few on a timer.
 * The petals are one extra thin-instanced batch: a quad per cell of every node, idle until needed.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Gommage Disintegration", ...labMeta };

interface Args extends GraphArgs {
    dustTime: number;
    flyTime: number;
    wind: number;
    windAngle: number;
    swirl: number;
    autoShare: number;
    cycle: number;
    petalColor: string;
    tint: number;
}

/** Cells per node side; a node is cut into the cells of a GRID x GRID grid that touch its disc. */
const GRID = 5;

const COMMON = `
const float G = ${GRID.toFixed(1)};
// seconds since node i began to crumble (negative = intact)
float dustAge(float i) {
    if (i == selectedNode) return time - selectTime;
    if (hash11(i * 0.6180339 + 9.1) >= autoShare) return -1.0;
    // each erased node runs a 7 second episode once per cycle: crumble, stay gone, grow back
    float c = mod(time + hash11(i * 1.731 + 2.2) * cycle, cycle);
    return c - max(cycle - 7.0, 0.0);
}
// 0..1 how far an auto-erased node has grown back (the clicked node stays gone)
float reform(float i) {
    if (i == selectedNode) return 0.0;
    float a = dustAge(i);
    return a < 0.0 ? 0.0 : smoothstep(4.6, 6.2, a);
}
// when cell c of node i lets go: a sweep from one side, ragged by noise
float cellDelay(vec2 c, float i) {
    vec2 uv = (c + 0.5) / G * 2.0 - 1.0;
    vec2 dir = normalize(vec2(cos(windAngle), sin(windAngle)));
    float s = dot(uv, -dir) * 0.5 + 0.5;
    return dustTime * (0.75 * s + 0.25 * hash12(c + i * 13.7));
}
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    float id = vInfo.y;
    float a = dustAge(id);
    vec2 cell = floor((vUV * 0.5 + 0.5) * G);
    float delay = cellDelay(cell, id);
    float r = reform(id);
    float back = step(hash12(cell + id * 3.3 + 1.0), r);
    if (a >= 0.0 && a > delay && back < 0.5) discard;
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    c = mix(c, vec3(1.0), 0.35 * vState.x);
    if (a >= 0.0) {
        // cells about to let go glow, cracks open between them
        float heat = back > 0.5 ? 1.0 - r : smoothstep(delay - 0.5, delay, a);
        vec2 f = fract((vUV * 0.5 + 0.5) * G);
        float crack = 1.0 - smoothstep(0.0, 0.12, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        vec3 glow = mix(petalColor, vec3(1.0, 0.95, 0.85), 0.5);
        c = mix(c, glow * 1.6, heat * (0.35 + 0.65 * crack));
    }
    gl_FragColor = vec4(c, 1.0);
}
`;

const PETAL_VARYINGS = `
varying vec2 vQ;
varying vec4 vCol;
varying float vLife;
`;

const PETAL_VERTEX = `
${COMMON}
void main() {
    float id = nodeInfo.y;
    float a = dustAge(id);
    vec2 cell = petal.xy;
    float fa = a - cellDelay(cell, id);
    float life = flyTime * (0.6 + 0.8 * petal.z);
    if (a < 0.0 || fa < 0.0 || fa > life) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vQ = vec2(0.0); vCol = vec4(0.0); vLife = 1.0;
        return;
    }
    float k = fa / life;
    float radius = nodeRadius * nodeSize * nodeInfo.w;
    vec4 vc = view * vec4(nodePos, 1.0);
    vec2 cuv = (cell + 0.5) / G * 2.0 - 1.0;
    vec2 dir = vec2(cos(windAngle), sin(windAngle));
    // wind accelerates, a little lift, and a curl of noise that grows with age
    vec2 drift = dir * wind * (0.6 * fa + 1.1 * fa * fa) + vec2(0.0, 0.5 * fa);
    float sx = noise(vec2(petal.z * 17.0 + fa * 0.9, id)) - 0.5;
    float sy = noise(vec2(petal.w * 23.0 - fa * 0.8, id + 4.0)) - 0.5;
    drift += vec2(sx, sy) * swirl * 5.0 * fa;
    float size = (3.6 / G) * (1.0 - k * k) * mix(0.6, 1.1, petal.w);
    vec2 corner = rot2(fa * (petal.z - 0.5) * 9.0 + petal.w * 6.0) * (position.xy * size * vec2(1.0, 0.55 + 0.45 * sin(fa * 7.0 + petal.z * 9.0)));
    gl_Position = projection * (vc + vec4((cuv + drift + corner) * radius, 0.0, 0.0));
    vQ = position.xy;
    vCol = nodeColor;
    vLife = k;
}
`;

const PETAL_FRAGMENT = `
void main() {
    // a petal: a rounded diamond with a soft halo
    float d = (abs(vQ.x) * 0.8 + abs(vQ.y)) * 1.9;
    float body = 1.0 - smoothstep(0.8, 1.0, d);
    float halo = exp(-d * 1.6) * 0.7 * (1.0 - smoothstep(1.4, 1.9, d));
    vec3 hot = vec3(1.0, 0.96, 0.85);
    vec3 col = mix(vCol.rgb, petalColor, tint);
    col = mix(hot, col * 2.0, smoothstep(0.0, 0.35, vLife));
    float fade = pow(1.0 - vLife, 1.4);
    gl_FragColor = vec4(col * (body + halo), (body + halo) * fade);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec3 col = mix(c, vec3(1.0), 0.4 * lit);
    float alpha = cov * mix(0.5, 1.0, lit);
    // each end that is crumbling eats the edge back from that end
    for (int k = 0; k < 2; k++) {
        float i = k == 0 ? vInfo.x : vInfo.y;
        float a = dustAge(i);
        if (a < 0.0) continue;
        float s = k == 0 ? vT : 1.0 - vT;
        float prog = clamp(a / (dustTime * 1.3), 0.0, 1.0) * (1.0 - reform(i));
        float front = s + 0.08 * noise(vec2(vT * vLengthPx * 0.1, vInfo.z)) - prog * 1.08;
        if (front < 0.0) discard;
        float g = (1.0 - smoothstep(0.0, 0.06, front)) * step(0.001, prog);
        col = mix(col, petalColor * 1.8 + 0.4, g);
        alpha = max(alpha, cov * g);
    }
    gl_FragColor = vec4(col, alpha);
}
`;

export const GommageDisintegration = {
    args: {
        ...graphArgs,
        nodeSize: 1.6,
        edgeWidth: 1.5,
        dustTime: 1.6,
        flyTime: 2.4,
        wind: 0.9,
        windAngle: 0.35,
        swirl: 0.45,
        autoShare: 0.12,
        cycle: 9,
        petalColor: "#ff4f6d",
        tint: 0.55,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        dustTime: range(0.2, 5),
        flyTime: range(0.5, 6),
        wind: range(0, 5),
        windAngle: range(-3.14, 3.14),
        swirl: range(0, 2),
        autoShare: range(0, 1),
        cycle: range(8, 30),
        petalColor: { control: "color" },
        tint: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                dustTime: args.dustTime,
                flyTime: args.flyTime,
                wind: args.wind,
                windAngle: args.windAngle,
                swirl: args.swirl,
                autoShare: args.autoShare,
                cycle: args.cycle,
                petalColor: args.petalColor,
                tint: args.tint,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const { nodes } = ctx;
                if (!nodes) {
                    return;
                }
                // one petal per grid cell that touches the node disc
                const cells: number[] = [];
                for (let y = 0; y < GRID; y++) {
                    for (let x = 0; x < GRID; x++) {
                        const cx = ((x + 0.5) / GRID) * 2 - 1;
                        const cy = ((y + 0.5) / GRID) * 2 - 1;
                        if (Math.hypot(cx, cy) < 1 + 0.5 / GRID) {
                            cells.push(x, y);
                        }
                    }
                }
                const per = cells.length / 2;
                const count = nodes.count * per;
                const pos = new Float32Array(count * 3);
                const color = new Float32Array(count * 4);
                const info = new Float32Array(count * 4);
                const petal = new Float32Array(count * 4);
                const b = nodes.buffers;
                for (let i = 0; i < nodes.count; i++) {
                    for (let c = 0; c < per; c++) {
                        const k = i * per + c;
                        pos.set(b.nodePos.subarray(i * 3, i * 3 + 3), k * 3);
                        color.set(b.nodeColor.subarray(i * 4, i * 4 + 4), k * 4);
                        info.set(b.nodeInfo.subarray(i * 4, i * 4 + 4), k * 4);
                        const h = Math.sin(k * 12.9898) * 43758.5453;
                        const h2 = Math.sin(k * 78.233) * 12345.6789;
                        petal.set([cells[c * 2], cells[c * 2 + 1], h - Math.floor(h), h2 - Math.floor(h2)], k * 4);
                    }
                }
                const layer = ctx.addInstances({
                    name: "petals",
                    count,
                    geometry: "quad",
                    attributes: {
                        nodePos: [3, pos],
                        nodeColor: [4, color],
                        nodeInfo: [4, info],
                        petal: [4, petal],
                    },
                    varyings: PETAL_VARYINGS,
                    vertex: PETAL_VERTEX,
                    fragment: PETAL_FRAGMENT,
                    blend: "add",
                });
                layer.mesh.renderingGroupId = 1;
            },
        }),
};

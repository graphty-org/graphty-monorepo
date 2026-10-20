/**
 * Data packets and event bursts: every edge is a lane of little typed packets (three kinds, each
 * its own color, with a two-by-two bit pattern stamped on it) sliding from source to target.
 * Loaded edges are congested: their packets slow down and pile up into a queue at the target end.
 * Click a node to fire a burst: a volley of bright sparks leaves it along every edge and splashes
 * as a ring on each neighbor it reaches. With autoFire on, the burst repeats.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { BLOOM_POST, hubs, RIBBON } from "./common";

export default { title: "Shader Lab/Motion Along Edges And Propagation/Packets Bursts", ...labMeta };

interface Args extends GraphArgs {
    speed: number;
    cell: number;
    density: number;
    congestion: number;
    typeA: string;
    typeB: string;
    typeC: string;
    burstColor: string;
    burstSeconds: number;
    autoFire: boolean;
    firePeriod: number;
    bloom: number;
    bloomRadius: number;
}

const BURST = `
// seconds since the last burst (repeats every firePeriod with autoFire), large when none
float burstAge() {
    if (selectedNode < 0.0) return 1e3;
    float age = time - selectTime;
    return autoFire > 0.5 ? mod(age, firePeriod) : age;
}
`;

const EDGE_FRAGMENT = `
${RIBBON}
${BURST}
void main() {
    float cov = labEdgeCoverage();
    float L = max(vLengthPx, 1.0);
    float x = ribbonX();
    float y = ribbonY();
    float hw = vWidthPx * 0.5;
    float load = vData.x;
    float k = congestion * load * 2.0;
    // warp the lane so packets crowd and slow toward the target: X = L (x / L)^(1 + k)
    float X = L * pow(clamp(x / L, 0.0, 1.0), 1.0 + k);
    float cellPx = cell * pixelRatio;
    float u = X / cellPx - time * speed * 3.0 / (1.0 + k);
    float id = floor(u);
    float f = fract(u);
    float h = hash12(vec2(id, vInfo.z * 1.37));
    vec3 lane = mix(vColorA.rgb, vColorB.rgb, vT) * 0.18;
    float rim = smoothstep(0.75, 1.0, abs(vSide));
    vec3 c = lane + mix(vColorA.rgb, vColorB.rgb, vT) * rim * 0.5;
    if (h < density) {
        vec2 q = vec2((f - 0.5) * cellPx, y);
        float d = sdRoundBox(q, vec2(0.34 * cellPx, hw * 0.72), 1.5 * pixelRatio);
        float kind = floor(hash12(vec2(id * 3.1, vInfo.z)) * 3.0);
        vec3 pc = kind < 0.5 ? typeA : (kind < 1.5 ? typeB : typeC);
        // a 2 x 2 bit pattern from the packet's hash
        vec2 bitCell = step(vec2(0.0), q);
        float bit = step(0.5, hash12(vec2(id, bitCell.x * 2.0 + bitCell.y + 7.0)));
        float inner = fill(sdBox(q, vec2(0.22 * cellPx, hw * 0.45)));
        vec3 body = pc * mix(0.8, 1.25, bit * inner);
        body *= 1.0 - 0.45 * stroke(sdBox(q, vec2(0.0, hw)), 0.6 * pixelRatio) * inner;
        c = mix(c, body, fill(d));
    }
    // the burst: a volley of sparks leaving the selected node
    if (vTouch.y != 0.0) {
        float tt = vTouch.y > 0.0 ? vT : 1.0 - vT;
        float head = burstAge() / burstSeconds;
        float xs = tt * L;
        float glow = 0.0;
        for (int i = 0; i < 7; i++) {
            float fi = float(i);
            float p = (head - fi * 0.045) * L;
            float off = (hash11(fi * 7.3 + vInfo.z) - 0.5) * hw * 1.2;
            float rr = (2.6 - fi * 0.25) * pixelRatio;
            float dd = length(vec2(xs - p, y - off));
            glow += exp(-dd * dd / (rr * rr)) * (1.0 - fi / 8.0);
        }
        glow *= step(head, 1.05 + 0.3) * step(0.0, head);
        c += burstColor * glow * 2.5;
    }
    gl_FragColor = vec4(c, cov);
}
`;

const NODE_FRAGMENT = `
${BURST}
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    vec3 c = vColor.rgb * (0.55 + 0.45 * exp(-r * r * 2.0));
    vec3 add = vec3(0.0);
    float age = burstAge();
    // splash ring on neighbors when the burst lands
    if (vInfo.z == 1.0) {
        float x = age - burstSeconds;
        if (x > 0.0 && x < 0.8) {
            float rr = 1.0 + x * 3.5;
            add += burstColor * exp(-pow((r - rr) * 5.0, 2.0)) * (1.0 - x / 0.8) * 1.8;
            c = mix(c, vec3(1.0), exp(-x * 6.0));
        }
    }
    // the firing node kicks
    if (vInfo.z == 0.0) {
        add += burstColor * exp(-pow((r - 1.0 - age * 6.0) * 4.0, 2.0)) * exp(-age * 4.0) * 2.0;
    }
    c = mix(c, vec3(1.0), 0.45 * vState.x + stroke(d + 0.08, 0.06) * vState.y);
    vec3 col = c * a + add;
    float alpha = max(a, min(1.0, length(add)));
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
}
`;

export const PacketsBursts = {
    args: {
        ...graphArgs,
        graph: "flow",
        dim: 2,
        nodeSize: 1.1,
        edgeWidth: 9,
        speed: 1,
        cell: 14,
        density: 0.55,
        congestion: 1,
        typeA: "#4fc3f7",
        typeB: "#ffb74d",
        typeC: "#ba68c8",
        burstColor: "#fff3b0",
        burstSeconds: 0.9,
        autoFire: true,
        firePeriod: 2.5,
        bloom: 0.6,
        bloomRadius: 3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        speed: range(-3, 3),
        cell: range(6, 40, 1),
        density: range(0, 1),
        congestion: range(0, 3),
        typeA: { control: "color" },
        typeB: { control: "color" },
        typeC: { control: "color" },
        burstColor: { control: "color" },
        burstSeconds: range(0.2, 4),
        autoFire: { control: "boolean" },
        firePeriod: range(0.5, 8, 0.1),
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
            background: "#06070c",
            uniforms: {
                speed: args.speed,
                cell: args.cell,
                density: args.density,
                congestion: args.congestion,
                typeA: args.typeA,
                typeB: args.typeB,
                typeC: args.typeC,
                burstColor: args.burstColor,
                burstSeconds: args.burstSeconds,
                autoFire: args.autoFire,
                firePeriod: args.firePeriod,
                bloom: args.bloom,
                bloomRadius: args.bloomRadius,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 4, blend: "alpha" },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [BLOOM_POST],
            setup: (ctx) => {
                ctx.select(hubs(ctx.graph, 1)[0]);
            },
        }),
};

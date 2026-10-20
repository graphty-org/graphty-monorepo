/**
 * Black hole hub: the top PageRank hubs become black holes. A full-screen pass bends the scene
 * behind each one with a point-mass lens (an Einstein ring forms around the horizon), then
 * paints a black event horizon, a photon ring and a tilted, Doppler-beamed accretion disk with
 * Keplerian streaks. The back of the disk is lensed up over the top of the hole, as in the
 * Interstellar render.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { byRank, toScreen } from "./common";

export default { title: "Shader Lab/Scene render targets, backdrops and transitions/Black Hole Hub", ...labMeta };

interface Args extends GraphArgs {
    hubCount: number;
    horizon: number;
    lensStrength: number;
    diskColor: string;
    diskBrightness: number;
    diskSpeed: number;
    diskTilt: number;
    doppler: number;
}

const HUBS = 4;

/** The latest args, read every frame by setup (which runs once per build). */
let live: Pick<Args, "hubCount" | "horizon"> = { hubCount: 2, horizon: 1 };

// glossy sphere nodes, hubs discarded (the pass draws them)
const NODE_FRAGMENT = `
void main() {
    if (vCustom.x >= 0.0 && vCustom.x < hubCount) discard;
    vec3 n = labSphereNormal();
    vec3 l = normalize(vec3(-0.4, 0.6, -0.7));
    float diff = max(dot(n, l), 0.0);
    float spec = pow(max(dot(reflect(-l, n), -labViewDir), 0.0), 40.0);
    float rim = pow(1.0 - abs(n.z), 3.0);
    vec3 c = vColor.rgb * (0.25 + 0.85 * diff) + vec3(spec * 0.7) + vColor.rgb * rim * 0.6;
    c = mix(c, vec3(1.0), 0.4 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.45);
}
`;

const hubUniforms = Array.from({ length: HUBS }, (_, k) => `hub${k}`);

// deflection of every hub, summed: a point-mass lens maps a pixel at distance r to r - Re^2 / r
const lens = hubUniforms
    .map(
        (h) => `
    if (${h}.w > 0.5) {
        vec2 d = px - ${h}.xy; float r = max(length(d), 1.0);
        float re = ${h}.z * lensStrength * 2.2;
        defl += d / r * re * re / max(r, ${h}.z * 0.6);
    }`,
    )
    .join("");

const paint = hubUniforms
    .map((h, k) => `    if (${h}.w > 0.5) c = blackHole(c, px, ${h}, ${(k * 0.9 + 0.3).toFixed(2)});`)
    .join("\n");

const POST = `
vec3 diskColorAt(float rad, float phi, float side, float seed) {
    float a = phi + time * diskSpeed / pow(rad, 1.5) + seed * 10.0;
    float streak = noise(vec3(rad * 5.0, cos(a) * 2.5, sin(a) * 2.5 + seed));
    streak = 0.35 + 0.9 * pow(streak, 1.6) + 0.3 * noise(vec3(rad * 18.0, cos(a) * 9.0, sin(a) * 9.0));
    float heat = clamp(1.25 - (rad - 1.5) / 3.2, 0.0, 1.0);
    vec3 col = mix(diskColor, blackbody(0.3 + heat * 0.6), 0.5) * (0.25 + heat * 0.9);
    // relativistic beaming: the side moving toward us is brighter and bluer
    float beam = 1.0 + doppler * side;
    col *= beam * beam;
    col = mix(col, col * vec3(0.75, 0.9, 1.35), clamp(side * doppler, 0.0, 1.0) * 0.6);
    float edge = smoothstep(1.45, 1.75, rad) * (1.0 - smoothstep(3.6, 4.8, rad));
    return col * streak * edge * diskBrightness;
}

vec3 blackHole(vec3 c, vec2 px, vec4 h, float seed) {
    vec2 q = (px - h.xy) / h.z;
    float r = length(q);
    float ang = seed * 1.7 - 0.35;
    vec2 qr = rot2(ang * 0.25) * q;
    // disk frame: an ellipse squashed by the tilt
    vec2 dq = vec2(qr.x, qr.y / max(diskTilt, 0.05));
    float rad = length(dq);
    float phi = atan(dq.y, dq.x);
    float side = clamp(dq.x / max(rad, 1e-3), -1.0, 1.0);
    vec3 disk = diskColorAt(rad, phi, -side, seed);
    // soft lensing glow around the hole
    c += diskColor * 0.18 * exp(-max(r - 1.0, 0.0) * 1.3) * diskBrightness;
    // back half of the disk (above the center), hidden behind the horizon
    if (dq.y > 0.0) c += disk * smoothstep(0.98, 1.04, r);
    // the lensed image of the back of the disk, bent up over the top of the hole
    float arcR = 1.0 + 0.55 * (1.0 - diskTilt);
    float arc = exp(-pow((r - arcR - 0.25) / 0.22, 2.0)) * smoothstep(-0.2, 0.6, qr.y / max(r, 1e-3));
    c += diskColorAt(2.0 + (r - arcR) * 4.0, atan(qr.y, qr.x) * 2.0, -qr.x / max(r, 1e-3), seed) * arc * 0.9;
    // event horizon
    c *= smoothstep(0.96, 1.02, r);
    // photon ring
    c += mix(diskColor, vec3(1.0), 0.6) * exp(-pow((r - 1.04) / 0.035, 2.0)) * 1.2 * diskBrightness;
    // front half of the disk passes in front of the hole
    if (dq.y <= 0.0) c += disk;
    return c;
}

void main() {
    vec2 px = vUV * resolution;
    vec2 defl = vec2(0.0);
    ${lens}
    vec2 uv = (px - defl) / resolution;
    vec3 c = texture2D(textureSampler, clamp(uv, 0.0, 1.0)).rgb;
${paint}
    c = c / (1.0 + max(luminance(c) - 1.0, 0.0) * 0.5);
    gl_FragColor = vec4(c, 1.0);
}
`;

export const BlackHoleHub = {
    args: {
        ...graphArgs,
        hubCount: 2,
        horizon: 1.5,
        lensStrength: 1,
        diskColor: "#ff9a3c",
        diskBrightness: 0.8,
        diskSpeed: 2.5,
        diskTilt: 0.22,
        doppler: 0.45,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        hubCount: range(1, HUBS, 1),
        horizon: range(0.3, 3),
        lensStrength: range(0, 2.5),
        diskColor: { control: "color" },
        diskBrightness: range(0, 3),
        diskSpeed: range(0, 8),
        diskTilt: range(0.05, 1),
        doppler: range(0, 1),
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#05060b",
            uniforms: {
                hubCount: args.hubCount,
                horizon: args.horizon,
                lensStrength: args.lensStrength,
                diskColor: args.diskColor,
                diskBrightness: args.diskBrightness,
                diskSpeed: args.diskSpeed,
                diskTilt: args.diskTilt,
                doppler: args.doppler,
                ...Object.fromEntries(hubUniforms.map((h) => [h, [0, 0, 0, 0]])),
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                custom: (() => {
                    let order: number[] | undefined;
                    return (i, g) => {
                        order ??= Array.from({ length: g.n }, (_, k) => k).sort((p, q) => g.rank[q] - g.rank[p]);
                        const k = order.indexOf(i);
                        return [k < HUBS ? k : -1, 0, 0, 0];
                    };
                })(),
            },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            post: [POST],
            setup: (ctx) => {
                const hubs = byRank(ctx).slice(0, HUBS);
                const { pos, rank } = ctx.graph;
                ctx.onFrame(() => {
                    hubs.forEach((i, k) => {
                        const [sx, sy, ppw, ok] = toScreen(ctx, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
                        const worldR = live.horizon * 3.2 * (0.55 + 0.45 * rank[i]);
                        ctx.set(`hub${k}`, [sx, sy, Math.max(4, worldR * ppw), ok && k < live.hubCount ? 1 : 0]);
                    });
                });
            },
        });
    },
};

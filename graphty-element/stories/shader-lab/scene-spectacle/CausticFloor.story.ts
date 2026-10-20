/**
 * Caustic floor: the graph floats over the bottom of a swimming pool. A ground quad under it
 * draws animated water caustics (Dave Hoskins' iterated "tileable water caustic", one sample per
 * color channel for a little dispersion), fogged out toward the edges. The nodes bob gently;
 * where one moves (a random one every moment, and any node you hover) a ring ripple spreads
 * across the floor and bends the caustic pattern. The nodes themselves catch the same caustic
 * light on their upper sides.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Scene render targets, backdrops and transitions/Caustic Floor", ...labMeta };

interface Args extends GraphArgs {
    waterColor: string;
    lightColor: string;
    causticScale: number;
    causticSpeed: number;
    causticPower: number;
    dispersion: number;
    rippleStrength: number;
    rippleRate: number;
    bob: number;
}

const RIPPLES = 8;
const rs = Array.from({ length: RIPPLES }, (_, k) => k);

const CAUSTIC = `
float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    const int ITER = LAB_Q(3, 4, 5);
    for (int n = 0; n < ITER; n++) {
        float tt = t * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
    }
    c /= float(ITER);
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), causticPower);
}
vec3 causticRGB(vec2 uv, float t) {
    float s = dispersion * 0.006;
#if LAB_QUALITY == 0
    return vec3(caustic(uv, t));
#endif
    return vec3(caustic(uv + vec2(s, 0.0), t), caustic(uv, t), caustic(uv - vec2(s, 0.0), t));
}
`;

// node bob: a function of position only, so edge ends follow their nodes
const BOB = `
vec3 bobbed(vec3 p) { return p + vec3(0.0, 1.0, 0.0) * sin(time * 1.3 + hash13(floor(p * 7.0)) * TAU) * bob; }
`;

const FLOOR_VERTEX = `
void main() {
    vec2 q = position.xy * floorSize;
    vec3 w = flatFloor > 0.5 ? vec3(q.x, q.y, floorLevel) : vec3(q.x, floorLevel, q.y);
    vPlane = q;
    gl_Position = viewProjection * vec4(w, 1.0);
}
`;

const FLOOR_FRAGMENT = `${CAUSTIC}
void main() {
    vec2 p = vPlane;
    vec2 warp = vec2(0.0);
    float crest = 0.0;
${rs
    .map(
        (k) => `    { vec4 r = ripple${k}; float age = time - r.z;
      if (age > 0.0 && age < 4.0) {
        vec2 d = p - r.xy; float dist = max(length(d), 1e-3);
        float front = dist - age * 18.0;
        float env = exp(-front * front / 30.0) * (1.0 - age / 4.0) * r.w;
        float wave = cos(front * 1.4);
        warp += d / dist * wave * env; crest += sin(front * 1.4) * env;
      } }`,
    )
    .join("\n")}
    vec2 uv = (p + warp * rippleStrength * 2.0) / causticScale;
    vec3 caus = causticRGB(uv, time * causticSpeed + 23.0);
    float fade = 1.0 - smoothstep(floorSize * 0.45, floorSize * 0.98, length(p));
    vec3 c = waterColor * (0.45 + 0.25 * fbm(p * 0.03 + time * 0.02));
    c += lightColor * caus * 1.3;
    c += lightColor * max(crest, 0.0) * rippleStrength * 0.15;
    c = mix(waterColor * 0.15, c, fade);
    gl_FragColor = vec4(c, 1.0);
}
`;

const NODE_HOOKS = `${BOB}
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return bobbed(p); }
`;

const EDGE_HOOKS = `${BOB}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) { return mix(bobbed(a), bobbed(b), t); }
`;

const NODE_FRAGMENT = `${CAUSTIC}
void main() {
    vec3 n = labSphereNormal();
    // view-space normal back to world space (the view matrix is a rotation plus a shift)
    vec3 wn = normalize(vec3(dot(view[0].xyz, n), dot(view[1].xyz, n), dot(view[2].xyz, n)));
    vec3 pw = vCenterWorld + wn * vRadius;
    vec3 up = flatFloor > 0.5 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
    float top = max(dot(wn, up), 0.0);
    vec2 plane = flatFloor > 0.5 ? pw.xy : pw.xz;
    vec3 caus = causticRGB(plane / causticScale, time * causticSpeed + 23.0);
    vec3 c = vColor.rgb * (0.25 + 0.45 * top) + lightColor * caus * top * 0.9;
    c += waterColor * pow(1.0 - abs(n.z), 3.0) * 0.8;
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(mix(vColorA.rgb, vColorB.rgb, vT), lightColor, 0.3);
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.5);
}
`;

let live = { rippleRate: 3 };

export const CausticFloor = {
    args: {
        ...graphArgs,
        waterColor: "#0f5f7a",
        lightColor: "#c8fbff",
        causticScale: 26,
        causticSpeed: 0.5,
        causticPower: 7,
        dispersion: 1,
        rippleStrength: 1,
        rippleRate: 3,
        bob: 1.2,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        waterColor: { control: "color" },
        lightColor: { control: "color" },
        causticScale: range(5, 80),
        causticSpeed: range(0, 2),
        causticPower: range(2, 14),
        dispersion: range(0, 4),
        rippleStrength: range(0, 3),
        rippleRate: { ...range(0, 10), description: "ripples per second from moving nodes" },
        bob: range(0, 5),
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#03141c",
            uniforms: {
                waterColor: args.waterColor,
                lightColor: args.lightColor,
                causticScale: args.causticScale,
                causticSpeed: args.causticSpeed,
                causticPower: args.causticPower,
                dispersion: args.dispersion,
                rippleStrength: args.rippleStrength,
                bob: args.bob,
                floorLevel: 0,
                floorSize: 100,
                flatFloor: 0,
                ...Object.fromEntries(rs.map((k) => [`ripple${k}`, [0, 0, -100, 0]])),
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS },
            setup: (ctx) => {
                const { graph } = ctx;
                const flat = graph.dim === 2;
                let lo = Infinity;
                let hi = -Infinity;
                let extent = 0;
                for (let i = 0; i < graph.n; i++) {
                    const y = graph.pos[i * 3 + 1];
                    lo = Math.min(lo, y);
                    hi = Math.max(hi, graph.pos[i * 3 + 2]);
                    extent = Math.max(extent, Math.hypot(graph.pos[i * 3], flat ? y : graph.pos[i * 3 + 2]));
                }
                ctx.set("flatFloor", flat ? 1 : 0);
                ctx.set("floorLevel", flat ? hi + 10 : lo - 14);
                ctx.set("floorSize", extent * 1.9 + 20);
                const floor = ctx.addInstances({
                    name: "caustic-floor",
                    count: 1,
                    attributes: {},
                    varyings: "varying vec2 vPlane;",
                    vertex: FLOOR_VERTEX,
                    fragment: FLOOR_FRAGMENT,
                });
                floor.mesh.renderingGroupId = 0;

                const ripples = rs.map(() => [0, 0, -100, 0]);
                let next = 0;
                const spawn = (i: number, strength: number): void => {
                    const p = graph.pos;
                    ripples[next] = [p[i * 3], flat ? p[i * 3 + 1] : p[i * 3 + 2], ctx.time, strength];
                    next = (next + 1) % RIPPLES;
                };
                let hovered = -1;
                let since = 0;
                ctx.onFrame((_t, dt) => {
                    since += dt;
                    if (live.rippleRate > 0 && since > 1 / live.rippleRate) {
                        since = 0;
                        spawn(Math.floor(Math.random() * graph.n), 0.5 + Math.random() * 0.5);
                    }
                    const state = ctx.nodes?.buffers.nodeState;
                    let h = -1;
                    for (let i = 0; state && i < graph.n; i++) {
                        if (state[i * 4] > 0.5) {
                            h = i;
                            break;
                        }
                    }
                    if (h >= 0 && h !== hovered) {
                        spawn(h, 1.6);
                    }
                    hovered = h;
                    ripples.forEach((r, k) => {
                        ctx.set(`ripple${k}`, r);
                    });
                });
            },
        });
    },
};

/**
 * Shockwave and gravity wave: a click on a node (and, every few seconds, a random hub, standing in
 * for "a node was added" or "an algorithm finished") sends out a spherical wave. As the front
 * passes, the vertex shaders push nodes and edge points outward (edges bend, nodes swell) and a
 * full-screen pass bends the image along a ring with a slight red-green-blue split, like a heat
 * shock. Up to eight waves run at once.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { toScreen } from "./common";

export default { title: "Shader Lab/Scene render targets, backdrops and transitions/Shockwave", ...labMeta };

interface Args extends GraphArgs {
    waveSpeed: number;
    waveWidth: number;
    amplitude: number;
    life: number;
    chroma: number;
    ringGlow: number;
    ringColor: string;
    interval: number;
}

const WAVES = 8;
const ks = Array.from({ length: WAVES }, (_, k) => k);

// world-space wave: band = gaussian around the expanding front, fading with age
const WAVE_GLSL = `
float shockBand(float r, float start) {
    float age = time - start;
    if (age < 0.0 || age > life) return 0.0;
    float front = age * waveSpeed;
    float fade = 1.0 - age / life;
    float x = (r - front) / waveWidth;
    return exp(-x * x) * fade * fade;
}
vec3 shockOne(vec3 p, vec4 w) {
    vec3 d = p - w.xyz;
    float r = length(d);
    if (r < 1e-3) return vec3(0.0);
    return d / r * shockBand(r, w.w) * amplitude;
}
vec3 shockOffset(vec3 p) {
    return ${ks.map((k) => `shockOne(p, wave${k})`).join(" + ")};
}
float shockAt(vec3 p) {
    return ${ks.map((k) => `shockBand(length(p - wave${k}.xyz), wave${k}.w)`).join(" + ")};
}
`;

// screen-space ring, for brightening in fragment shaders and the post pass
const SCREEN_GLSL = `
float ringOne(vec2 px, vec4 s) {
    float age = time - s.w;
    if (age < 0.0 || age > life || s.z <= 0.0) return 0.0;
    float r = length(px - s.xy);
    float x = (r - age * waveSpeed * s.z) / (waveWidth * s.z);
    float fade = 1.0 - age / life;
    return exp(-x * x) * fade * fade;
}
float screenRing(vec2 px) { return ${ks.map((k) => `ringOne(px, ws${k})`).join(" + ")}; }
`;

const NODE_HOOKS = `${WAVE_GLSL}
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return p + shockOffset(p); }
#define LAB_NODE_SCALE
float labNodeScale() { return 1.0 + 0.6 * min(shockAt(nodePos), 1.5); }
`;

const EDGE_HOOKS = `${WAVE_GLSL}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) { vec3 p = mix(a, b, t); return p + shockOffset(p); }
`;

const NODE_FRAGMENT = `${SCREEN_GLSL}
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.3, 0.6, -0.75))), 0.0);
    vec3 c = vColor.rgb * (0.3 + 0.8 * diff) + vec3(0.5) * pow(diff, 40.0);
    float ring = min(screenRing(gl_FragCoord.xy), 1.0);
    c = mix(c, ringColor * 1.4, ring * ringGlow * 0.6);
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `${SCREEN_GLSL}
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float ring = min(screenRing(gl_FragCoord.xy), 1.0);
    c = mix(c, ringColor * 1.6, ring * ringGlow);
    gl_FragColor = vec4(c, labEdgeCoverage() * (0.45 + 0.55 * ring));
}
`;

const POST = `${SCREEN_GLSL}
void main() {
    vec2 px = vUV * resolution;
    vec2 disp = vec2(0.0);
    float glow = 0.0;
    float crisp = 0.0;
${ks
    .map(
        (k) => `    { vec4 s = ws${k}; float b = ringOne(px, s); vec2 d = px - s.xy; float r = max(length(d), 1.0);
      // the ring pulls the image inward on its leading edge and pushes it out behind
      float age = time - s.w; float x = (r - age * waveSpeed * s.z) / (waveWidth * s.z);
      disp += d / r * b * x * waveWidth * s.z * 0.6; glow += b;
      // a thin bright line at the front itself, independent of the wide displacement band
      if (age > 0.0 && age < life && s.z > 0.0) { float f = 1.0 - age / life; crisp += exp(-x * x * 24.0) * f; } }`,
    )
    .join("\n")}
    vec2 o = disp / resolution;
    float r = texture2D(textureSampler, vUV - o * (1.0 + chroma * 0.25)).r;
    float g = texture2D(textureSampler, vUV - o).g;
    float b = texture2D(textureSampler, vUV - o * (1.0 - chroma * 0.25)).b;
    // a soft halo plus a crisp bright front, so the ring reads on a dark background
    vec3 c = vec3(r, g, b) + ringColor * (min(glow, 1.0) * 0.15 + min(crisp, 1.0) * 0.9) * ringGlow;
    gl_FragColor = vec4(c, 1.0);
}
`;

let live = { interval: 2.5 };

export const Shockwave = {
    args: {
        ...graphArgs,
        waveSpeed: 45,
        waveWidth: 7,
        amplitude: 5,
        life: 2.6,
        chroma: 1,
        ringGlow: 0.9,
        ringColor: "#9fd8ff",
        interval: 2.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        waveSpeed: range(5, 120),
        waveWidth: range(1, 25),
        amplitude: range(0, 15),
        life: range(0.5, 6),
        chroma: range(0, 4),
        ringGlow: range(0, 1.5),
        ringColor: { control: "color" },
        interval: { ...range(0, 8), description: "seconds between automatic waves (0 = only on click)" },
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#070a12",
            uniforms: {
                waveSpeed: args.waveSpeed,
                waveWidth: args.waveWidth,
                amplitude: args.amplitude,
                life: args.life,
                chroma: args.chroma,
                ringGlow: args.ringGlow,
                ringColor: args.ringColor,
                ...Object.fromEntries(ks.map((k) => [`wave${k}`, [0, 0, 0, -100]])),
                ...Object.fromEntries(ks.map((k) => [`ws${k}`, [0, 0, 0, -100]])),
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS, segments: 24 },
            post: [POST],
            setup: (ctx) => {
                const { graph } = ctx;
                const waves = ks.map(() => ({ x: 0, y: 0, z: 0, start: -100 }));
                let next = 0;
                const spawn = (i: number): void => {
                    waves[next] = {
                        x: graph.pos[i * 3],
                        y: graph.pos[i * 3 + 1],
                        z: graph.pos[i * 3 + 2],
                        start: ctx.time,
                    };
                    next = (next + 1) % WAVES;
                };
                const hubs = Array.from({ length: graph.n }, (_, i) => i)
                    .sort((p, q) => graph.rank[q] - graph.rank[p])
                    .slice(0, 30);
                let lastAuto = -10;
                const onUp = (): void => {
                    const state = ctx.nodes?.buffers.nodeState;
                    for (let i = 0; state && i < graph.n; i++) {
                        if (state[i * 4] > 0.5) {
                            spawn(i);
                            lastAuto = ctx.time;
                            return;
                        }
                    }
                };
                ctx.canvas.addEventListener("pointerup", onUp);
                ctx.onFrame((t) => {
                    if (live.interval > 0 && t - lastAuto > live.interval) {
                        lastAuto = t;
                        spawn(hubs[Math.floor(Math.random() * hubs.length)]);
                    }
                    waves.forEach((w, k) => {
                        ctx.set(`wave${k}`, [w.x, w.y, w.z, w.start]);
                        const [sx, sy, ppw] = toScreen(ctx, w.x, w.y, w.z);
                        ctx.set(`ws${k}`, [sx, sy, ppw, w.start]);
                    });
                });
                return () => {
                    ctx.canvas.removeEventListener("pointerup", onUp);
                };
            },
        });
    },
};

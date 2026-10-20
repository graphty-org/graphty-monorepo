/**
 * Retro and illustration looks: the whole rendered graph goes through one full-screen shader
 * that restyles every pixel. Pick a look:
 * - crt: a curved tube with scanlines, an RGB shadow mask, a rolling hum bar and vignette
 * - 1-bit dither: two inks, an ordered (Bayer 8x8) dither pattern standing in for gray
 * - ascii: each 8x8 cell becomes a character picked by brightness, drawn from 5x5 bitmaps
 * - pixel art: big pixels snapped to the PICO-8 sixteen-color palette, with dark outlines
 * - phosphor: a green radar screen whose glow lingers (each frame fades into the last)
 * - pencil: Sobel edges as graphite strokes plus cross-hatching by darkness, re-drawn at 8 fps
 * - watercolor: Kuwahara smoothing into flat washes, darker pigment at their edges, paper grain
 * - blueprint: white lines on blueprint blue, drafting grid, edges detected as outlines
 */
import { Constants } from "@babylonjs/core";

import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addPass, liveArgs, rgb } from "./common";

export default { title: "Shader Lab/Glow Bloom And Post/Stylize Looks", ...labMeta };

const LOOKS = ["crt", "1-bit dither", "ascii", "pixel art", "phosphor", "pencil", "watercolor", "blueprint"] as const;

interface Args extends GraphArgs {
    look: (typeof LOOKS)[number];
    cell: number;
    amount: number;
    ink: string;
    paper: string;
    persistence: number;
}

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.5, 0.6, -0.6))), 0.0);
    vec3 c = vColor.rgb * (0.35 + 0.8 * diff) + 0.25 * pow(diff, 16.0);
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.4 * vState.x + 0.4 * vState.y), 1.0);
}
`;
const EDGE_FRAGMENT = `
void main() {
    gl_FragColor = vec4(mix(vColorA.rgb, vColorB.rgb, vT), labEdgeCoverage() * 0.6);
}
`;

const HELPERS = `
vec3 S(vec2 uv) { return texture2D(textureSampler, uv).rgb; }
float L(vec2 uv) { return luminance(S(uv)); }
float sobel(vec2 uv, vec2 px) {
    float tl = L(uv + px * vec2(-1, 1)); float t = L(uv + px * vec2(0, 1)); float tr = L(uv + px * vec2(1, 1));
    float l = L(uv + px * vec2(-1, 0)); float r = L(uv + px * vec2(1, 0));
    float bl = L(uv + px * vec2(-1, -1)); float b = L(uv + px * vec2(0, -1)); float br = L(uv + px * vec2(1, -1));
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
    return length(vec2(gx, gy));
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer8(vec2 a) { return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a); }
`;

const LOOK_SHADERS: Record<(typeof LOOKS)[number], string> = {
    crt: `
void main() {
    vec2 uv = vUV * 2.0 - 1.0;
    uv *= 1.0 + dot(uv.yx, uv.yx) * vec2(0.08, 0.11) * amount;
    vec2 q = uv * 0.5 + 0.5;
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float ca = 0.0015 * amount;
    vec3 c = vec3(S(q + vec2(ca, 0.0)).r, S(q).g, S(q - vec2(ca, 0.0)).b);
    // a cheap glow: the image blurred a little and added back
    vec3 blur = (S(q + vec2(0.003, 0.0)) + S(q - vec2(0.003, 0.0)) + S(q + vec2(0.0, 0.004)) + S(q - vec2(0.0, 0.004))) * 0.25;
    c = c * 1.15 + blur * 0.6;
    float line = gl_FragCoord.y / pixelRatio / max(cell * 0.4, 1.0);
    c *= 0.65 + 0.35 * pow(abs(sin(line * PI)), 1.5);
    float m = mod(gl_FragCoord.x / pixelRatio, 3.0);
    c *= mix(vec3(1.0), vec3(m < 1.0 ? 1.25 : 0.8, m >= 1.0 && m < 2.0 ? 1.25 : 0.8, m >= 2.0 ? 1.25 : 0.8), 0.5 * amount);
    c *= 1.0 + 0.06 * sin(q.y * 6.0 - time * 2.0);
    c *= pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);
    c += (hash12(gl_FragCoord.xy + fract(time) * 100.0) - 0.5) * 0.04;
    gl_FragColor = vec4(c, 1.0);
}`,
    "1-bit dither": `
void main() {
    vec2 p = floor(gl_FragCoord.xy / (pixelRatio * max(cell * 0.25, 1.0)));
    float l = pow(max(L(vUV) - 0.09, 0.0) / 0.91, 0.9) * (0.6 + 0.6 * amount);
    float on = step(bayer8(p) * 0.92 + 0.08, l);
    gl_FragColor = vec4(mix(paper, ink, on), 1.0);
}`,
    ascii: `
float glyph(float n, vec2 p) {
    p = floor(p * vec2(-4.0, 4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
        if (int(mod(n / exp2(p.x + 5.0 * p.y), 2.0)) == 1) return 1.0;
    }
    return 0.0;
}
void main() {
    float cs = max(cell, 4.0) * pixelRatio;
    vec2 cellPos = floor(gl_FragCoord.xy / cs) * cs;
    vec3 c = S((cellPos + cs * 0.5) / resolution);
    float g = pow(luminance(c), 0.7) * (0.8 + 0.6 * amount);
    float n = 4096.0;
    if (g > 0.15) n = 65600.0;
    if (g > 0.25) n = 163153.0;
    if (g > 0.35) n = 15255086.0;
    if (g > 0.45) n = 13121101.0;
    if (g > 0.55) n = 15252014.0;
    if (g > 0.65) n = 13195790.0;
    if (g > 0.8) n = 11512810.0;
    vec2 p = mod(gl_FragCoord.xy / (cs * 0.5), 2.0) - vec2(1.0);
    float on = g > 0.13 ? glyph(n, p) : 0.0;
    vec3 tint = mix(vec3(0.85), normalize(c + 1e-3) * 1.4, 0.7);
    gl_FragColor = vec4(mix(vec3(0.02), tint, on), 1.0);
}`,
    "pixel art": `
vec3 pico(int i) {
    if (i == 0) return vec3(0.0); if (i == 1) return vec3(0.114, 0.169, 0.325); if (i == 2) return vec3(0.494, 0.145, 0.325);
    if (i == 3) return vec3(0.0, 0.529, 0.318); if (i == 4) return vec3(0.671, 0.322, 0.212); if (i == 5) return vec3(0.373, 0.341, 0.31);
    if (i == 6) return vec3(0.761, 0.765, 0.78); if (i == 7) return vec3(1.0, 0.945, 0.91); if (i == 8) return vec3(1.0, 0.0, 0.302);
    if (i == 9) return vec3(1.0, 0.639, 0.0); if (i == 10) return vec3(1.0, 0.925, 0.153); if (i == 11) return vec3(0.0, 0.894, 0.212);
    if (i == 12) return vec3(0.161, 0.678, 1.0); if (i == 13) return vec3(0.514, 0.463, 0.612); if (i == 14) return vec3(1.0, 0.467, 0.659);
    return vec3(1.0, 0.8, 0.667);
}
vec3 snap(vec3 c) {
    vec3 best = vec3(0.0); float bd = 1e9;
    for (int i = 0; i < 16; i++) { vec3 p = pico(i); float e = dot(c - p, c - p); if (e < bd) { bd = e; best = p; } }
    return best;
}
void main() {
    float cs = max(cell * 0.6, 2.0) * pixelRatio;
    vec2 cp = floor(gl_FragCoord.xy / cs);
    vec2 uv = (cp + 0.5) * cs / resolution;
    vec3 c = S(uv);
    c = pow(max(c - 0.08, 0.0) / 0.92, vec3(0.6));
    c = clamp(mix(vec3(luminance(c)), c, 1.8) * (1.5 + 0.8 * amount), 0.0, 1.0);
    float e = sobel(uv, vec2(cs) / resolution);
    vec3 o = snap(c + (bayer2(cp) - 0.5) * 0.12 * step(0.12, luminance(c)));
    o = mix(o, pico(1), step(0.4, e) * step(luminance(c), 0.12));
    gl_FragColor = vec4(o, 1.0);
}`,
    phosphor: `
void main() {
    float l = L(vUV);
    float glow = (L(vUV + vec2(0.002, 0.0)) + L(vUV - vec2(0.002, 0.0)) + L(vUV + vec2(0.0, 0.003)) + L(vUV - vec2(0.0, 0.003))) * 0.25;
    float v = pow(l * 1.3 + glow * 0.6, 0.8) * (0.7 + 0.6 * amount);
    vec3 c = vec3(0.15, 1.0, 0.35) * v + vec3(0.6, 1.0, 0.7) * pow(v, 3.0) * 0.4;
    c += vec3(0.0, 0.04, 0.01);
    // alpha is how much of this frame replaces the lingering image (see the blend below)
    gl_FragColor = vec4(c, 1.0 - persistence * 0.95);
}`,
    pencil: `
void main() {
    float fr = floor(time * 8.0);
    vec2 j = (hash22(vec2(fr, 3.1)) - 0.5) * 2.0 / resolution * pixelRatio;
    vec2 px = pixelRatio * 1.2 / resolution;
    vec2 uv = vUV + j + (vec2(noise(vUV * 40.0 + fr), noise(vUV * 40.0 - fr)) - 0.5) * 0.002;
    float e = smoothstep(0.08, 0.5, sobel(uv, px)) * (0.6 + 0.6 * amount);
    float l = L(uv);
    vec2 p = gl_FragCoord.xy / pixelRatio;
    float wob = noise(p * 0.05 + fr) * 3.0;
    float h1 = smoothstep(0.55, 0.0, abs(fract((p.x + p.y + wob) / max(cell * 0.6, 2.0)) - 0.5) * 2.0);
    float h2 = smoothstep(0.55, 0.0, abs(fract((p.x - p.y + wob) / max(cell * 0.6, 2.0)) - 0.5) * 2.0);
    float dark = 1.0 - smoothstep(0.02, 0.5, l);
    float hatch = h1 * smoothstep(0.1, 0.4, l + 0.0) * smoothstep(0.75, 0.3, l) + h2 * step(0.35, dark) * smoothstep(0.35, 0.8, l * 2.0);
    float graphite = clamp(e + hatch * 0.5, 0.0, 1.0);
    vec3 pap = paper * (0.93 + 0.07 * fbm(p * 0.08)) * (0.97 + 0.03 * noise(p * 1.3));
    vec3 c = mix(pap, ink, graphite * (0.75 + 0.25 * noise(p * 0.7 + fr)));
    // a hint of the node color, as if touched with colored pencil
    c = mix(c, c * mix(vec3(1.0), S(uv) * 2.2 + 0.25, 0.35), step(0.04, l) * 0.6);
    gl_FragColor = vec4(c, 1.0);
}`,
    watercolor: `
void main() {
    // Kuwahara radius R (taps 4 (R+1)^2), spacing stretched so the footprint stays the same
    const int R = LAB_Q(2, 3, 4);
    const float N = float((R + 1) * (R + 1));
    vec2 px = pixelRatio * max(cell * 0.25, 1.0) / resolution * 4.0 / float(R);
    vec2 uv = vUV + (vec2(fbm(vUV * 12.0), fbm(vUV * 12.0 + 5.0)) - 0.5) * 0.006 * amount;
    vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);
    vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);
    for (int y = 0; y <= R; y++) for (int x = 0; x <= R; x++) {
        vec2 o = vec2(float(x), float(y)) * px;
        vec3 a = S(uv + vec2(-o.x, -o.y)); m0 += a; s0 += a * a;
        vec3 b = S(uv + vec2(o.x, -o.y)); m1 += b; s1 += b * b;
        vec3 c = S(uv + vec2(o.x, o.y)); m2 += c; s2 += c * c;
        vec3 d = S(uv + vec2(-o.x, o.y)); m3 += d; s3 += d * d;
    }
    m0 /= N; m1 /= N; m2 /= N; m3 /= N;
    float v0 = dot(s0 / N - m0 * m0, vec3(1.0)); float v1 = dot(s1 / N - m1 * m1, vec3(1.0));
    float v2 = dot(s2 / N - m2 * m2, vec3(1.0)); float v3 = dot(s3 / N - m3 * m3, vec3(1.0));
    vec3 c = m0; float v = v0;
    if (v1 < v) { v = v1; c = m1; } if (v2 < v) { v = v2; c = m2; } if (v3 < v) { v = v3; c = m3; }
    vec2 p = gl_FragCoord.xy / pixelRatio;
    // paint is transparent: it darkens the paper (multiply), pooling darker at wash edges
    float edge = smoothstep(0.03, 0.25, sobel(uv, px * 1.5 * float(R) / 4.0));
    float gran = fbm(p * 0.35) * 0.5 + noise(p * 2.0) * 0.5;
    vec3 pigment = mix(vec3(1.0), c * 1.6 + 0.05, smoothstep(0.02, 0.25, luminance(c)));
    pigment = mix(pigment, pigment * pigment, edge * 0.7 + gran * 0.25 * amount);
    vec3 pap = paper * (0.92 + 0.08 * fbm(p * 0.06));
    gl_FragColor = vec4(pap * pigment, 1.0);
}`,
    blueprint: `
void main() {
    vec2 p = gl_FragCoord.xy / pixelRatio;
    vec2 px = pixelRatio * 1.0 / resolution;
    float e = smoothstep(0.06, 0.35, sobel(vUV, px));
    float l = L(vUV);
    float gs = max(cell * 3.0, 8.0);
    vec2 g = abs(fract(p / gs + 0.5) - 0.5) * gs;
    vec2 g5 = abs(fract(p / (gs * 5.0) + 0.5) - 0.5) * gs * 5.0;
    float grid = max(1.0 - smoothstep(0.0, 1.0, min(g.x, g.y)), 0.0) * 0.25 + (1.0 - smoothstep(0.0, 1.2, min(g5.x, g5.y))) * 0.35;
    vec3 c = paper * (0.9 + 0.1 * fbm(p * 0.01));
    c = mix(c, ink, grid * 0.5);
    c = mix(c, ink, clamp(e * (0.8 + 0.4 * amount) + smoothstep(0.08, 0.6, l) * 0.25, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0);
}`,
};

const INKS: Record<string, [string, string]> = {
    "1-bit dither": ["#e8e3d3", "#1d1b26"],
    pencil: ["#2b2b33", "#f1ece0"],
    watercolor: ["#2b2b33", "#f4efe4"],
    blueprint: ["#eaf2ff", "#1c4f9c"],
};

const DEFAULTS: Args = {
    ...graphArgs,
    look: "crt",
    cell: 8,
    amount: 0.6,
    ink: "",
    paper: "",
    persistence: 0.7,
};
const live = liveArgs(DEFAULTS);

export const StylizeLooks = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        look: { control: "select", options: LOOKS },
        cell: range(2, 24, 1),
        amount: range(0, 1),
        ink: { control: "color", description: "empty = the look's own ink" },
        paper: { control: "color", description: "empty = the look's own paper" },
        persistence: range(0, 0.98),
    },
    render: (args: Args) => {
        live.update(args);
        const { look } = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            autoRotate: true,
            background: "#101218",
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            rebuildOn: [look],
            setup: (ctx) => {
                const a = (): Args => live.current;
                const [defInk, defPaper] = INKS[look] ?? ["#ffffff", "#000000"];
                const pass = addPass(ctx, {
                    samples: 4,
                    fragment: HELPERS + LOOK_SHADERS[look],
                    uniforms: {
                        cell: () => a().cell,
                        amount: () => a().amount,
                        persistence: () => a().persistence,
                        ink: () => rgb(a().ink || defInk),
                        paper: () => rgb(a().paper || defPaper),
                    },
                });
                if (look === "phosphor") {
                    // the next pass keeps last frame's picture (no clear) and this one blends
                    // over it, so each frame fades in over the one before: a lingering glow
                    pass.alphaMode = Constants.ALPHA_COMBINE;
                    // a blending pass skips clearing its own input, which is where the scene
                    // draws: without this the scene itself never cleared and smeared forever,
                    // whatever the persistence
                    pass.onActivateObservable.add(() => {
                        ctx.engine.clear(ctx.scene.clearColor, true, true, true);
                    });
                    const keep = addPass(ctx, {
                        fragment: `void main() {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    vec2 q = vUV * 2.0 - 1.0;
    float line = 0.8 + 0.2 * sin(gl_FragCoord.y / pixelRatio * PI * 0.5);
    gl_FragColor = vec4(c * line * (1.0 - 0.35 * dot(q, q)), 1.0);
}`,
                    });
                    keep.autoClear = false;
                }
            },
        });
    },
};

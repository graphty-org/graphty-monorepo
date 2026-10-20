/**
 * Kernel-density edge bundling (KDEEB, Hurter et al. 2012) on the GPU: the "bundle" slider pulls
 * a hairball of straight edges into a few smooth highways, like airline routes or nerve fibers.
 * Streaming light particles run along every edge from source to target, so the trunks glow and
 * flow.
 *
 * How: each edge is cut into 24 sample points stored in a float texture (one row per edge). One
 * iteration splats every sample point as a soft kernel into a density texture, then a pass moves
 * each sample a step up the density gradient (toward where other edges run), and another pass
 * smooths each edge along its length. Repeating with a shrinking kernel collects the edges into
 * bundles. The edge strips then read their bent shape from the sample texture in the vertex
 * shader, mixed with the straight line by the slider.
 */
import type { RenderTargetTexture } from "@babylonjs/core";

import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import {
    boundsUniforms,
    effectRenderer,
    everyFrame,
    floatTexture,
    graphBounds,
    makePass,
    makeTarget,
    splat,
    worldBackground,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Kdeeb Bundling", ...labMeta };

interface Args extends GraphArgs {
    bundle: number;
    animate: boolean;
    particles: number;
    particleSpeed: number;
    glow: number;
    showDensity: number;
    kernel: number;
    iterations: number;
    attraction: number;
    smoothing: number;
}

/** Sample points per edge. */
const K = 24;
const FIELD = 256;

const DENSITY_VERTEX = `
uniform sampler2D samples;
void main() {
    vec4 sp = texture2D(samples, sampleUV);
    vec2 p = sp.xy;
    vWeight = clamp(sp.z / 40.0, 0.15, 1.0);
    gl_Position = vec4((p + position.xy * bundleKernel - boundsCenter) / boundsHalf, 0.0, 1.0);
    vUV = position.xy;
}
`;
const DENSITY_FRAGMENT = `
void main() {
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    float k = exp(-r2 * 3.0) * (1.0 - r2) * 0.1 * vWeight;
    gl_FragColor = vec4(k);
}
`;

const COPY = `
uniform sampler2D src;
void main() { gl_FragColor = texture2D(src, vUV); }
`;

// move each inner sample up the density gradient
const ADVECT = `
uniform sampler2D src;
uniform sampler2D straight;
uniform sampler2D density;
uniform float kernel;
uniform float attraction;
uniform vec2 boundsC;
uniform float boundsH;
void main() {
    vec4 s = texture2D(src, vUV);
    float k = floor(vUV.x * ${K}.0);
    if (k < 0.5 || k > ${K - 1}.5) { gl_FragColor = texture2D(straight, vUV); return; }
    vec2 uv = (s.xy - boundsC) / boundsH * 0.5 + 0.5;
    float e = 1.0 / ${FIELD}.0;
    float dx = texture2D(density, uv + vec2(e, 0.0)).r - texture2D(density, uv - vec2(e, 0.0)).r;
    float dy = texture2D(density, uv + vec2(0.0, e)).r - texture2D(density, uv - vec2(0.0, e)).r;
    vec2 g = vec2(dx, dy);
    float gl = length(g);
    // long edges bundle fully; short ones (inside a community) barely move
    float lengthFactor = clamp(s.z / 40.0, 0.1, 1.0);
    vec2 step = gl > 1e-6 ? g / gl * kernel * attraction * lengthFactor * smoothstep(0.0, 0.002, gl) : vec2(0.0);
    gl_FragColor = vec4(s.xy + step, s.z, 1.0);
}
`;

// Laplacian smoothing along the edge; endpoints stay put
const SMOOTH = `
uniform sampler2D src;
uniform float smoothing;
void main() {
    float k = floor(vUV.x * ${K}.0);
    vec4 s = texture2D(src, vUV);
    if (k < 0.5 || k > ${K - 1}.5) { gl_FragColor = s; return; }
    float du = 1.0 / ${K}.0;
    vec2 l = texture2D(src, vUV - vec2(du, 0.0)).xy;
    vec2 r = texture2D(src, vUV + vec2(du, 0.0)).xy;
    gl_FragColor = vec4(mix(s.xy, 0.5 * (l + r), smoothing), s.z, 1.0);
}
`;

const EDGE_HOOKS = `
uniform sampler2D samples;
vec2 bundled(float k) {
    k = clamp(k, 0.0, ${K - 1}.0);
    return texture2D(samples, vec2((k + 0.5) / ${K}.0, (edgeInfo.z + 0.5) / edgeCount)).xy;
}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    float fk = t * ${K - 1}.0;
    float k = floor(fk);
    float f = fk - k;
    vec2 p0 = bundled(k - 1.0); vec2 p1 = bundled(k); vec2 p2 = bundled(k + 1.0); vec2 p3 = bundled(k + 2.0);
    // Catmull-Rom through the samples
    vec2 q = 0.5 * ((2.0 * p1) + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f * f + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f * f * f);
    float amount = animate > 0.5 ? smoothstep(0.1, 0.9, 0.5 + 0.5 * sin(time * 0.6)) * bundle : bundle;
    return mix(mix(a, b, t), vec3(q, a.z), amount);
}
`;

const EDGE = `
void main() {
    float cov = labEdgeCoverage();
    float core = exp(-vSide * vSide * 2.0);
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    // light particles travel from source to target; spacing in pixels, offset per edge
    float s = vT * vLengthPx / 60.0 - time * particleSpeed + vData.w * 7.0;
    float pulse = pow(max(0.0, 1.0 - abs(fract(s) - 0.5) * 2.0 * 3.0), 3.0) * particles;
    float across = step(0.5, abs(vData.y - vData.z));
    vec3 col = c * (0.12 + 0.14 * across + 0.6 * lit) * glow + vec3(1.0, 0.95, 0.85) * pulse * core * 0.9 * (0.5 + 0.5 * glow);
    gl_FragColor = vec4(col * core * cov, 1.0);
}
`;

const BACKGROUND = `
uniform sampler2D density;
void main() {
    float d = texture2D(density, vUV).r;
    vec3 c = vec3(0.012, 0.016, 0.03) + vec3(0.08, 0.12, 0.25) * (1.0 - exp(-d * 0.6)) * showDensity;
    float edge = smoothstep(0.0, 0.08, min(min(vUV.x, vUV.y), min(1.0 - vUV.x, 1.0 - vUV.y)));
    gl_FragColor = vec4(mix(vec3(0.012, 0.016, 0.03), c, edge), 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.6 + 0.4 * max(vState.x, vState.y));
    gl_FragColor = vec4(c, a);
}
`;

export const KdeebBundling = {
    args: {
        ...graphArgs,
        graph: "weighted",
        dim: 2,
        nodeSize: 0.9,
        edgeWidth: 2,
        bundle: 1,
        animate: false,
        particles: 0.8,
        particleSpeed: 1.2,
        glow: 1,
        showDensity: 0.6,
        kernel: 6,
        iterations: 30,
        attraction: 0.2,
        smoothing: 0.6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        dim: { table: { disable: true } },
        bundle: range(0, 1),
        particles: range(0, 2),
        particleSpeed: range(0, 4),
        glow: range(0, 3),
        showDensity: range(0, 1),
        kernel: range(2, 20),
        iterations: range(5, 120, 1),
        attraction: range(0.05, 0.6),
        smoothing: range(0, 1),
    },
    render: (args: Args) => {
        const recipe = {
            kernel: args.kernel,
            iterations: args.iterations,
            attraction: args.attraction,
            smoothing: args.smoothing,
        };
        // KDEEB bundles in the plane, so this story always uses the 2D layout
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: 2,
            background: "#030408",
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                bundle: args.bundle,
                animate: args.animate,
                particles: args.particles,
                particleSpeed: args.particleSpeed,
                glow: args.glow,
                showDensity: args.showDensity,
                bundleKernel: args.kernel,
                boundsCenter: [0, 0],
                boundsHalf: 1,
            },
            nodeLayer: { fragment: NODE, blend: "alpha" },
            edgeLayer: { fragment: EDGE, vertexHooks: EDGE_HOOKS, segments: 40, blend: "add" },
            rebuildOn: [recipe],
            setup: (ctx) => {
                const g = ctx.graph;
                const { edges } = ctx;
                if (!edges) {
                    return undefined;
                }
                const bounds = graphBounds(g, 0.3);
                const bu = boundsUniforms(bounds);
                ctx.set("boundsCenter", bu.boundsCenter);
                ctx.set("boundsHalf", bu.boundsHalf);

                const straightData = new Float32Array(K * g.m * 4);
                const uvs = new Float32Array(K * g.m * 2);
                for (let e = 0; e < g.m; e++) {
                    const s = g.src[e] * 3;
                    const d = g.dst[e] * 3;
                    for (let k = 0; k < K; k++) {
                        const t = k / (K - 1);
                        const o = (e * K + k) * 4;
                        straightData[o] = g.pos[s] + (g.pos[d] - g.pos[s]) * t;
                        straightData[o + 1] = g.pos[s + 1] + (g.pos[d + 1] - g.pos[s + 1]) * t;
                        straightData[o + 2] = Math.hypot(g.pos[d] - g.pos[s], g.pos[d + 1] - g.pos[s + 1]);
                        straightData[o + 3] = 1;
                        uvs[(e * K + k) * 2] = (k + 0.5) / K;
                        uvs[(e * K + k) * 2 + 1] = (e + 0.5) / g.m;
                    }
                }
                const straight = floatTexture(ctx, straightData, K, g.m);
                const size = { width: K, height: g.m };
                const samplesA = makeTarget(ctx, "samples-a", { size, type: "float", nearest: true });
                const samplesB = makeTarget(ctx, "samples-b", { size, type: "float", nearest: true });
                const density = makeTarget(ctx, "density", { size: { width: FIELD, height: FIELD }, type: "half" });
                const densitySplat = splat(ctx, [density], {
                    name: "sample-splat",
                    count: K * g.m,
                    attributes: { sampleUV: [2, uvs] },
                    varyings: "varying vec2 vUV;\nvarying float vWeight;",
                    vertex: DENSITY_VERTEX,
                    fragment: DENSITY_FRAGMENT,
                    blend: "add",
                });
                densitySplat.material.setTexture("samples", straight);
                edges.material.setTexture("samples", straight);

                const renderer = effectRenderer(ctx);
                const copy = makePass(ctx, renderer, "copy", COPY, [], ["src"]);
                const advect = makePass(
                    ctx,
                    renderer,
                    "advect",
                    ADVECT,
                    ["kernel", "attraction", "boundsC", "boundsH"],
                    ["src", "straight", "density"],
                );
                const smooth = makePass(ctx, renderer, "smooth", SMOOTH, ["smoothing"], ["src"]);
                worldBackground(ctx, BACKGROUND, { density });

                let iteration = -1;
                const stop = everyFrame(ctx, () => {
                    if (iteration >= recipe.iterations || !copy.ready() || !advect.ready() || !smooth.ready()) {
                        return;
                    }
                    if (!densitySplat.material.isReady(densitySplat.mesh, true)) {
                        return;
                    }
                    if (iteration < 0) {
                        copy.run(samplesA, { src: straight });
                        densitySplat.material.setTexture("samples", samplesA);
                        edges.material.setTexture("samples", samplesA);
                        iteration = 0;
                    }
                    // a few iterations a frame, so the bundling plays out as an animation
                    for (let n = 0; n < 2 && iteration < recipe.iterations; n++, iteration++) {
                        const h = recipe.kernel * Math.pow(0.4, iteration / Math.max(1, recipe.iterations - 1));
                        densitySplat.material.setFloat("bundleKernel", h);
                        density.render();
                        const srcT: RenderTargetTexture = samplesA;
                        advect.run(samplesB, {
                            src: srcT,
                            straight,
                            density,
                            kernel: h,
                            attraction: recipe.attraction,
                            boundsC: bu.boundsCenter,
                            boundsH: bu.boundsHalf,
                        });
                        smooth.run(samplesA, { src: samplesB, smoothing: recipe.smoothing });
                    }
                    // the background shows the field at the final kernel
                    densitySplat.material.setFloat("bundleKernel", recipe.kernel * 0.4);
                    density.render();
                });
                return stop;
            },
        });
    },
};

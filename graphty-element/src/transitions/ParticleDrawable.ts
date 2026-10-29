/**
 * @file The particle drawing a transition with `drawable: "particles"` shows while it runs: each
 * node bursts into a cloud of particles that streams through curl noise around where the node is
 * drawn and gathers again as it lands (ported from the shader lab's particle morph).
 *
 * One mesh draws every particle: a quad, instanced, with the particle's random numbers, color and
 * node radius uploaded once, and each node's center and how far along its way it is once per
 * frame. The burst, the stream and the fade are in the vertex shader, driven by that travel, so a
 * cloud is widest as its node (which the runner shrinks meanwhile) is smallest.
 *
 * Bounded for small GPUs: at most 60,000 particles at high quality, 30,000 at medium and 15,000 at
 * low, fewer per node on a large graph, none when even one per node would pass the cap. The mesh,
 * its material and its buffers are disposed with the transition.
 */

import { Buffer, Constants, Mesh, type Scene, ShaderMaterial, ShaderStore, VertexData } from "@babylonjs/core";

import type { Vec3 } from "../camera/types";
import type { RenderQuality } from "../session/shaders";

/** The most particles drawn at each quality level. */
export const PARTICLE_CAPS: Readonly<Record<RenderQuality["level"], number>> = Object.freeze({
    low: 15_000,
    medium: 30_000,
    high: 60_000,
});

/** Particles per node when the transition does not say: the lab's dense burst. */
const DEFAULT_PER_NODE = 24;
/** The most particles per node. */
const MAX_PER_NODE = 32;

const NAME = "graphtyTransitionParticles";

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec4 pCenter;
attribute vec4 pInfo;
attribute vec4 pColor;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform float time;
uniform float curl;
uniform float flatView;
uniform float extent;
varying vec2 vQuad;
varying vec4 vColor;
varying float vAlpha;

vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
}
float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x),
            mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
        mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x),
            mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
        u.z);
}
vec3 potential(vec3 p) {
    return vec3(noise(p), noise(p + vec3(31.4, 17.2, 9.1)), noise(p + vec3(-12.7, 45.3, 23.9)));
}
vec3 curlNoise(vec3 p) {
    const float e = 0.12;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 x0 = potential(p - dx); vec3 x1 = potential(p + dx);
    vec3 y0 = potential(p - dy); vec3 y1 = potential(p + dy);
    vec3 z0 = potential(p - dz); vec3 z1 = potential(p + dz);
    return vec3((y1.z - y0.z) - (z1.y - z0.y), (z1.x - z0.x) - (x1.z - x0.z), (x1.y - x0.y) - (y1.x - y0.x)) / (2.0 * e);
}

void main() {
    // The node's own travel, 0..1; each particle a little apart from its neighbors.
    float u = clamp(pCenter.w + (pInfo.y - 0.5) * 0.12, 0.0, 1.0);
    float spread = sin(3.14159265 * u);
    vec3 base = pCenter.xyz;
    float r = max(pColor.w, 0.01);
    vec3 off = (hash33(pInfo.yzw * 97.0) - 0.5) * 2.0;
    // The stream is sized by the graph, not the node: across a layout 100 units wide a node of
    // radius 1 would otherwise stream a cloud too small to see.
    float span = max(extent, r * 8.0);
    vec3 flow = curlNoise(base * (1.6 / span) + vec3(0.0, 0.0, time * 0.15) + pInfo.y * 2.0);
    if (flatView > 0.5) {
        off.z = 0.0;
        flow.z = 0.0;
    }
    vec3 p = base + off * (r * (0.6 + spread * 4.0) + span * 0.03 * spread) + flow * curl * span * 0.25 * spread;
    vec4 at = view * world * vec4(p, 1.0);
    float size = max(r * 0.7, span * 0.015) * (0.35 + 0.65 * pInfo.w);
    gl_Position = projection * (at + vec4(position.xy * size, 0.0, 0.0));
    vQuad = position.xy;
    vColor = vec4(pColor.rgb, 1.0);
    vAlpha = smoothstep(0.0, 0.25, spread);
}
`;

const FRAGMENT = `
precision highp float;
varying vec2 vQuad;
varying vec4 vColor;
varying float vAlpha;

void main() {
    float r2 = dot(vQuad, vQuad);
    if (r2 > 1.0 || vAlpha <= 0.0) {
        discard;
    }
    // A bright core in a soft halo; drawn over the scene, so it shows on a light background too.
    float a = min(1.0, exp(-r2 * 3.0) * vAlpha * 1.2);
    vec3 c = mix(min(vColor.rgb * 1.2, vec3(1.0)), vec3(1.0), exp(-r2 * 16.0) * 0.6);
    gl_FragColor = vec4(c * a, a);
}
`;

/** What the drawing needs from a moving node. */
export interface ParticleNode {
    readonly drawnRadius: number;
    readonly paintedColor: { r: number; g: number; b: number; a: number } | null;
}

/** What the drawing needs from a node's move. */
export interface ParticleMover {
    readonly drawn: Vec3;
    /** How far along its own way the node is drawn, 0 where it left to 1 where it lands. */
    readonly travel: number;
}

/**
 * How many particles each node gets.
 * @param nodes - How many nodes move.
 * @param asked - Particles per node the transition asks for.
 * @param level - The quality level.
 * @returns Particles per node; 0 when even one each would pass the cap.
 */
export function particlesPerNode(nodes: number, asked: number | undefined, level: RenderQuality["level"]): number {
    const wanted = Math.min(MAX_PER_NODE, Math.max(1, Math.round(asked ?? DEFAULT_PER_NODE)));
    return Math.min(wanted, Math.floor(PARTICLE_CAPS[level] / Math.max(1, nodes)));
}

/**
 * A small seeded generator, so a node's cloud is the same on every run.
 * @param seed - The seed.
 * @returns Numbers in 0..1.
 */
function random(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The particle cloud of one running transition. */
export class ParticleDrawable {
    /** The mesh that draws every particle, or null when there are none. */
    readonly mesh: Mesh | null = null;
    private readonly material: ShaderMaterial | null = null;
    private readonly centers: Float32Array;
    private readonly centerBuffer: Buffer | null = null;
    private readonly staticBuffer: Buffer | null = null;
    private readonly per: number;

    /**
     * Build the cloud.
     * @param scene - The scene.
     * @param movers - Every moving node and its move.
     * @param options - What the transition asks for, and the quality.
     * @param options.particles - Particles per node.
     * @param options.curl - How strongly the particles stream, 0..3; default 1.
     * @param options.level - The quality level, which caps the count.
     * @param options.extent - How far the graph reaches from its middle, in scene units.
     */
    constructor(
        scene: Scene,
        movers: readonly (readonly [ParticleNode, ParticleMover])[],
        options: { particles?: number; curl?: number; level: RenderQuality["level"]; extent: number },
    ) {
        this.per = particlesPerNode(movers.length, options.particles, options.level);
        const count = movers.length * this.per;
        this.centers = new Float32Array(count * 4);
        if (count === 0) {
            return;
        }

        const info = new Float32Array(count * 8);
        movers.forEach(([node], i) => {
            const next = random(i + 1);
            const seed = next();
            const color = node.paintedColor ?? { r: 255, g: 255, b: 255, a: 1 };
            // Taken once: the runner shrinks the node while its cloud is out.
            const radius = Math.max(node.drawnRadius, 0.05);
            for (let k = 0; k < this.per; k++) {
                const at = (i * this.per + k) * 8;
                const tint = 0.85 + next() * 0.4;
                info.set([seed, next(), next(), next()], at);
                info.set(
                    [
                        Math.min(1, (color.r / 255) * tint),
                        Math.min(1, (color.g / 255) * tint),
                        Math.min(1, (color.b / 255) * tint),
                        radius,
                    ],
                    at + 4,
                );
            }
        });

        ShaderStore.ShadersStore[`${NAME}VertexShader`] = VERTEX;
        ShaderStore.ShadersStore[`${NAME}FragmentShader`] = FRAGMENT;
        const mesh = new Mesh(NAME, scene);
        const quad = new VertexData();
        quad.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
        quad.indices = [0, 1, 2, 0, 2, 3];
        quad.applyToMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        const graphRoot = scene.getTransformNodeByName("graph-root");
        if (graphRoot) {
            mesh.parent = graphRoot;
        }

        const material = new ShaderMaterial(
            NAME,
            scene,
            { vertex: NAME, fragment: NAME },
            {
                attributes: ["position", "pCenter", "pInfo", "pColor"],
                uniforms: ["world", "view", "projection", "time", "curl", "flatView", "extent"],
                needAlphaBlending: true,
            },
        );
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        material.alphaMode = Constants.ALPHA_PREMULTIPLIED;
        material.setFloat("curl", Math.min(3, Math.max(0, options.curl ?? 1)));
        material.setFloat("flatView", scene.activeCamera?.mode === 1 ? 1 : 0);
        material.setFloat("extent", options.extent);
        material.setFloat("time", 0);
        mesh.material = material;

        const engine = scene.getEngine();
        const centerBuffer = new Buffer(engine, this.centers, true, 4, false, true);
        mesh.setVerticesBuffer(centerBuffer.createVertexBuffer("pCenter", 0, 4, 4, true));
        const staticBuffer = new Buffer(engine, info, false, 8, false, true);
        mesh.setVerticesBuffer(staticBuffer.createVertexBuffer("pInfo", 0, 4, 8, true));
        mesh.setVerticesBuffer(staticBuffer.createVertexBuffer("pColor", 4, 4, 8, true));
        mesh.forcedInstanceCount = count;

        this.mesh = mesh;
        this.material = material;
        this.centerBuffer = centerBuffer;
        this.staticBuffer = staticBuffer;
        this.update(0, movers);
    }

    /**
     * How many particles are drawn.
     * @returns The count; 0 when the graph is too large for even one per node.
     */
    get count(): number {
        return this.centers.length / 4;
    }

    /**
     * Follow the nodes for one frame.
     * @param time - Seconds, for the stream's drift.
     * @param movers - Every moving node and its move, in the order the cloud was built with.
     */
    update(time: number, movers: Iterable<readonly [ParticleNode, ParticleMover]>): void {
        if (this.centerBuffer === null || this.material === null) {
            return;
        }

        let i = 0;
        for (const [, { drawn, travel }] of movers) {
            for (let k = 0; k < this.per; k++) {
                const at = (i * this.per + k) * 4;
                this.centers[at] = drawn.x;
                this.centers[at + 1] = drawn.y;
                this.centers[at + 2] = drawn.z;
                this.centers[at + 3] = travel;
            }

            i++;
        }

        this.centerBuffer.update(this.centers);
        this.material.setFloat("time", time);
    }

    /** Take the cloud out of the scene, with its material and buffers. */
    dispose(): void {
        this.mesh?.dispose(false, true);
        this.centerBuffer?.dispose();
        this.staticBuffer?.dispose();
    }
}

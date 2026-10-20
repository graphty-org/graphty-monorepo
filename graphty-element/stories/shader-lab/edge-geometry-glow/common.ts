/**
 * Helpers shared by the curved and displaced edge stories: a screen-facing perpendicular for
 * bending edges, a cheap one-pass bloom, and a graph laid flat on the ground plane so edges can
 * rise above it.
 */
import { type LabGraph, makeGraph } from "../harness";

/**
 * Vertex GLSL: a unit vector perpendicular to the edge a-b that lies in the screen plane, so an
 * offset along it always shows on screen (in 2D it is the in-plane normal).
 */
export const PERP_GLSL = `
vec3 screenPerp(vec3 a, vec3 b) {
    vec3 n = cross(b - a, cameraPosition - 0.5 * (a + b));
    float l = length(n);
    return l > 1e-5 ? n / l : vec3(0.0, 1.0, 0.0);
}
`;

/**
 * Post-process: a one-pass bloom. 16 taps on a golden-angle spiral pick up everything brighter
 * than bloomThreshold and add it back, spread over bloomRadius pixels. Needs the story uniforms
 * bloom, bloomThreshold and bloomRadius.
 */
export const BLOOM_POST = `
void main() {
    vec4 base = texture2D(textureSampler, vUV);
    if (bloom <= 0.0) { gl_FragColor = vec4(base.rgb, 1.0); return; }
    vec2 px = 1.0 / resolution;
    vec3 acc = vec3(0.0);
    const int TAPS = LAB_Q(6, 10, 16);
    for (int i = 0; i < TAPS; i++) {
        float fi = float(i) * 16.0 / float(TAPS);
        float r = sqrt((fi + 0.5) / 16.0) * bloomRadius * pixelRatio;
        vec2 o = vec2(cos(fi * 2.39996), sin(fi * 2.39996)) * r * px;
        vec3 s = texture2D(textureSampler, vUV + o).rgb;
        acc += max(s - bloomThreshold, 0.0) * (1.0 - fi / 20.0);
    }
    gl_FragColor = vec4(base.rgb + acc * (16.0 / float(TAPS)) / 9.0 * bloom, 1.0);
}
`;

/** The 2D layout of a sample graph laid on the ground (x, 0, y), for the orbit camera. */
export function groundGraph(kind: LabGraph["kind"], nodes: number, seed?: number): LabGraph {
    const g = makeGraph(kind, { nodes, dim: 2, seed });
    const pos = new Float32Array(g.n * 3);
    for (let i = 0; i < g.n; i++) {
        pos[i * 3] = g.pos[i * 3];
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = g.pos[i * 3 + 1];
    }
    return { ...g, pos };
}

/** World length of edge e. */
export function edgeLength(g: LabGraph, e: number): number {
    const s = g.src[e] * 3;
    const d = g.dst[e] * 3;
    return Math.hypot(g.pos[s] - g.pos[d], g.pos[s + 1] - g.pos[d + 1], g.pos[s + 2] - g.pos[d + 2]);
}

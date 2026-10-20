/**
 * Shared pieces of the "Sphere impostors and lit materials" batch: lighting and environment
 * GLSL, a soft edge shader, and a synthetic point-cloud graph for the 100k-node test.
 */
import { type LabGraph } from "../harness";

/**
 * Lighting helpers for node fragments. Everything is in view space (x right, y up, z away from
 * the camera) unless a name says world. `labStudio` is a procedural studio environment (sky
 * gradient, floor, two softboxes and a rim strip) for reflections and refractions; it takes a
 * WORLD direction so reflections move as the camera orbits.
 */
export const LIGHTING = `
vec3 labLight() { return normalize(vec3(-0.45, 0.6, -0.65)); }
// view-space direction to world space (the view matrix is a rotation plus a translation)
vec3 labToWorld(vec3 v) { return (vec4(v, 0.0) * view).xyz; }
// direction from the camera through this fragment's sphere point, view space
vec3 labEyeRay(vec3 n) { return normalize(vCenterView + n * vRadius); }
float labBox(vec3 d, vec3 s, vec2 size, float soft) {
    vec3 t = normalize(cross(s, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, s);
    float k = dot(d, s);
    if (k <= 0.0) return 0.0;
    vec2 p = vec2(dot(d, t), dot(d, b)) / k;
    vec2 q = abs(p) - size;
    return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
vec3 labStudio(vec3 d) {
    d = normalize(d);
    vec3 sky = mix(vec3(0.62, 0.68, 0.78), vec3(0.10, 0.13, 0.24), smoothstep(0.0, 0.85, d.y));
    vec3 floorC = mix(vec3(0.22, 0.20, 0.19), vec3(0.03, 0.03, 0.035), smoothstep(0.0, -0.5, d.y));
    vec3 c = mix(floorC, sky, smoothstep(-0.03, 0.03, d.y));
    c += vec3(5.0, 4.8, 4.5) * labBox(d, normalize(vec3(0.55, 0.65, -0.5)), vec2(0.35, 0.22), 0.04);
    c += vec3(2.2, 2.6, 3.4) * labBox(d, normalize(vec3(-0.7, 0.35, 0.6)), vec2(0.18, 0.5), 0.05);
    c += vec3(1.6) * labBox(d, normalize(vec3(0.0, 0.15, 1.0)), vec2(0.9, 0.04), 0.03);
    return c;
}
// filmic-ish tone curve for values that run past 1
vec3 labTone(vec3 c) { return 1.0 - exp(-c * 1.15); }
`;

/**
 * A thin, quiet edge: source-to-target gradient, brighter where it touches the hovered or
 * selected node. Needs the story uniform `edgeAlpha`.
 */
export const SOFT_EDGE = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.6 * lit), labEdgeCoverage() * mix(edgeAlpha, 1.0, lit));
}
`;

const clouds = new Map<number, LabGraph>();

/**
 * A galaxy-shaped point cloud with no edges: spiral arms are the communities, and degree, rank
 * and value are synthetic. For showing how many impostors one draw call can take.
 * @param n - node count
 * @returns the graph (cached by n)
 */
export function cloudGraph(n: number): LabGraph {
    const hit = clouds.get(n);
    if (hit) {
        return hit;
    }
    const arms = 6;
    const pos = new Float32Array(n * 3);
    const community = new Uint32Array(n);
    const degree = new Float32Array(n);
    const rank = new Float32Array(n);
    const value = new Float32Array(n);
    const random = new Float32Array(n);
    let s = 12345;
    const rnd = (): number => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
    const gauss = (): number => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    for (let i = 0; i < n; i++) {
        const arm = i % arms;
        const r = Math.pow(rnd(), 0.6) * 60 + 2;
        const a = (arm / arms) * Math.PI * 2 + r * 0.06 + gauss() * 0.18;
        const spread = 0.8 + r * 0.035;
        pos[i * 3] = Math.cos(a) * r + gauss() * spread;
        pos[i * 3 + 1] = gauss() * (5 * Math.exp(-r / 20) + 0.8);
        pos[i * 3 + 2] = Math.sin(a) * r + gauss() * spread;
        community[i] = arm;
        random[i] = rnd();
        degree[i] = Math.pow(rnd(), 6);
        rank[i] = Math.pow(rnd(), 8);
        value[i] = 0.5 + 0.5 * Math.sin(r * 0.15 + a * 2);
    }
    const graph: LabGraph = {
        kind: "large",
        n,
        m: 0,
        dim: 3,
        directed: false,
        pos,
        nodeRadius: 0.32,
        src: new Uint32Array(0),
        dst: new Uint32Array(0),
        community,
        communityCount: arms,
        degree,
        rank,
        value,
        random,
        weight: new Float32Array(0),
        neighbors: Array.from({ length: n }, () => []),
    };
    clouds.set(n, graph);
    return graph;
}

/**
 * @file Where a pulled edge meets a shape that no closed form reaches, two ways, at 100,000 nodes and
 * 1,000,000 edges (design/rendering/row-renderer.md stage 20): the CPU path, `RowScan.rowRayHitOn` per
 * end as `Edge.interceptPointsFromRows` casts it, and a WebGL2 fragment pass, one texel per edge
 * holding both ends' reach, each a ray from the node's center toward the other node against the
 * shared shape's triangles, keeping the farthest crossing that lies between the two nodes.
 *
 * The CPU path is timed on the first CPU_EDGES edges and scaled to the million; the GPU pass is timed
 * whole, with and without reading the million results back. The two answers are compared on every
 * edge the CPU timed. Numbers go to the console. It runs only with GRAPHTY_BROWSER_GPU set: on the
 * software renderer a million-texel loop over thousands of triangles measures nothing useful.
 */

import { type Mesh, NullEngine, Ray, Scene, Vector3, VertexBuffer } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { NodeMesh } from "../../src/meshes/NodeMesh";
import { RowScan } from "../../src/render/PickService";

const GPU_LANE = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";
const ROWS = 100_000;
const EDGES = 1_000_000;
const CPU_EDGES = 50_000;
const SIDE = 4000;
const WIDTH = 2048;
const RUNS = 7;
const NO_HIT = -2;
const SHAPES = ["tetrahedron", "dodecahedron", "cone", "torus", "torus-knot"] as const;

/** A seeded random number in [0, 1). */
function seeded(): () => number {
    let seed = 7;
    return (): number => {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        return (seed >>> 0) / 4294967296;
    };
}

/** Rows on a 2D plane, the harness's lean scene, with one edge in a hundred between near neighbours. */
function scene(): { rowBounds: Float32Array; ends: Int32Array } {
    const random = seeded();
    const rowBounds = new Float32Array(ROWS * 4);
    for (let row = 0; row < ROWS; row++) {
        rowBounds.set([(random() - 0.5) * SIDE, (random() - 0.5) * SIDE, 0, 1.5], row * 4);
    }

    const ends = new Int32Array(EDGES * 2);
    for (let edge = 0; edge < EDGES; edge++) {
        const src = Math.floor(random() * ROWS);
        let dst = Math.floor(random() * ROWS);
        if (edge % 100 === 0) {
            // a close pair: place the target within a node's width of the source
            dst = (src + 1) % ROWS;
            const at = src * 4;
            rowBounds.set([rowBounds[at] + random() - 0.5, rowBounds[at + 1] + random() - 0.5, 0], dst * 4);
        }

        ends.set([src, dst === src ? (src + 1) % ROWS : dst], edge * 2);
    }

    return { rowBounds, ends };
}

/** The shape's triangles in its own space, nine floats each. */
function triangles(mesh: Mesh): Float32Array {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const indices = mesh.getIndices() ?? [];
    const out = new Float32Array(indices.length * 3);
    indices.forEach((vertex, i) => {
        out.set([positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]], i * 3);
    });
    return out;
}

/** The CPU path: two rays an edge, as `Edge.interceptPointsFromRows` casts them. */
function cpuReach(scan: RowScan, rowBounds: Float32Array, ends: Int32Array, edges: number): Float32Array {
    const out = new Float32Array(edges * 2);
    const ray = new Ray(Vector3.Zero(), Vector3.One());
    const centre = (row: number): Vector3 =>
        new Vector3(rowBounds[row * 4], rowBounds[row * 4 + 1], rowBounds[row * 4 + 2]);
    for (let edge = 0; edge < edges; edge++) {
        const src = centre(ends[edge * 2]);
        const dst = centre(ends[edge * 2 + 1]);
        const reach = (row: number, from: Vector3, to: Vector3): number => {
            ray.origin.copyFrom(from);
            to.subtractToRef(from, ray.direction);
            const hit = scan.rowRayHitOn(row, ray);
            return hit === null ? NO_HIT : Vector3.Distance(to, hit);
        };
        out[edge * 2] = reach(ends[edge * 2], dst, src);
        out[edge * 2 + 1] = reach(ends[edge * 2 + 1], src, dst);
    }

    return out;
}

const VERTEX = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }`;

/** One texel an edge: x the source end's reach, y the target's, each from its node's center. */
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D rows;
uniform highp isampler2D edges;
uniform highp sampler2D tris;
uniform int triCount;
out vec4 reach;

vec3 rowAt(int row) { return texelFetch(rows, ivec2(row % ${WIDTH}, row / ${WIDTH}), 0).xyz; }

// The farthest crossing from the center, toward the other node, no farther than it: the end a ray
// from the other node meets first. A crossing behind the center counts only when none lies ahead,
// as a ray from the other node would then meet it last of all.
float farthestBetween(vec3 dir, float span) {
    float ahead = -1.0;
    float behind = 1e30;
    for (int i = 0; i < triCount; i++) {
        vec3 a = texelFetch(tris, ivec2((i * 3) % ${WIDTH}, (i * 3) / ${WIDTH}), 0).xyz;
        vec3 e1 = texelFetch(tris, ivec2((i * 3 + 1) % ${WIDTH}, (i * 3 + 1) / ${WIDTH}), 0).xyz;
        vec3 e2 = texelFetch(tris, ivec2((i * 3 + 2) % ${WIDTH}, (i * 3 + 2) / ${WIDTH}), 0).xyz;
        vec3 p = cross(dir, e2);
        float det = dot(e1, p);
        if (det == 0.0) continue;
        float inv = 1.0 / det;
        vec3 t = -a;
        float u = dot(t, p) * inv;
        if (u < 0.0 || u > 1.0) continue;
        vec3 q = cross(t, e1);
        float v = dot(dir, q) * inv;
        if (v < 0.0 || u + v > 1.0) continue;
        float r = dot(e2, q) * inv;
        if (r <= span) {
            if (r >= 0.0) ahead = max(ahead, r); else behind = min(behind, -r);
        }
    }
    return ahead >= 0.0 ? ahead : (behind < 1e30 ? behind : ${NO_HIT.toFixed(1)});
}

void main() {
    int edge = int(gl_FragCoord.y) * ${WIDTH} + int(gl_FragCoord.x);
    ivec2 pair = texelFetch(edges, ivec2(edge % ${WIDTH}, edge / ${WIDTH}), 0).xy;
    vec3 src = rowAt(pair.x);
    vec3 dst = rowAt(pair.y);
    vec3 across = dst - src;
    float span = length(across);
    vec3 dir = across / span;
    reach = vec4(farthestBetween(dir, span), farthestBetween(-dir, span), 0.0, 1.0);
}`;

/** A float texture of `texels` texels, `WIDTH` wide. */
function floatTexture(gl: WebGL2RenderingContext, data: Float32Array, texels: number, size: 3 | 4): WebGLTexture {
    const height = Math.ceil(texels / WIDTH);
    const padded = new Float32Array(WIDTH * height * size);
    padded.set(data);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        size === 4 ? gl.RGBA32F : gl.RGB32F,
        WIDTH,
        height,
        0,
        size === 4 ? gl.RGBA : gl.RGB,
        gl.FLOAT,
        padded,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
}

/** The GPU pass, built once over textures that stand for the row and edge tables. */
function gpuPass(
    rowBounds: Float32Array,
    ends: Int32Array,
    tris: Float32Array,
): { run: (readAll: boolean) => Float32Array } {
    const gl = document.createElement("canvas").getContext("webgl2");
    assert.ok(gl, "WebGL2");
    assert.ok(gl.getExtension("EXT_color_buffer_float"), "float targets");
    const compile = (type: number, text: string): WebGLShader => {
        const shader = gl.createShader(type);
        assert.ok(shader);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        assert.ok(gl.getShaderParameter(shader, gl.COMPILE_STATUS), gl.getShaderInfoLog(shader) ?? "");
        return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    assert.ok(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program) ?? "");
    gl.useProgram(program);

    // the triangles as a corner and two edges each, which the loop reads as they are
    const triCount = tris.length / 9;
    const prepared = new Float32Array(tris.length);
    for (let i = 0; i < triCount; i++) {
        const at = i * 9;
        for (let k = 0; k < 3; k++) {
            prepared[at + k] = tris[at + k];
            prepared[at + 3 + k] = tris[at + 3 + k] - tris[at + k];
            prepared[at + 6 + k] = tris[at + 6 + k] - tris[at + k];
        }
    }

    const units: [string, WebGLTexture][] = [
        ["rows", floatTexture(gl, rowBounds, ROWS, 4)],
        ["tris", floatTexture(gl, prepared, triCount * 3, 3)],
    ];
    const height = Math.ceil(EDGES / WIDTH);
    const edgeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, edgeTexture);
    const pairs = new Int32Array(WIDTH * height * 2);
    pairs.set(ends);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32I, WIDTH, height, 0, gl.RG_INTEGER, gl.INT, pairs);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    units.push(["edges", edgeTexture]);
    units.forEach(([name, texture], unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
    gl.uniform1i(gl.getUniformLocation(program, "triCount"), triCount);

    const target = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + units.length);
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, WIDTH, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    gl.viewport(0, 0, WIDTH, height);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const corner = gl.getAttribLocation(program, "corner");
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

    const all = new Float32Array(WIDTH * height * 4);
    const one = new Float32Array(4);
    return {
        run: (readAll: boolean): Float32Array => {
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            // a read waits for the pass, so the time is the pass's
            if (readAll) {
                gl.readPixels(0, 0, WIDTH, height, gl.RGBA, gl.FLOAT, all);
            } else {
                gl.readPixels(0, height - 1, 1, 1, gl.RGBA, gl.FLOAT, one);
            }

            assert.strictEqual(gl.getError(), gl.NO_ERROR);
            return all;
        },
    };
}

/**
 * The shader's answer in float64 on the CPU, from the node's center: the exact reach both paths are
 * held to, so a difference between them can be put on the one that is off.
 */
function exactReach(tris: Float32Array, centre: number[], other: number[]): number {
    const across = [other[0] - centre[0], other[1] - centre[1], other[2] - centre[2]];
    const span = Math.hypot(across[0], across[1], across[2]);
    const d = across.map((value) => value / span);
    let ahead = -1;
    let behind = Infinity;
    for (let at = 0; at < tris.length; at += 9) {
        const a = [tris[at], tris[at + 1], tris[at + 2]];
        const e1 = [tris[at + 3] - a[0], tris[at + 4] - a[1], tris[at + 5] - a[2]];
        const e2 = [tris[at + 6] - a[0], tris[at + 7] - a[1], tris[at + 8] - a[2]];
        const cross = (u: number[], v: number[]): number[] => [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
        ];
        const dot = (u: number[], v: number[]): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
        const p = cross(d, e2);
        const det = dot(e1, p);
        if (det === 0) {
            continue;
        }

        const t = [-a[0], -a[1], -a[2]];
        const u = dot(t, p) / det;
        const q = cross(t, e1);
        const v = dot(d, q) / det;
        if (u < 0 || u > 1 || v < 0 || u + v > 1) {
            continue;
        }

        const r = dot(e2, q) / det;
        if (r <= span) {
            if (r >= 0) {
                ahead = Math.max(ahead, r);
            } else {
                behind = Math.min(behind, -r);
            }
        }
    }

    if (ahead >= 0) {
        return ahead;
    }

    return behind < Infinity ? behind : NO_HIT;
}

/** The worst difference from the exact reach, and how many ends hit where it misses or the reverse. */
function against(exact: number[], answer: (i: number) => number): { worst: number; flips: number } {
    let worst = 0;
    let flips = 0;
    exact.forEach((reach, i) => {
        const other = answer(i);
        if ((reach === NO_HIT) !== (other === NO_HIT)) {
            flips++;
        } else if (reach !== NO_HIT) {
            worst = Math.max(worst, Math.abs(reach - other));
        }
    });
    return { worst, flips };
}

/** The median of some times, in ms. */
function median(times: number[]): number {
    return [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)] ?? 0;
}

describe.skipIf(!GPU_LANE)("trimmed ends at a million edges, CPU rays against a GPU pass", () => {
    const { rowBounds, ends } = scene();
    for (const shape of SHAPES) {
        it(shape, () => {
            const engine = new NullEngine();
            const babylon = new Scene(engine);
            const source = NodeMesh.createMeshWithoutCache(
                { styleId: shape, is2D: false, size: 1 },
                { shape: { type: shape } },
                babylon,
            );
            source.isVisible = false;
            const node = {
                index: 0,
                drawnPickMesh: source,
                drawnAnchor: source,
                drawnSourceMesh: source,
                drawnScaling: Vector3.One(),
                drawnByRowScan: true,
            };
            const scan = new RowScan(babylon, { rows: ROWS, rowBounds }, () => node, null);

            const cpuStart = performance.now();
            const cpu = cpuReach(scan, rowBounds, ends, CPU_EDGES);
            const cpuMs = ((performance.now() - cpuStart) * EDGES) / CPU_EDGES;

            const tris = triangles(source);
            const pass = gpuPass(rowBounds, ends, tris);
            pass.run(false); // compile and warm
            const passTimes: number[] = [];
            const readTimes: number[] = [];
            let gpu: Float32Array = new Float32Array(0);
            for (let i = 0; i < RUNS; i++) {
                let start = performance.now();
                pass.run(false);
                passTimes.push(performance.now() - start);
                start = performance.now();
                gpu = pass.run(true);
                readTimes.push(performance.now() - start);
            }

            const centre = (row: number): number[] => [...rowBounds.subarray(row * 4, row * 4 + 3)];
            const exact: number[] = [];
            for (let edge = 0; edge < CPU_EDGES; edge++) {
                const src = centre(ends[edge * 2]);
                const dst = centre(ends[edge * 2 + 1]);
                exact.push(exactReach(tris, src, dst), exactReach(tris, dst, src));
            }
            const cpuOff = against(exact, (i) => cpu[i]);
            const gpuOff = against(exact, (i) => gpu[Math.floor(i / 2) * 4 + (i % 2)]);

            babylon.dispose();
            engine.dispose();
            console.log(
                `edge trim, ${shape} (${String(tris.length / 9)} triangles): CPU ${cpuMs.toFixed(0)} ms at 1M edges ` +
                    `(${String(CPU_EDGES)} timed), GPU pass ${median(passTimes).toFixed(1)} ms, with readback ` +
                    `${median(readTimes).toFixed(1)} ms; against float64 over ${String(CPU_EDGES * 2)} ends: CPU worst ` +
                    `${cpuOff.worst.toExponential(2)}, ${String(cpuOff.flips)} hit/miss flips; GPU worst ` +
                    `${gpuOff.worst.toExponential(2)}, ${String(gpuOff.flips)} flips`,
            );
            assert.isAbove(cpu.filter((reach) => reach !== NO_HIT).length, 0);
        });
    }
});

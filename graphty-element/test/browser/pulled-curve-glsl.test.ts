/**
 * @file `PULLED_CURVE_GLSL` puts a curve's path points where its mirror, `curvePathPoint`, puts them
 * (design/rendering/row-renderer.md, stage 21): every point of 200 cut curves, lone, fanned, center and raised arcs, read back through
 * transform feedback on WebGL2, within 1e-4 of the mirror, edges moved to the origin as the trim test
 * moves them, since a float's spacing grows with the coordinate.
 */

import { assert, describe, it } from "vitest";

import type { Xyz } from "../../src/meshes/edgeRoute";
import { curvePathPoint, curveShape, type CurveSpan, curveSpan, PULLED_CURVE_GLSL } from "../../src/meshes/pulledCurve";

const VERTEX = `#version 300 es
precision highp float;
in vec4 srcAndEnd;
in vec3 dst;
in vec4 span;
in vec4 cutAndPoint;
out vec3 outPoint;
${PULLED_CURVE_GLSL}
void main() {
    vec4 cut = vec4(cutAndPoint.xy, span.w, cutAndPoint.z);
    outPoint = pulledCurvePoint(srcAndEnd.xyz, dst, vec4(span.xyz, srcAndEnd.w), cut, int(cutAndPoint.w + 0.5));
    gl_Position = vec4(0.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 color;
void main() { color = vec4(0.0); }
`;

/** One point to work out: an edge, its span and which point. */
interface Ask {
    src: Xyz;
    dst: Xyz;
    span: CurveSpan;
    j: number;
}

/**
 * Run the GLSL on every ask and read the points back.
 * @param asks - The points.
 * @returns The shader's points, flat x, y, z.
 */
function shaderPoints(asks: Ask[]): Float32Array {
    const gl = document.createElement("canvas").getContext("webgl2");
    assert.isNotNull(gl, "the test browser has WebGL2");
    const stage = (type: number, text: string): WebGLShader => {
        const shader = gl.createShader(type);
        assert.isNotNull(shader);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        assert.isTrue(gl.getShaderParameter(shader, gl.COMPILE_STATUS), gl.getShaderInfoLog(shader) ?? "");
        return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, stage(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, stage(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.transformFeedbackVaryings(program, ["outPoint"], gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(program);
    assert.isTrue(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program) ?? "");
    gl.useProgram(program);

    const floats = asks.flatMap(({ src, dst, span, j }) => [
        ...[src.x, src.y, src.z, curveShape(span)[2]],
        ...[dst.x, dst.y, dst.z, 0],
        ...[span.samples, span.first, span.pieces, curveShape(span)[0]],
        ...[span.startAt, span.endAt, curveShape(span)[1], j],
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floats), gl.STATIC_DRAW);
    ["srcAndEnd", "dst", "span", "cutAndPoint"].forEach((name, i) => {
        const location = gl.getAttribLocation(program, name);
        assert.isAtLeast(location, 0, `${name} is read`);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, name === "dst" ? 3 : 4, gl.FLOAT, false, 64, i * 16);
    });

    const captured = gl.createBuffer();
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, captured);
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, asks.length * 12, gl.STATIC_READ);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, captured);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, asks.length);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    const out = new Float32Array(asks.length * 3);
    gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, out);
    return out;
}

/**
 * Every point of 200 cut curves between spheres, the source at the origin: lone curves, fanned arcs, center arcs,
 * raised arcs, and lone curves stopped short of their nodes by a gap, often wide enough that the curve is drawn uncut.
 */
function asks(): Ask[] {
    let s = 3251;
    const random = (): number => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
    const out: Ask[] = [];
    while (out.length === 0 || new Set(out.map((a) => a.dst)).size < 200) {
        const src = { x: 0, y: 0, z: 0 };
        const scale = [2, 10, 40][out.length % 3];
        const dst =
            random() < 0.05
                ? { x: 0, y: 0, z: scale }
                : { x: (random() - 0.5) * scale, y: (random() - 0.5) * scale, z: (random() - 0.5) * scale };
        const radius = (c: Xyz, r: number) => (x: number, y: number, z: number) => {
            const d = Math.hypot(x - c.x, y - c.y, z - c.z);
            return d > 0 && d > r;
        };
        // a lone curve, a fanned arc, a center arc (`line.arcRadius`), a gapped lone curve and a raised arc
        // (`line.route` "arc"), and a gapped straight line raised in an arc, flat at times, in turn
        const kind = Math.floor(random() * 6);
        const bow = kind === 1 ? (random() - 0.5) * 2 * scale : null;
        // a half circle (radius 0.5) among them, whose way round is a float's noise
        const arc = kind === 2 ? Math.max(0.5, random() * 3.5 - 0.5) : null;
        const [rSrc, rDst] = [random() * scale * 0.3, random() * scale * 0.3];
        let height: number | null = null;
        if (kind === 4) {
            height = random() * 1.5;
        } else if (kind === 5) {
            height = random() < 0.3 ? 0 : random() * 1.5;
        }
        const gapped = kind === 3 || kind === 5;
        const [gSrc, gDst] = gapped ? [random() * scale * 0.4, random() * scale * 0.4] : [0, 0];
        const length = Math.hypot(dst.x, dst.y, dst.z);
        const bare = (from: Xyz, to: Xyz, reach: number): Xyz => {
            const t = Math.min(reach, length) / length;
            return {
                x: from.x + (to.x - from.x) * t,
                y: from.y + (to.y - from.y) * t,
                z: from.z + (to.z - from.z) * t,
            };
        };
        const span = curveSpan(
            src,
            dst,
            radius(src, rSrc + gSrc),
            radius(dst, rDst + gDst),
            { bow, radius: arc, height, straight: kind === 5 },
            gapped ? () => [bare(src, dst, rSrc + gSrc), bare(dst, src, rDst + gDst)] : null,
        );
        for (let j = 0; span !== null && j <= span.pieces; j++) {
            out.push({ src, dst, span, j });
        }
    }

    return out;
}

describe("the pulled curve's GLSL", () => {
    it("puts every path point within 1e-4 of its mirror", () => {
        const all = asks();
        assert.isAbove(
            all.filter((a) => a.span.ends !== null).length,
            0,
            "some gapped curves are drawn uncut between their bare ends",
        );
        assert.isAbove(
            all.filter((a) => a.span.samples === 1 && a.span.height === 0).length,
            0,
            "some raised straight lines are drawn straight between their bare ends",
        );
        const got = shaderPoints(all);
        let worst = 0;
        all.forEach(({ src, dst, span, j }, i) => {
            const p = curvePathPoint(src, dst, span, j);
            const off = Math.hypot(got[3 * i] - p.x, got[3 * i + 1] - p.y, got[3 * i + 2] - p.z);
            worst = Math.max(worst, off);
        });
        assert.isAtMost(worst, 1e-4, `the farthest point is ${String(worst)} off`);
    });
});

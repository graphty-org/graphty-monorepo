/**
 * @file A curve's path from two centers and its span (`meshes/pulledCurve.ts`) is the path the object
 * path draws (design/rendering/row-renderer.md, stage 21): `EdgeMesh.createBezierLine`'s samples, cut
 * where they leave each node as `Edge.placeRoute` cuts them (`routeOutside`, then `crossingOf`).
 */

import { Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { centerArc, crossingOf, fanArc, routeOutside, type Xyz } from "../src/meshes/edgeRoute";
import { bezierSamples, curvePathPoint, curveSpan } from "../src/meshes/pulledCurve";

/** A seeded generator, so a failure names a case that comes back. */
function seeded(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

/** Whether a point is outside a sphere, as `Edge.outside` asks of a round node with no gap. */
function outsideOf(c: Xyz, radius: number): (x: number, y: number, z: number) => boolean {
    return (x, y, z) => {
        const d = Math.hypot(x - c.x, y - c.y, z - c.z);
        return d > 0 && d > radius;
    };
}

/**
 * The object path's cut curve, as `Edge.placeRoute` lays it; the lone curve from center to center, uncut,
 * that `Edge.placeCurve` draws in its place when no point of the route is outside both nodes; or null when
 * a center is outside its own node, which the object path draws another way.
 */
function objectPath(
    src: Vector3,
    dst: Vector3,
    rSrc: number,
    rDst: number,
    route: readonly number[] = EdgeMesh.createBezierLine(src, dst),
): Xyz[] | null {
    const outSrc = outsideOf(src, rSrc);
    const outDst = outsideOf(dst, rDst);
    const span = routeOutside(route, outSrc, outDst);
    if (span === null) {
        const lone = EdgeMesh.createBezierLine(src, dst);
        return Array.from({ length: lone.length / 3 }, (_, i) => ({
            x: lone[3 * i],
            y: lone[3 * i + 1],
            z: lone[3 * i + 2],
        }));
    }

    if (span.first === 0 || span.last === route.length / 3 - 1) {
        return null;
    }

    const at = (i: number): Xyz => ({ x: route[3 * i], y: route[3 * i + 1], z: route[3 * i + 2] });
    const path = [crossingOf(at(span.first - 1), at(span.first), outSrc)];
    for (let i = span.first; i <= span.last; i++) {
        path.push(at(i));
    }

    path.push(crossingOf(at(span.last + 1), at(span.last), outDst));
    return path;
}

/** Edges of every length and direction, between spheres of every size, chords along z among them. */
function cases(): { src: Vector3; dst: Vector3; rSrc: number; rDst: number }[] {
    const random = seeded(3251);
    const out = [];
    for (let i = 0; i < 400; i++) {
        const src = new Vector3((random() - 0.5) * 200, (random() - 0.5) * 200, (random() - 0.5) * 200);
        const scale = [0.3, 2, 30, 150][i % 4];
        const along = i % 25 === 0;
        const dst = src.add(
            along
                ? new Vector3(0, 0, scale)
                : new Vector3((random() - 0.5) * scale, (random() - 0.5) * scale, (random() - 0.5) * scale),
        );
        out.push({ src, dst, rSrc: random() * scale * 0.4, rDst: random() * scale * 0.4 });
    }

    return out;
}

describe("a pulled curve's path", () => {
    it("samples the curve as createBezierLine does", () => {
        for (const { src, dst } of cases()) {
            const want = EdgeMesh.createBezierLine(src, dst);
            const got = bezierSamples(src, dst);
            assert.strictEqual(got.length, want.length);
            got.forEach((v, k) => {
                assert.approximately(v, want[k], 1e-9 * (1 + Math.abs(want[k])));
            });
        }
    });

    it("puts every point where the object path's cut curve has it", () => {
        let drawn = 0;
        let uncut = 0;
        for (const { src, dst, rSrc, rDst } of cases()) {
            const want = objectPath(src, dst, rSrc, rDst);
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst));
            assert.strictEqual(span === null, want === null, "a span exactly when the object path cuts a curve");
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            uncut += want[0].x === src.x && want[0].y === src.y && want[0].z === src.z ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 200, "most cases draw a cut curve");
        assert.isAbove(uncut, 0, "some curves clear neither node and are drawn uncut");
    });

    it("puts every point of a fanned arc where the object path's cut arc has it, drawn either way round", () => {
        const random = seeded(21);
        let drawn = 0;
        let uncut = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // a bow of 0 is the middle of an evenly spread bundle: the straight line through the midpoint
            const offset = i % 7 === 0 ? 0 : (random() - 0.5) * 4 * Vector3.Distance(src, dst);
            const forward = i % 2 === 0;
            const [left, right] = forward ? [src, dst] : [dst, src];
            const want = objectPath(src, dst, rSrc, rDst, fanArc(src, dst, left, right, offset));
            const bow = forward ? offset : -offset;
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst), bow);
            assert.strictEqual(span === null, want === null, "a span exactly when the object path cuts an arc");
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            uncut += want[0].x === src.x && want[0].y === src.y && want[0].z === src.z ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a cut arc");
        assert.isAbove(uncut, 0, "some arcs clear neither node and are drawn as the lone curve, uncut");
    });

    it("puts every point of a center arc where the object path's cut arc has it", () => {
        const random = seeded(4478);
        let drawn = 0;
        let uncut = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // `line.arcRadius` is at least 0.5, a half circle; a centerArc below it is clamped there
            const radius = i % 9 === 0 ? 0.5 : 0.5 + random() * 3;
            const want = objectPath(src, dst, rSrc, rDst, centerArc(src, dst, radius));
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst), null, radius);
            assert.strictEqual(span === null, want === null, "a span exactly when the object path cuts an arc");
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            uncut += want[0].x === src.x && want[0].y === src.y && want[0].z === src.z ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a cut arc");
        assert.isAbove(uncut, 0, "some arcs clear neither node and are drawn as the lone curve, uncut");
    });
});

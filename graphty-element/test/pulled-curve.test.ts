/**
 * @file A curve's path from two centers and its span (`meshes/pulledCurve.ts`) is the path the object
 * path draws (design/rendering/row-renderer.md, stage 21): `EdgeMesh.createBezierLine`'s samples, cut
 * where they leave each node as `Edge.placeRoute` cuts them (`routeOutside`, then `crossingOf`).
 */

import { Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { crossingOf, routeOutside, type Xyz } from "../src/meshes/edgeRoute";
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

/** The object path's cut curve, as `Edge.placeRoute` lays it, or null when it draws none that way. */
function objectPath(src: Vector3, dst: Vector3, rSrc: number, rDst: number): Xyz[] | null {
    const route = EdgeMesh.createBezierLine(src, dst);
    const outSrc = outsideOf(src, rSrc);
    const outDst = outsideOf(dst, rDst);
    const span = routeOutside(route, outSrc, outDst);
    if (span === null || span.first === 0 || span.last === route.length / 3 - 1) {
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
        for (const { src, dst, rSrc, rDst } of cases()) {
            const want = objectPath(src, dst, rSrc, rDst);
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst));
            assert.strictEqual(span === null, want === null, "a span exactly when the object path cuts a curve");
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 200, "most cases draw a cut curve");
    });
});

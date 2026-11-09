/**
 * @file A curve's path from two centers and its span (`meshes/pulledCurve.ts`) is the path the object
 * path draws (design/rendering/row-renderer.md, stage 21): `EdgeMesh.createBezierLine`'s samples, cut
 * where they leave each node as `Edge.placeRoute` cuts them (`routeOutside`, then `crossingOf`).
 */

import { Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { EdgeMesh } from "../src/meshes/EdgeMesh";
import {
    bezierThroughControls,
    centerArc,
    crossingOf,
    fanArc,
    greatCircleArc,
    loopTeardrop,
    raisedArc,
    routeOutside,
    type Xyz,
} from "../src/meshes/edgeRoute";
import { bezierSamples, curvePathPoint, curveSpan, loopShape, viaShare } from "../src/meshes/pulledCurve";

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
 * Where a line with no cap starts at a node, as `Edge.bareEnd` has it: the center, or with a gap, where it
 * leaves the node and the gap along the chord (`Edge.leaveNode`), never past the other center.
 */
function bareEnd(centre: Vector3, toward: Vector3, radius: number, gap: number): Vector3 {
    const span = Vector3.Distance(centre, toward);
    return gap > 0 && span > 0
        ? centre.add(toward.subtract(centre).scale(Math.min(radius + gap, span) / span))
        : centre.clone();
}

/**
 * The object path's cut curve, as `Edge.placeRoute` lays it; the lone curve between the line's bare ends
 * (the centers, without a gap), uncut, that `Edge.placeCurve` draws in its place when no point of the route
 * is outside both nodes (for a straight line, `straight`, the straight line between them that
 * `Edge.transformEdgeMesh` draws); or null when a center is outside its own node, or the bare ends meet and
 * `createBezierLine` draws a self-loop there, which the object path draws another way.
 */
function objectPath(
    src: Vector3,
    dst: Vector3,
    rSrc: number,
    rDst: number,
    route: readonly number[] = EdgeMesh.createBezierLine(src, dst),
    gSrc = 0,
    gDst = 0,
    straight = false,
): Xyz[] | null {
    const outSrc = outsideOf(src, rSrc + gSrc);
    const outDst = outsideOf(dst, rDst + gDst);
    const span = routeOutside(route, outSrc, outDst);
    if (span === null) {
        const from = bareEnd(src, dst, rSrc, gSrc);
        const to = bareEnd(dst, src, rDst, gDst);
        if (from.equalsWithEpsilon(to, 0.01)) {
            return null;
        }

        if (straight) {
            return [from, to];
        }

        const lone = EdgeMesh.createBezierLine(from, to);
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
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst), { bow });
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
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst), { radius });
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

    it("puts every point of a raised arc where the object path's cut arc has it", () => {
        const random = seeded(6355);
        let drawn = 0;
        let uncut = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // `line.arcHeight`: 0 draws the route flat, two points no sample of which clears both nodes
            const height = i % 11 === 0 ? 0 : random() * 1.5;
            const want = objectPath(src, dst, rSrc, rDst, raisedArc(src, dst, height));
            const span = curveSpan(src, dst, outsideOf(src, rSrc), outsideOf(dst, rDst), { height });
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

    it("puts every point of a straight line raised in an arc where the object path has it, gaps and all", () => {
        const random = seeded(6359);
        let drawn = 0;
        let straight = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // a flat route, and gaps wide enough that no sample clears both nodes, draw the straight line between
            // the bare ends (`Edge.transformEdgeMesh`), not the lone curve a curve draws there
            const height = i % 11 === 0 ? 0 : random() * 1.5;
            const length = Vector3.Distance(src, dst);
            const gSrc = i % 3 === 0 ? random() * length * 0.6 : 0;
            const gDst = i % 3 === 0 ? random() * length * 0.6 : 0;
            const want = objectPath(src, dst, rSrc, rDst, raisedArc(src, dst, height), gSrc, gDst, true);
            const span = curveSpan(
                src,
                dst,
                outsideOf(src, rSrc + gSrc),
                outsideOf(dst, rDst + gDst),
                { height, straight: true },
                () => [bareEnd(src, dst, rSrc, gSrc), bareEnd(dst, src, rDst, gDst)],
            );
            assert.strictEqual(
                span === null,
                want === null,
                `case ${String(i)}: a span exactly when the object path has one`,
            );
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            straight += want.length === 2 ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a line");
        assert.isAbove(straight, 20, "many clear neither node and are drawn straight between the bare ends");
    });

    it("puts every point of a great-circle arc where the object path has it, curve or straight, gaps and all", () => {
        const random = seeded(6371);
        let drawn = 0;
        let flat = 0;
        for (const [i, { src, dst: far, rSrc, rDst }] of cases().entries()) {
            // ends in one direction from the globe's center, or in opposite ones, are drawn as the straight line
            let dst = far;
            if (i % 13 === 0) {
                dst = src.scale(i % 26 === 0 ? 1.5 : -0.7);
            }

            const height = i % 11 === 0 ? 0 : random() * 1.5;
            const straight = i % 2 === 0;
            const length = Vector3.Distance(src, dst);
            const gSrc = i % 3 === 0 ? random() * length * 0.6 : 0;
            const gDst = i % 3 === 0 ? random() * length * 0.6 : 0;
            const route = greatCircleArc(src, dst, height);
            const want = objectPath(src, dst, rSrc, rDst, route, gSrc, gDst, straight);
            const span = curveSpan(
                src,
                dst,
                outsideOf(src, rSrc + gSrc),
                outsideOf(dst, rDst + gDst),
                { height, globe: true, straight },
                () => [bareEnd(src, dst, rSrc, gSrc), bareEnd(dst, src, rDst, gDst)],
            );
            assert.strictEqual(
                span === null,
                want === null,
                `case ${String(i)}: a span exactly when the object path has one`,
            );
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            flat += route.length === 6 && height > 0 ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1, `case ${String(i)}`);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a line");
        assert.isAbove(flat, 0, "some ends share a direction from the center and are drawn straight");
    });

    it("puts every point of a curve stopped short of its nodes by a gap where the object path has it", () => {
        const random = seeded(6353);
        let drawn = 0;
        let uncut = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // a gap at one end, the other or both, often wide enough that no point clears both gapped nodes
            const length = Vector3.Distance(src, dst);
            const gSrc = i % 3 === 1 ? 0 : random() * length * 0.6;
            const gDst = i % 3 === 2 ? 0 : random() * length * 0.6;
            const kind = i % 3;
            const offset = (random() - 0.5) * 2 * length;
            const radius = 0.5 + random() * 3;
            let route = EdgeMesh.createBezierLine(src, dst);
            if (kind === 1) {
                route = fanArc(src, dst, src, dst, offset);
            } else if (kind === 2) {
                route = centerArc(src, dst, radius);
            }

            const want = objectPath(src, dst, rSrc, rDst, route, gSrc, gDst);
            const span = curveSpan(
                src,
                dst,
                outsideOf(src, rSrc + gSrc),
                outsideOf(dst, rDst + gDst),
                { bow: kind === 1 ? offset : null, radius: kind === 2 ? radius : null },
                () => [bareEnd(src, dst, rSrc, gSrc), bareEnd(dst, src, rDst, gDst)],
            );
            assert.strictEqual(
                span === null,
                want === null,
                `case ${String(i)}: a span exactly when the object path has one`,
            );
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            uncut += span.ends === null ? 0 : 1;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a curve");
        assert.isAbove(uncut, 20, "many clear neither gapped node and are drawn uncut between the bare ends");
    });

    it("puts every point of a self-loop's teardrop where the object path has it, round nodes and stretched ones", () => {
        const random = seeded(6364);
        let drawn = 0;
        for (const [i, { src }] of cases().entries()) {
            // a round node, or one stretched along each axis, which reaches farther one way than another
            const radius = [0.05, 0.5, 3, 20][i % 4] * (0.5 + random());
            const stretch = i % 2 === 0 ? { x: 1, y: 1, z: 1 } : { x: 0.5 + random() * 2, y: 0.5 + random() * 2, z: 1 };
            const reachAt = (dir: Xyz): number =>
                radius / Math.hypot(dir.x / stretch.x, dir.y / stretch.y, dir.z / stretch.z);
            const outside = (x: number, y: number, z: number): boolean => {
                const d = Math.hypot(x - src.x, y - src.y, z - src.z);
                return d > 0 && d > reachAt({ x: (x - src.x) / d, y: (y - src.y) / d, z: (z - src.z) / d });
            };
            const count = 1 + (i % 7);
            const rank = Math.floor(random() * count);
            const route = loopTeardrop(src, rank, count, reachAt);
            const cut = routeOutside(route, outside, outside);
            assert.isNotNull(cut, `case ${String(i)}: the teardrop clears its node`);
            if (cut === null) {
                continue;
            }

            const at = (k: number): Xyz => ({ x: route[3 * k], y: route[3 * k + 1], z: route[3 * k + 2] });
            const want = [crossingOf(at(cut.first - 1), at(cut.first), outside)];
            for (let k = cut.first; k <= cut.last; k++) {
                want.push(at(k));
            }

            want.push(crossingOf(at(cut.last + 1), at(cut.last), outside));
            const span = curveSpan(src, src, outside, outside, { loop: loopShape(rank, count, reachAt) });
            assert.isNotNull(span, `case ${String(i)}: a span`);
            if (span === null) {
                continue;
            }

            drawn++;
            assert.strictEqual(span.pieces, want.length - 1);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, src, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.strictEqual(drawn, 400);
    });
    it("puts every point of a curve through a support point where the object path has it, gaps and all", () => {
        const random = seeded(6372);
        let drawn = 0;
        let uncut = 0;
        for (const [i, { src, dst, rSrc, rDst }] of cases().entries()) {
            // a support point (`line.supportModel`) is placed in x-y; its z is its share along the chord's, and an
            // edge of no length in x-y keeps it at its middle (`supportPoints`' `toRel`)
            const dx = dst.x - src.x;
            const dy = dst.y - src.y;
            const flat = dx === 0 && dy === 0;
            const along = flat ? 0.5 : (random() - 0.25) * 1.5;
            const across = flat ? 0 : (random() - 0.5) * 2;
            const via = {
                x: src.x + along * dx - across * dy,
                y: src.y + along * dy + across * dx,
                z: src.z + (dst.z - src.z) * along,
            };
            const length = Vector3.Distance(src, dst);
            const gSrc = i % 3 === 0 ? random() * length * 0.6 : 0;
            const gDst = i % 3 === 0 ? random() * length * 0.6 : 0;
            const route = bezierThroughControls([src.x, src.y, src.z, via.x, via.y, via.z, dst.x, dst.y, dst.z]);
            const want = objectPath(src, dst, rSrc, rDst, route, gSrc, gDst);
            const span = curveSpan(
                src,
                dst,
                outsideOf(src, rSrc + gSrc),
                outsideOf(dst, rDst + gDst),
                { via: viaShare(src, dst, via) },
                () => [bareEnd(src, dst, rSrc, gSrc), bareEnd(dst, src, rDst, gDst)],
            );
            assert.strictEqual(
                span === null,
                want === null,
                `case ${String(i)}: a span exactly when the object path has one`,
            );
            if (span === null || want === null) {
                continue;
            }

            drawn++;
            uncut += span.via === null ? 1 : 0;
            assert.strictEqual(span.pieces, want.length - 1, `case ${String(i)}`);
            want.forEach((p, j) => {
                const q = curvePathPoint(src, dst, span, j);
                const off = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
                assert.isAtMost(off, 1e-9 * (1 + Math.hypot(p.x, p.y, p.z)), `case ${String(i)} point ${String(j)}`);
            });
        }

        assert.isAtLeast(drawn, 150, "most cases draw a line");
        assert.isAbove(uncut, 0, "some clear neither node and are drawn as the lone curve, uncut");
    });
});

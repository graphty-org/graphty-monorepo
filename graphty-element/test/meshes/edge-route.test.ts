/**
 * @file The geometry of an edge drawn through bends: reading `line.bends`, placing the bends
 * between the node centers (so they scale and turn with the nodes), rounding corners, and where a
 * segment leaves a node.
 */
import { assert, describe, it } from "vitest";

import {
    arcThroughBend,
    bendPoints,
    bezierThroughControls,
    centerArc,
    clearOfCaps,
    crossingOf,
    curveThroughMidpoints,
    cutFromEnd,
    fanArc,
    fanArcPieces,
    fanOffset,
    fanSlot,
    fileRoute,
    interiorOutside,
    liftRoute,
    parseBends,
    parsePort,
    pointFromEnd,
    roundCorners,
    routeEnds,
    routeOutside,
    surfaceReach,
} from "../../src/meshes/edgeRoute";

const at = (x: number, y: number, z = 0): { x: number; y: number; z: number } => ({ x, y, z });

describe("edge route geometry", () => {
    it("keeps a route whose middle alone clears both nodes, and none that never leaves them", () => {
        // a shallow two-piece arc between nodes of radius 1: only the middle point is outside both
        const arc = [0, 0, 0, 2.5, 0.1, 0, 5, 0, 0];
        const outside = (cx: number) => (x: number, y: number) => Math.hypot(x - cx, y) > 1;
        assert.deepEqual(routeOutside(arc, outside(0), outside(5)), { first: 1, last: 1 });
        // a straight route: the only point clear of the source is the target's center
        assert.isNull(routeOutside([0, 0, 0, 0.5, 0, 0, 5, 0, 0], outside(0), outside(5)));
    });

    it("spaces a bundle two radii apart, narrowed between close nodes, unless the style sets the spacing", () => {
        assert.strictEqual(fanOffset(1, 3, 0.5, 10), 1);
        // three gaps' worth of spread may not exceed 1.2 times the distance between the nodes
        assert.closeTo(fanOffset(1, 4, 0.5, 1), 0.4, 1e-12);
        // a set spacing is drawn as it is, however close or large the nodes
        assert.strictEqual(fanOffset(1, 3, 0.5, 10, 0.25), 0.25);
        assert.strictEqual(fanOffset(-2, 4, 0.5, 1, 3), -6);
        assert.strictEqual(fanOffset(1, 3, 0.5, 10, 0), 0);
        // a lone edge never bows
        assert.strictEqual(fanOffset(1, 1, 0.5, 10, 2), 0);
    });

    it("reads along,across pairs, and nothing from a value that is not one", () => {
        assert.deepEqual(parseBends("0,-0.5  1,-0.5"), [0, -0.5, 1, -0.5]);
        assert.deepEqual(parseBends(" 0.25,1e-3 "), [0.25, 0.001]);
        assert.isNull(parseBends(undefined));
        assert.isNull(parseBends(""));
        assert.isNull(parseBends("0.5"));
        assert.isNull(parseBends("0.5,x"));
        assert.isNull(parseBends("0.5,1,2"));
        assert.isNull(parseBends("0.5,"));
    });

    it("places bends along and left of the line between the centers, scaling and turning with it", () => {
        const route = [0, -0.5, 1, -0.5];
        assert.deepEqual(bendPoints(at(0, 0), at(8, 0), route), [0, -4, 0, 8, -4, 0]);
        // twice as far apart: twice as far below
        assert.deepEqual(bendPoints(at(0, 0), at(16, 0), route), [0, -8, 0, 16, -8, 0]);
        // the line turned to point up: "right of it" is now +x, and the corners stay right angles
        const turned = bendPoints(at(0, 0), at(0, 8), route);
        assert.deepEqual(
            turned.map((v) => Math.round(v * 1e9) / 1e9),
            [4, 0, 0, 4, 8, 0],
        );
    });

    it("rounds each interior corner and keeps the ends", () => {
        const flat = [0, 0, 0, 0, -4, 0, 8, -4, 0, 8, 0, 0];
        const out = roundCorners(flat);
        // two corners of six points each, plus the two ends
        assert.lengthOf(out, (2 + 2 * 6) * 3);
        assert.deepEqual(out.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(out.slice(-3), [8, 0, 0]);
        // no point is the sharp corner itself
        for (let i = 0; i < out.length; i += 3) {
            assert.isAbove(Math.hypot(out[i], out[i + 1] + 4), 1e-9);
        }
        // a polyline with no interior point is unchanged
        assert.deepEqual(roundCorners([0, 0, 0, 1, 1, 1]), [0, 0, 0, 1, 1, 1]);
    });

    it("lifts a route into an arc over its middle, keeping its ends", () => {
        const out = liftRoute([0, 0, 0, 10, 0, 0], 2);
        assert.isAtLeast(out.length / 3 - 1, 16, "a straight route is drawn as at least sixteen pieces");
        assert.deepEqual(out.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(out.slice(-3), [10, 0, 0]);
        // the middle point is the highest, at the lift, and the route never leaves the x-z plane
        const middle = out.length / 3 / 2;
        assert.closeTo(out[Math.floor(middle) * 3 + 2], 2, 1e-9);
        for (let i = 0; i < out.length; i += 3) {
            assert.strictEqual(out[i + 1], 0);
            assert.isAtLeast(out[i + 2], 0);
            assert.isAtMost(out[i + 2], 2 + 1e-9);
        }

        // a bent route keeps its corners and is raised by how far along it each point is
        const bent = liftRoute([0, 0, 0, 0, 4, 0, 4, 4, 0], 1);
        assert.include(bent.join(","), "0,4,1", "the corner, halfway along by length, is raised by the whole lift");
        assert.deepEqual(liftRoute([0, 0, 0, 1, 0, 0], 0), [0, 0, 0, 1, 0, 0], "no lift is the route itself");
    });

    it("keeps only the interior points outside both end nodes", () => {
        const route = [0, 0, 0, 0.5, 0, 0, 2, 0, 0, 3.5, 0, 0, 4, 0, 0];
        assert.deepEqual(interiorOutside(route, 1, 1), [2, 0, 0]);
        assert.deepEqual(interiorOutside(route, 0.1, 0.1), [0.5, 0, 0, 2, 0, 0, 3.5, 0, 0]);
    });

    it("draws a curve through midpoints as an elliptical quarter round one right-angled bend", () => {
        // Cytoscape desktop's curved edge through one handle: from (1, 0) round the bend at the origin to (0, 1)
        const out = curveThroughMidpoints([1, 0, 0, 0, 0, 0, 0, 1, 0]);
        assert.deepEqual(out.slice(0, 3), [1, 0, 0]);
        assert.deepEqual(out.slice(-3), [0, 1, 0]);
        // every point lies on the unit circle round (1, 1), so the curve never reaches the bend
        for (let i = 0; i < out.length; i += 3) {
            assert.closeTo(Math.hypot(out[i] - 1, out[i + 1] - 1), 1, 3e-4);
        }
    });

    it("draws a curve through its bends as control points: a quadratic through one, a cubic through two", () => {
        // vis-network's smooth edge: quadraticCurveTo from (0, 0) via (1, 2) to (2, 0), whose middle is at (1, 1)
        const quad = bezierThroughControls([0, 0, 0, 1, 2, 0, 2, 0, 0]);
        assert.deepEqual(quad.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(quad.slice(-3), [2, 0, 0]);
        const mid = quad.length / 3 / 2 - 0.5;
        assert.closeTo(quad[3 * mid], 1, 1e-9);
        assert.closeTo(quad[3 * mid + 1], 1, 1e-9);
        // bezierCurveTo via (0, 1) and (1, 1) to (1, 0): its middle is at (0.5, 0.75)
        const cubic = bezierThroughControls([0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0]);
        assert.closeTo(cubic[3 * mid], 0.5, 1e-9);
        assert.closeTo(cubic[3 * mid + 1], 0.75, 1e-9);
        // no bends: the line itself
        assert.deepEqual(bezierThroughControls([0, 0, 0, 2, 0, 0]), [0, 0, 0, 2, 0, 0]);
    });

    it("draws an arc through its one bend on the circle through the ends and the bend, either way round", () => {
        // ends 8 apart, the bend 2 above their middle: the circle centered (4, -3), radius 5
        for (const sign of [1, -1]) {
            const arc = arcThroughBend([0, 0, 0, 4, 2 * sign, 0, 8, 0, 0]) ?? [];
            assert.isAbove(arc.length / 3, 3);
            assert.deepEqual(arc.slice(0, 3), [0, 0, 0]);
            assert.deepEqual(arc.slice(-3), [8, 0, 0]);
            for (let i = 0; i < arc.length; i += 3) {
                assert.closeTo(Math.hypot(arc[i] - 4, arc[i + 1] + 3 * sign), 5, 1e-9);
                assert.closeTo(arc[i + 1] * sign, Math.abs(arc[i + 1]), 1e-12);
            }
        }
        // a bend past half a circle: the arc goes round the far side, through it
        const big = arcThroughBend([0, 0, 0, 4, 8, 0, 8, 0, 0]) ?? [];
        assert.closeTo(Math.max(...big.filter((_, i) => i % 3 === 1)), 8, 1e-9);
        assert.isBelow(Math.min(...big.filter((_, i) => i % 3 === 0)), 0);
        // no arc through a bend on the line, or through other than one bend
        assert.isNull(arcThroughBend([0, 0, 0, 4, 0, 0, 8, 0, 0]));
        assert.isNull(arcThroughBend([0, 0, 0, 2, 1, 0, 6, 1, 0, 8, 0, 0]));
    });

    it("draws a curve through midpoints through the middle of each segment between two bends", () => {
        // Cytoscape desktop's self-loop: out of the node to the left, round the handles left of and above it, back in
        const flat = [-1, 0, 0, -3, 0, 0, 0, 3, 0, 0, 1, 0];
        const out = curveThroughMidpoints(flat);
        const pts = Array.from({ length: out.length / 3 }, (_, i) => [out[3 * i], out[3 * i + 1]]);
        assert.deepEqual(pts[0], [-1, 0]);
        assert.deepEqual(pts.at(-1), [0, 1]);
        // the middle of the two bends is on the curve, the bends themselves are not
        assert.isTrue(pts.some(([x, y]) => Math.hypot(x + 1.5, y - 1.5) < 1e-9));
        for (const [bx, by] of [
            [-3, 0],
            [0, 3],
        ]) {
            assert.isAbove(Math.min(...pts.map(([x, y]) => Math.hypot(x - bx, y - by))), 0.5);
        }
        // it leaves each end along its first and last segments
        assert.closeTo(pts[1][1], 0, 0.05);
        assert.isBelow(pts[1][0], -1);
        // a polyline with no interior point is unchanged
        assert.deepEqual(curveThroughMidpoints([0, 0, 0, 1, 1, 1]), [0, 0, 0, 1, 1, 1]);
    });

    it("draws an arc of the circle through both centers, bowing to the left, as Gephi curves an edge", () => {
        // Gephi's arc curveness 1.2: a radius of the distance over 1.2, so the arc bows a sixth of the distance
        const out = centerArc(at(0, 0, 0), at(12, 0, 4), 1 / 1.2);
        const pts = Array.from({ length: out.length / 3 }, (_, i) => [out[3 * i], out[3 * i + 1], out[3 * i + 2]]);
        assert.deepEqual(pts[0], [0, 0, 0]);
        assert.deepEqual(pts.at(-1), [12, 0, 4]);
        // the circle's center is below the chord's middle, at 8 (the radius 10, half the chord 6)
        for (const [x, y] of pts) {
            assert.closeTo(Math.hypot(x - 6, y + 8), 10, 1e-9);
            assert.isAtLeast(y, -1e-9);
        }
        assert.closeTo(Math.max(...pts.map(([, y]) => y)), 2, 0.01);
        // the other way round bows to the other side
        const back = centerArc(at(12, 0, 0), at(0, 0, 0), 1 / 1.2);
        assert.isBelow(Math.min(...back.filter((_, i) => i % 3 === 1)), -1.9);
        // centers that meet are joined straight
        assert.deepEqual(centerArc(at(1, 1, 0), at(1, 1, 5), 1), [1, 1, 0, 1, 1, 5]);
    });

    it("leaves a round node at its radius and a box where the ray crosses its side", () => {
        assert.strictEqual(surfaceReach(at(1, 0), at(9, 9, 9), 2), 2);
        assert.strictEqual(surfaceReach(at(0, -1), at(3, 1, 1), null), 1);
        assert.closeTo(surfaceReach(at(Math.SQRT1_2, Math.SQRT1_2), at(1, 2, 1), null), Math.SQRT2, 1e-12);
    });

    it("draws a fanned arc with as many pieces as it bends, 7.5 degrees a piece", () => {
        // a quarter turn: each end 45 degrees off the chord, so the bow is a quarter of the chord
        assert.strictEqual(fanArcPieces(8, 2), 12);
        // shallower arcs take fewer pieces, the shallowest two so the bowed middle is a point
        assert.strictEqual(fanArcPieces(30, 2), 4);
        assert.strictEqual(fanArcPieces(1000, 0.01), 2);
        // a bow far wider than its chord turns almost a half turn, and takes at most 24
        assert.strictEqual(fanArcPieces(1, 10), 24);
        assert.strictEqual(fanArcPieces(1, 1000), 24);
        // the sign of the bow is the side, not the bend
        assert.strictEqual(fanArcPieces(30, -2), fanArcPieces(30, 2));

        const arc = fanArc(at(0, 0), at(30, 0), at(0, 0), at(30, 0), 2);
        assert.strictEqual(arc.length, 3 * (4 + 1));
        // it still starts and ends on the centers and bows to the middle
        assert.deepEqual(arc.slice(0, 3), [0, 0, 0]);
        assert.deepEqual(arc.slice(-3), [30, 0, 0]);
        assert.closeTo(arc[3 * 2 + 1], 2, 1e-9);
    });

    it("fans only curved edges: evenly with no straight sibling, else alternating out from the line", () => {
        const slots = (curved: boolean[]): number[] => curved.map((_, rank) => fanSlot(curved, rank));
        assert.deepEqual(slots([false, false, false]), [0, 0, 0]);
        assert.deepEqual(slots([true, true]), [-0.5, 0.5]);
        assert.deepEqual(slots([true, true, true, true]), [-1.5, -0.5, 0.5, 1.5]);
        // the middle of an odd bundle drawn straight (Cytoscape.js)
        assert.deepEqual(slots([true, true, false, true, true]), [-2, -1, 0, 1, 2]);
        // the first edge drawn straight (Cytoscape desktop)
        assert.deepEqual(slots([false, true, true, true]), [0, -1, 1, -2]);
    });

    it("reads a port as one x,y pair", () => {
        assert.deepEqual(parsePort("1,-0.5"), [1, -0.5]);
        assert.isNull(parsePort(undefined));
        assert.isNull(parsePort("1,0 0,1"));
        assert.isNull(parsePort("1"));
    });

    it("runs a stored route from each port, or center, through the bends, placing ports and a loop's bends by node size", () => {
        const half = at(2, 1);
        // a port on the middle of the source's top, a bend half way and 4 below, the target's center
        assert.deepEqual(
            fileRoute(
                at(0, 0),
                at(8, 0),
                { bends: [0.5, -0.5], srcPort: [0, 1], dstPort: null, loop: false },
                half,
                half,
            ),
            [0, 1, 0, 4, -4, 0, 8, 0, 0],
        );
        // a node drawn twice as wide keeps the port on the middle of its right side
        assert.deepEqual(
            fileRoute(
                at(0, 0),
                at(8, 0),
                { bends: null, srcPort: [1, 0], dstPort: [-1, 0], loop: false },
                at(4, 1),
                half,
            ),
            [4, 0, 0, 6, 0, 0],
        );
        // a self-loop's bends sit around its node: up three heights and either side of its center
        assert.deepEqual(
            fileRoute(
                at(10, 0),
                at(10, 0),
                { bends: [-0.5, 3, 0.5, 3], srcPort: null, dstPort: null, loop: true },
                half,
                half,
            ),
            [10, 0, 0, 9, 3, 0, 11, 3, 0, 10, 0, 0],
        );
    });

    it("draws a stored route from its first point outside the source to its last outside the target, or from its ports", () => {
        // a route from a center at x 0 to one at x 10, both nodes reaching 1 from their centers
        const flat = [0, 0, 0, 0.5, 0, 0, 5, 3, 0, 9.5, 0, 0, 10, 0, 0];
        const outside = (cx: number) => (x: number, y: number) => Math.hypot(x - cx, y) > 1;
        assert.deepEqual(routeEnds(flat, { src: false, dst: false }, outside(0), outside(10)), { first: 2, last: 2 });
        // a port is drawn from wherever it lies
        assert.deepEqual(routeEnds(flat, { src: true, dst: true }, outside(0), outside(10)), { first: 0, last: 4 });
        // nothing outside: a loop whose points all lie inside its node
        assert.isNull(routeEnds([0, 0, 0, 0.5, 0.2, 0, 0, 0, 0], { src: false, dst: false }, outside(0), outside(0)));
    });
});

describe("an arrow cap part-way along a line", () => {
    it("is at the end for position 0, and that fraction of the line back from the end otherwise", () => {
        const line = [at(10, 0), at(0, 0)];
        assert.isNull(pointFromEnd(line, 0));
        assert.deepEqual(pointFromEnd(line, 0.5), { tip: at(5, 0), toward: at(1, 0) });
        assert.deepEqual(pointFromEnd(line, 1), { tip: at(0, 0), toward: at(1, 0) });
    });

    it("walks a bent line by its length, pointing along the piece it lands on", () => {
        // 4 up, then 6 left: half of 10 is 1 along the second piece
        const bent = [at(0, 0), at(0, 4), at(-6, 4)];
        const half = pointFromEnd(bent, 0.5);
        assert.isNotNull(half);
        assert.approximately(half.tip.x, -1, 1e-9);
        assert.approximately(half.tip.y, 4, 1e-9);
        assert.deepEqual(half.toward, at(1, 0));
        assert.isNull(pointFromEnd([at(1, 1), at(1, 1)], 0.5));
    });

    it("reaches a flat ellipse's outline, not its box's corner", () => {
        const diagonal = at(Math.SQRT1_2, Math.SQRT1_2);
        // a circle of radius 2 drawn as a flat ellipse: 2 every way, where its box reaches 2 sqrt 2 on the diagonal
        assert.closeTo(surfaceReach(diagonal, at(2, 2, 0.01), null, true), 2, 1e-12);
        assert.closeTo(surfaceReach(diagonal, at(2, 2, 0.01), null), 2 * Math.SQRT2, 1e-12);
        // an ellipse 4 by 2: its sides along the axes
        assert.closeTo(surfaceReach(at(1, 0), at(2, 1, 0), null, true), 2, 1e-12);
        assert.closeTo(surfaceReach(at(0, -1), at(2, 1, 0), null, true), 1, 1e-12);
    });

    it("leaves a node where an arc crosses its outline, on the curve", () => {
        // a quarter circle of radius 10 around (0, -10) from (0, 0): its pieces cross a node of radius 3 at (0, 0)
        const outside = (x: number, y: number): boolean => Math.hypot(x, y) > 3;
        const inside = at(10 * Math.sin(0.1), 10 * Math.cos(0.1) - 10);
        const out = at(10 * Math.sin(0.5), 10 * Math.cos(0.5) - 10);
        const c = crossingOf(inside, out, outside);
        assert.closeTo(Math.hypot(c.x, c.y), 3, 1e-5);
        // on the segment between the two points, where a line from the center toward the outer one would not be
        const t = (c.x - inside.x) / (out.x - inside.x);
        assert.closeTo(c.y, inside.y + (out.y - inside.y) * t, 1e-9);
        assert.isAbove(Math.abs(c.y / c.x - out.y / out.x), 0.01);
    });

    it("cuts a path back for an end cap along a chord of its own length", () => {
        // a path round three sides of a 10 square, ending at (10, 0): a cap of 4 is cut on its last side
        const path = [at(0, 0), at(0, 10), at(10, 10), at(10, 0)];
        const cut = cutFromEnd(path, 4);
        assert.isNotNull(cut);
        assert.strictEqual(cut?.keep, 2);
        assert.closeTo(cut?.at.x ?? 0, 10, 1e-9);
        assert.closeTo(cut?.at.y ?? 0, 4, 1e-5);
        // a cap longer than the last side reaches back into the one before, still a chord of its length
        const long = cutFromEnd(path, 12);
        assert.strictEqual(long?.keep, 1);
        assert.closeTo(Math.hypot((long?.at.x ?? 0) - 10, long?.at.y ?? 0), 12, 1e-5);
        // a path wholly nearer its end than the cap
        assert.isNull(cutFromEnd([at(0, 0), at(1, 0)], 4));
    });
});

describe("a bent line's points under its end caps", () => {
    const at = (x: number, y: number): { x: number; y: number; z: number } => ({ x, y, z: 0 });

    it("drops a point a hair short of a capped end, so the cap points along the route and not along the stub", () => {
        // a route down to (10, 0.2), then a 0.2-long stub sideways to the outline at (10.2, 0.2)
        const mid = [0, 10, 0, 10, 5, 0, 10, 0.2, 0];
        assert.deepEqual(clearOfCaps(mid, at(0, 12), at(10.2, 0.2), { start: 0, end: 2 }), [0, 10, 0, 10, 5, 0]);
    });

    it("keeps every point at an end without a cap, and points farther than the reach", () => {
        const mid = [1, 0, 0, 5, 1, 0, 9, 0, 0];
        assert.deepEqual(clearOfCaps(mid, at(0, 0), at(10, 0), { start: 0, end: 0 }), mid);
        assert.deepEqual(clearOfCaps(mid, at(0, 0), at(10, 0), { start: 2, end: 0.5 }), [5, 1, 0, 9, 0, 0]);
        assert.deepEqual(clearOfCaps(mid, at(0, 0), at(10, 0), { start: 20, end: 20 }), [], "all under the caps");
    });
});

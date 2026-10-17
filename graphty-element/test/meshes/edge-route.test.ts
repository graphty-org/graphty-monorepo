/**
 * @file The geometry of an edge drawn through bends: reading `line.bends`, placing the bends
 * between the node centers (so they scale and turn with the nodes), rounding corners, and where a
 * segment leaves a node.
 */
import { assert, describe, it } from "vitest";

import {
    bendPoints,
    fanArc,
    fanArcPieces,
    fanSlot,
    fileRoute,
    parseBends,
    parsePort,
    roundCorners,
    routeEnds,
    surfaceReach,
} from "../../src/meshes/edgeRoute";

const at = (x: number, y: number, z = 0): { x: number; y: number; z: number } => ({ x, y, z });

describe("edge route geometry", () => {
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

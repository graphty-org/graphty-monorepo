/**
 * A self-loop drawn as a ring round its node, behind it (vis-network), shows only its arc outside the node, and is
 * judged by that arc against graphty's, which draws only the arc. Each end's outline is a copy of the node made for that
 * end, so the loop is told by the node's id, not by the two copies being one object; and the arc runs either way round
 * (vis-network strokes it clockwise, graphty counterclockwise), which way being the arrowhead's to say (json-vis-synth
 * 55 -> 55: route 0.33 of its length apart, its label read 0.87 along the whole ring).
 */
import { assert, describe, it } from "vitest";

import { routeShape, shownPart } from "./compare-oracle";
import type { PNode, Pt } from "./primitives";

const node = (): PNode => ({
    id: "55",
    cx: 100,
    cy: 100,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: null,
    stroke: null,
    label: null,
});

/** A ring of radius 16 centered 20 px up and right of the node, clockwise on screen from its right. */
const ring: Pt[] = Array.from({ length: 129 }, (_, i): Pt => {
    const a = (2 * Math.PI * i) / 128;
    return [114 + 16 * Math.cos(a), 86 + 16 * Math.sin(a)];
});

describe("a loop's ring behind its node", () => {
    it("shows only its arc outside the node, each end's outline its own copy of the node", () => {
        const shown = shownPart(ring, node(), node());
        assert.isNotNull(shown);
        assert.isBelow(shown?.length ?? 0, ring.length);
        const outside = (q: Pt): boolean => Math.hypot(q[0] - 100, q[1] - 100) >= 20 - 0.01;
        assert.isTrue(shown?.every(outside));
    });

    it("is the same arc whichever way round it is drawn", () => {
        // three quarters of the ring, from its left round its top to its bottom
        const arc = ring.slice(32, 129).reverse();
        const { gap } = routeShape(arc, [...arc].reverse(), undefined, true);
        assert.isBelow(gap, 0.01);
    });
});

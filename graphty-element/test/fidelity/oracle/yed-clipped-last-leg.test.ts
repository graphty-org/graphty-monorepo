/**
 * How the oracle comparison reads a yEd edge whose bends lie on its nodes' borders (gml-synthetic-coverage 27 -> 28,
 * #8189): the line runs along the bottom of each node and then a hair up into the target, where yEd clips it, so its
 * last leg is a fraction of a pixel long and its head hangs below the node pointing up. Each reading comes with the
 * drawing it must still read the old way.
 */
import { assert, describe, it } from "vitest";

import { measureArrow } from "./associate";
import { shownPart } from "./compare-oracle";
import type { PNode, Pt } from "./primitives";

/** yEd's convex head, two curved arms from a fork at (100, 100.8), pointing up, as an outline out along each arm and back. */
function convexHead(): Pt[] {
    const arm = (side: number): Pt[] =>
        Array.from({ length: 9 }, (_, i): Pt => {
            const t = i / 8;
            return [100 + side * 4.2 * t * t, 100.8 + 8.4 * t];
        });
    const out = (pts: Pt[]): Pt[] => [...pts, ...[...pts].reverse()];
    return [...out(arm(-1)), ...out(arm(1))];
}

describe("a head on a last leg clipped to a hair", () => {
    // along the bottom of the node from the left, then 0.02 px up to the end
    const line: Pt[] = [
        [20, 100.02],
        [100, 100.02],
        [100, 100],
    ];

    it("is read along that leg, as yEd aims it", () => {
        const head = measureArrow(convexHead(), line, "target", { filled: false, color: null });
        assert.strictEqual(head.shape, "vee");
        assert.closeTo(head.width, 8.4, 0.1);
    });

    it("is read along the run where the last leg is a pixel or more", () => {
        const long: Pt[] = [
            [20, 102],
            [100, 102],
            [100, 100],
        ];
        // the run up is the line's own direction there: the same head, but now it is not under the end
        const head = measureArrow(convexHead(), long, "target", { filled: false, color: null });
        assert.notStrictEqual(
            head.width,
            measureArrow(convexHead(), line, "target", { filled: false, color: null }).width,
        );
    });

    it("is read along the run where the last step only turns back on it, a rounding of a curve's end", () => {
        // dot-real-depcruise: a Graphviz spline ends 0.0006 px back along itself; its head points on along the run
        const back: Pt[] = [
            [20, 100],
            [100, 100],
            [99.9994, 100],
        ];
        const head: Pt[] = [
            [100, 100],
            [92, 104],
            [92, 96],
        ];
        assert.strictEqual(measureArrow(head, back, "target", { filled: true, color: null }).shape, "triangle");
    });

    it("is read along the run where the head is not symmetric about the leg", () => {
        const lopsided = convexHead().map(([x, y]): Pt => [x < 100 ? x - 3 : x, y]);
        const head = measureArrow(lopsided, line, "target", { filled: false, color: null });
        assert.notStrictEqual(head.shape, "vee");
    });
});

describe("a line along its node's border", () => {
    const box: PNode = {
        id: "v26",
        cx: 100,
        cy: 80,
        w: 80,
        h: 40,
        shape: "rect",
        fill: { color: "#e8eef7", opacity: 1, gradient: null },
        stroke: null,
        label: null,
    };
    // from the node's bottom middle out along its bottom edge and away to the left
    const along = (y: number): Pt[] => [
        [100, y],
        [40, y],
        [0, y],
    ];

    it("is cut where it leaves the border, whichever side of it each drawing rounds", () => {
        const inside = shownPart(along(99.99), box, undefined);
        const outside = shownPart(along(100.01), box, undefined);
        assert.isNotNull(inside);
        assert.isNotNull(outside);
        assert.closeTo(inside?.[0][0] ?? 0, 60, 0.2);
        assert.closeTo(outside?.[0][0] ?? 0, 60, 0.2);
    });

    it("is cut at the border where it crosses it", () => {
        const across: Pt[] = [
            [100, 80],
            [0, 140],
        ];
        const shown = shownPart(across, box, undefined);
        // it leaves the box through its bottom, at y = 100, x = 100 - 20 * 100 / 60
        assert.closeTo(shown?.[0][0] ?? 0, 100 - 2000 / 60, 0.1);
        assert.closeTo(shown?.[0][1] ?? 0, 100, 0.1);
    });
});

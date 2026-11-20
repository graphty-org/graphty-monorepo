/**
 * Two yEd heads of one make at one spot (graphml-synthetic-edges n17 -> n25 under n8 -> n25): yEd draws the first
 * edge's line, its source end's bars, then its target head, and the second edge's line and head over it. The covered
 * head is still its line's, as graphty keeps its own there; it was read as hidden, the line left headless and its route
 * a head short. And a line yEd stops at a notched note's corner, out past the ellipse its box holds, is cut at the
 * boxes on both sides (graphml-libcitygml-mapping n38 -> n14).
 */
import { assert, describe, it } from "vitest";

import { hiddenShapes } from "./associate";
import { onBoxPastEllipse } from "./compare-oracle";
import { boxOfPoints, type PNode, type Prim, type Pt } from "./primitives";

const DARK = { color: "#333333", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };

/**
 * The oracle's primitives, numbered in drawing order.
 * @returns makers of a line, a bar and a filled head
 */
function drawing(): { line: (pts: Pt[]) => Prim; head: (pts: Pt[], color: string) => Prim } {
    let index = 0;
    const base = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 0,
        fill: null,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    return {
        line: (points) => base({ kind: "path", closed: false, stroke: DARK, points }),
        head: (points, color) => base({ fill: { color, opacity: 1, gradient: null }, points }),
    };
}
const HEAD: Pt[] = [
    [225, 480],
    [230, 468],
    [225, 471],
    [220, 468],
];

describe("a yEd head covered by another edge's head of the same make", () => {
    it("stays its line's when its source end's bars come between the line and the head", () => {
        const d = drawing();
        const own = [
            d.line([
                [225, 370],
                [225, 472],
            ]),
            d.line([
                [217, 385],
                [233, 385],
            ]),
            d.line([
                [217, 376],
                [233, 376],
            ]),
        ];
        const head = d.head(HEAD, "#333333");
        const other = [
            d.line([
                [40, 196],
                [40, 341.5],
                [225, 341.5],
                [225, 472],
            ]),
            d.head(HEAD, "#3366ff"),
        ];
        const prims = [...own, head, ...other];
        assert.deepEqual(hiddenShapes(prims, [head]), []);
    });
});

describe("a line stopped on its node's box past the ellipse", () => {
    const note: PNode = {
        id: "n14",
        cx: 792.5,
        cy: 450,
        w: 143.8,
        h: 63.2,
        shape: "hexagon",
        fill: null,
        stroke: null,
        label: null,
    };
    it("is so at a notched note's corner, not at its sides' middles or at a round node", () => {
        assert.isTrue(onBoxPastEllipse(note, [723.7, 418.45], 1));
        assert.isFalse(onBoxPastEllipse(note, [792.5, 418.4], 1));
        assert.isFalse(onBoxPastEllipse({ ...note, shape: "ellipse" }, [723.7, 418.45], 1));
        assert.isFalse(onBoxPastEllipse({ ...note, shape: "rect" }, [723.7, 418.45], 1));
    });
});

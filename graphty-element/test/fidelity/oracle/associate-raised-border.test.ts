/**
 * A raised border is its node's, never an arrowhead, and stays a stray, judged against the strips graphty draws: yEd draws a UML class node and a 3D rectangle with
 * Java's `fill3DRect`, a body and then four one-pixel strips round it. In graphml-libcitygml-mapping 67 ends of 57 edges
 * read as arrowed, the file arrowing 9: a line ending at a node takes the strip it stops at as its head.
 */
import { assert, describe, it } from "vitest";

import { associate, foldRaisedBorders } from "./associate";
import { boxOfPoints, type Prim, type PScene, type Pt } from "./primitives";

/**
 * A filled, unstroked rectangle.
 * @param index - its document order
 * @param x - its left
 * @param y - its top
 * @param w - its width
 * @param h - its height
 * @param color - its fill
 * @returns the primitive
 */
function rect(index: number, x: number, y: number, w: number, h: number, color = "#ffcc00"): Prim {
    const points: Pt[] = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
    ];
    return {
        index,
        tag: "rect",
        kind: "shape",
        box: boxOfPoints(points),
        points,
        closed: true,
        corners: 4,
        fill: { color, opacity: 1, gradient: null },
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
    };
}

/** The node CityObject of graphml-libcitygml-mapping, as yEd draws it at the sample's own numbers, from an index. */
const raised = (from: number): Prim[] => [
    rect(from, 569, 82, 154, 26),
    rect(from + 1, 568, 81, 1, 28, "#ffff00"),
    rect(from + 2, 569, 81, 154, 1, "#ffff00"),
    rect(from + 3, 569, 108, 155, 1, "#b28e00"),
    rect(from + 4, 723, 81, 1, 27, "#b28e00"),
];

describe("a raised border", () => {
    it("is folded into its body, which grows to the size the file gives", () => {
        const [body, ...rest] = foldRaisedBorders(raised(0));
        assert.deepEqual(rest, []);
        assert.deepEqual(body.box, { x0: 568, y0: 81, x1: 724, y1: 109 });
        assert.strictEqual(body.fill?.color, "#ffcc00");
    });

    it("is folded into a body drawn under it at its own size, before the node's label", () => {
        // gml-synthetic-coverage v10: an 80 x 40 body, then the label, then the strips along the body's edge
        const label = { ...rect(1, 0, 75, 20, 10), kind: "text" as const, fill: null };
        const strips = [
            rect(2, -40, 70, 1, 40, "#484848"),
            rect(3, -39, 70, 78, 1, "#484848"),
            rect(4, -39, 109, 79, 1, "#232323"),
            rect(5, 39, 70, 1, 39, "#232323"),
        ];
        const body = rect(0, -40, 70, 80, 40, "#333333");
        assert.deepEqual(foldRaisedBorders([body, label, ...strips]), [body, label]);
        // strips round no body stay what they are
        assert.deepEqual(foldRaisedBorders([label, ...strips]), [label, ...strips]);
    });

    it("leaves what only looks like one", () => {
        const [body, left, top, bottom, right] = raised(0);
        // a strip missing, or a frame that does not touch the body all round, is no raised border
        assert.lengthOf(foldRaisedBorders([body, left, top, bottom]), 4);
        const astray = [body, left, top, bottom, rect(4, 730, 81, 1, 27)];
        assert.deepEqual(foldRaisedBorders(astray), astray);
        // a stroked strip is a line's cap
        const stroked = [
            body,
            left,
            top,
            bottom,
            { ...right, stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" as const } },
        ];
        assert.deepEqual(foldRaisedBorders(stroked), stroked);
    });

    it("gives no line an arrowhead and keeps its strips as strays", () => {
        const line: Prim = {
            ...rect(5, 646, 200, 0, 0),
            tag: "path",
            kind: "path",
            closed: false,
            corners: 0,
            fill: null,
            stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            points: [
                [646, 300],
                [646, 109],
            ],
            box: boxOfPoints([
                [646, 300],
                [646, 109],
            ]),
        };
        const guide: PScene = {
            side: "graphty",
            width: 1200,
            height: 900,
            background: null,
            nodes: [],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const { scene } = associate([...raised(0), line], 1200, 900, guide);
        assert.deepEqual(
            scene.edges.flatMap((e) => e.arrows),
            [],
        );
        assert.lengthOf(
            scene.strays.filter((s) => s.fill === "#ffff00" || s.fill === "#b28e00"),
            4,
        );
    });
});

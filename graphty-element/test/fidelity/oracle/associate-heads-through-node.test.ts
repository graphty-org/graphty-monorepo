/**
 * A long arrowhead drawn alone across a node is no head of the line leaving that node's far side. Cytoscape desktop
 * stops a line at its heads' bases, so between two nodes nearer than its heads' lengths it draws only the heads; on
 * cx-syn-mappings 189->192 its 68 px half arrow runs from 189's outline back through 192 and past it, where 192->201's
 * line starts. That head was read as 192->201's source head, and the line's route extended back through 192 to its tip.
 */
import { assert, describe, it } from "vitest";

import { arrowheadEdge, runsThroughNode } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type Pt } from "./primitives";

const node = (id: string, cx: number, cy: number, w: number, h: number): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const shape = (points: Pt[]): Prim => ({
    index: 9,
    tag: "path",
    kind: "shape",
    box: boxOfPoints(points),
    points,
    closed: true,
    corners: 0,
    fill: { color: "#e41a1c", opacity: 1, gradient: null },
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
});
/** As Cytoscape desktop drew them on cx-syn-mappings, in the oracle's px. */
const NODES = [node("189", 357, 163, 19, 33), node("192", 429, 165, 36, 15), node("201", 742, 137, 38, 34)];
const LINE: PEdge = {
    id: "192->201#g0",
    source: "192",
    target: "201",
    points: [
        [444.3, 163.9],
        [718.1, 139.6],
    ],
    stroke: { color: "#99a1ad", opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
};

describe("an arrowhead drawn across a node", () => {
    it("is no head of the line leaving the node's far side", () => {
        // 189->192's source head: its tip on 189's outline, its barb running back through 192 and past it
        const half: Pt[] = [
            [383, 170],
            [460, 237],
            [469, 237],
            [408, 176],
            [408, 170],
            [383, 170],
        ];
        assert.isNull(arrowheadEdge(shape(half), [LINE], NODES));
    });

    it("still caps the line whose end it reaches, short of the node", () => {
        const head: Pt[] = [
            [444.3, 163.9],
            [454, 159],
            [455, 167],
            [444.3, 163.9],
        ];
        const best = arrowheadEdge(shape(head), [LINE], NODES);
        assert.strictEqual(best?.e.id, "192->201#g0");
        assert.strictEqual(best?.end, "source");
    });

    it("still caps a line running back between two overlapping nodes, its head over the other node", () => {
        // cx-radiation-bibliography 164->169: Cytoscape desktop aims the line from 164's outline to 169's, which cross
        const nodes = [node("164", 485.5, 653.5, 52.9, 12.5), node("169", 527, 649.5, 53.3, 12.5)];
        const line: PEdge = {
            ...LINE,
            id: "164->169#g0",
            source: "164",
            target: "169",
            points: [
                [511.9, 651],
                [504.2, 651.7],
            ],
        };
        const head: Pt[] = [
            [511.9, 651],
            [517.2, 648.6],
            [517.6, 653.4],
            [511.9, 651],
        ];
        assert.strictEqual(arrowheadEdge(shape(head), [line], nodes)?.end, "source");
    });

    it("sits on a node smaller than itself when centered on it, not through it", () => {
        // graphml-stm32-func n70->n10: yEd centers a 2.7 px circle on a 0.6 px junction node, the line ending on it
        const n70 = node("n70", 946.2, 484.2, 0.63, 0.62);
        const line: PEdge = {
            ...LINE,
            id: "n70->n10#g0",
            source: "n70",
            target: "n10",
            points: [
                [945.9, 485.5],
                [945.8, 555],
            ],
        };
        const circle: Pt[] = Array.from({ length: 24 }, (_, i): Pt => {
            const a = (i / 24) * 2 * Math.PI;
            return [945.9 + 1.345 * Math.sin(a), 484.19 - 1.345 * Math.cos(a)];
        });
        assert.isFalse(runsThroughNode(circle, line, "source", n70));
        // the same circle moved off the node, past its far side, still runs through it
        assert.isTrue(
            runsThroughNode(
                circle.map(([x, y]): Pt => [x, y - 2]),
                line,
                "source",
                n70,
            ),
        );
    });
});

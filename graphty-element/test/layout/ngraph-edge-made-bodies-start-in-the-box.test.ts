/**
 * @file Unseeded, a node whose edge arrives before its own row starts in the force layout's growing
 * start box, like a node that arrives on its own (issue #9413).
 *
 * The edge made the node's body first, and ngraph put it within half a spring length of the middle,
 * or beside its other end, put there the same way. When the row arrived, the body already had a link,
 * which reads as "beside a placed neighbor", so it stayed in that small ball while every other node
 * started spread over the box.
 */
import { assert, describe, it } from "vitest";

import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { fakeEdge, fakeNode } from "../helpers/layout-fakes";

const SPRING = 30;
/** Nodes placed on their own first, so the box is several spring lengths wide. */
const ALONE = 100;
/** Pairs whose edge arrives before either end's row. */
const PAIRS = 20;

describe("an unseeded ngraph layout", () => {
    it("starts a node made by an edge before its row in the start box, not in the middle", () => {
        const layout = new NGraphEngine({ springLength: SPRING });
        let index = 0;
        for (let i = 0; i < ALONE; i++) {
            layout.addNode(fakeNode(`alone${String(i)}`, { index: index++ }));
        }

        const late = Array.from({ length: PAIRS }, (_, i) => [
            fakeNode(`a${String(i)}`, { index: index++ }),
            fakeNode(`b${String(i)}`, { index: index++ }),
        ]);
        for (const [a, b] of late) {
            layout.addEdge(fakeEdge(a, b));
        }

        for (const n of late.flat()) {
            layout.addNode(n);
        }

        // The box's half side once every body is in: a spring length per body along each axis.
        const half = (SPRING * Math.cbrt(ALONE + 2 * PAIRS)) / 2;
        const outsideTheMiddle = late.flat().filter((n) => {
            const p = layout.getNodePosition(n);
            const coords = [p.x, p.y, p.z ?? 0];
            assert.isTrue(
                coords.every((c) => Math.abs(c) <= half),
                `${String(n.id)} is inside the start box`,
            );
            return coords.some((c) => Math.abs(c) > SPRING / 2);
        }).length;

        // Ngraph's own rule left every such node within half a spring length of the middle or
        // beside its other end there; in the box nearly all of them are farther out.
        assert.isAtLeast(outsideTheMiddle, (2 * PAIRS * 3) / 4);
    });
});

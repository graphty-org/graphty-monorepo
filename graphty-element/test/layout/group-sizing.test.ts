/**
 * A group sized by its style (`node.group*`) takes the box Cytoscape.js 3.34.3 gives a compound parent
 * (`updateCompoundBounds`): the members' box at least the minimum size, the growth split by the biases, then padded.
 */
import { assert, describe, it } from "vitest";

import { groupPadding, labelBounds, paddedBox, sizedGroupBox } from "../../src/layout/groupSizing";

// a members' box 40 wide and 20 tall, centered on the origin
const MIN = [-20, -10, 0];
const MAX = [20, 10, 0];

describe("a group sized by its style", () => {
    it("pads the members' box by a length, or by a fraction of the side it names", () => {
        assert.strictEqual(groupPadding({ padding: 10 }, 40, 20), 10);
        assert.strictEqual(groupPadding({}, 40, 20), 0);
        assert.strictEqual(groupPadding({ paddingRatio: 0.2 }, 40, 20), 8);
        assert.strictEqual(groupPadding({ paddingRatio: 0.2, paddingOf: "height" }, 40, 20), 4);
        assert.strictEqual(groupPadding({ paddingRatio: 0.2, paddingOf: "average" }, 40, 20), 6);
        assert.strictEqual(groupPadding({ paddingRatio: 0.2, paddingOf: "min" }, 40, 20), 4);
        assert.strictEqual(groupPadding({ paddingRatio: 0.2, paddingOf: "max" }, 40, 20), 8);
        // a ratio wins over a length, and a side of no size gives none
        assert.strictEqual(groupPadding({ padding: 10, paddingRatio: 0.2, paddingOf: "average" }, 40, 0), 0);
    });

    it("grows the members' box to its minimum size, both ways alike unless a bias says otherwise", () => {
        const { box, pad } = sizedGroupBox(MIN, MAX, { padding: 10, minWidth: 80 });
        assert.strictEqual(pad, 10);
        assert.deepEqual(box.center, { x: 0, y: 0, z: 0 });
        assert.deepEqual(box.half, { x: 50, y: 20, z: 10 });
        // all of the added width on the left
        const left = sizedGroupBox(MIN, MAX, { minWidth: 80, minWidthBiasLeft: 1 }).box;
        assert.deepEqual([left.center.x - left.half.x, left.center.x + left.half.x], [-60, 20]);
        // all of the added height on top, which is up the screen
        const top = sizedGroupBox(MIN, MAX, { minHeight: 64, minHeightBiasTop: 1 }).box;
        assert.deepEqual([top.center.y - top.half.y, top.center.y + top.half.y], [-10, 54]);
        // a box already larger than its minimum is left as it is
        assert.deepEqual(sizedGroupBox(MIN, MAX, { minWidth: 10 }).box.half, { x: 20, y: 10, z: 0 });
    });

    it("pads an unsized group by the margin it is given", () => {
        assert.deepEqual(paddedBox(MIN, MAX, 3), { center: { x: 0, y: 0, z: 0 }, half: { x: 23, y: 13, z: 3 } });
    });

    it("bounds a member's label as Cytoscape.js does: the font size tall from the side touching its node, plus 2", () => {
        // words drawn in a line box 14 tall for a 10 px font; y runs up, the node centered at y = 0
        const below = labelBounds({ x0: -12, x1: 12, y0: -21, y1: -7 }, 0, 10, 1);
        assert.deepEqual(below, { x0: -14, x1: 14, y0: -19, y1: -5 });
        const above = labelBounds({ x0: -12, x1: 12, y0: 7, y1: 21 }, 0, 10, 1);
        assert.deepEqual(above, { x0: -14, x1: 14, y0: 5, y1: 19 });
        const across = labelBounds({ x0: -12, x1: 12, y0: -7, y1: 7 }, 0, 10, 1);
        assert.deepEqual(across, { x0: -14, x1: 14, y0: -7, y1: 7 });
    });

    it("grows a label's bounds by 2 of its font's pixels, not 2 of the plane's units", () => {
        // a 10 px font drawn 1 unit tall: a font pixel is a tenth of a unit, the margin a fifth
        const box = labelBounds({ x0: -1.2, x1: 1.2, y0: -2.1, y1: -0.7 }, 0, 1, 0.1);
        assert.closeTo(box.x0, -1.4, 1e-9);
        assert.closeTo(box.x1, 1.4, 1e-9);
        assert.closeTo(box.y0, -1.9, 1e-9);
        assert.closeTo(box.y1, -0.5, 1e-9);
    });
});

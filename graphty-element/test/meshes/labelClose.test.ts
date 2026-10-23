/**
 * @file The close button's geometry on a label's canvas: where the x sits, the room it keeps from
 * the words, and the hit area a click is tested against.
 */

import { assert, describe, it } from "vitest";

import { closeGlyphRect, closeGlyphSize, closeHitFractions, closeReserve, inRect } from "../../src/meshes/labelClose";

const PANEL = { x: 2, y: 2, width: 300, height: 80 };

describe("the close button's geometry", () => {
    it("sits inside the panel's top-right corner, inside its padding", () => {
        const glyph = closeGlyphRect(PANEL, 48, 20, 0);

        assert.closeTo(glyph.x + glyph.width, PANEL.x + PANEL.width - 20, 1e-9, "inside the right padding");
        assert.closeTo(glyph.y, PANEL.y + 20, 1e-9, "inside the top padding");
        assert.strictEqual(glyph.width, closeGlyphSize(48));
    });

    it("keeps clear of a rounded corner larger than the padding", () => {
        const square = closeGlyphRect(PANEL, 48, 0, 0);
        const rounded = closeGlyphRect(PANEL, 48, 0, 60);

        assert.isAbove(rounded.y, square.y, "moved down");
        assert.isBelow(rounded.x, square.x, "moved left");
    });

    it("keeps more room from the words than the x is wide", () => {
        assert.isAbove(closeReserve(48), closeGlyphSize(48));
    });

    it("reaches a little past the x, and never past the canvas", () => {
        const canvas = { width: 304, height: 84 };
        const glyph = closeGlyphRect(PANEL, 48, 0, 0);
        const hit = closeHitFractions(glyph, canvas);

        assert.isBelow(hit.left, glyph.x / canvas.width);
        assert.isAbove(hit.bottom, (glyph.y + glyph.height) / canvas.height);
        assert.isAtMost(hit.right, 1);
        assert.isAtLeast(hit.top, 0);
    });

    it("tests a point against a rectangle, edges included", () => {
        const rect = { x: 10, y: 10, width: 5, height: 5 };

        assert.isTrue(inRect(rect, 10, 15));
        assert.isFalse(inRect(rect, 9.9, 12));
    });
});

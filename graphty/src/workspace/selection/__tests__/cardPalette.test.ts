import { PALETTE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { DEFAULT_BRANCH_PALETTE } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { cardPalette } from "../cardPalette";

describe("cardPalette", () => {
    it("keeps the six branch colors first and adds the largest palette's others, none twice", () => {
        const colors = cardPalette(PALETTE_DESCRIPTORS);
        const kelly = PALETTE_DESCRIPTORS.find((palette) => palette.id === "kelly")?.colors ?? [];
        assert.deepEqual(colors.slice(0, DEFAULT_BRANCH_PALETTE.length), [...DEFAULT_BRANCH_PALETTE]);
        assert.isAbove(colors.length, 6);
        assert.strictEqual(new Set(colors.map((color) => color.toUpperCase())).size, colors.length);
        for (const color of colors.slice(DEFAULT_BRANCH_PALETTE.length)) {
            assert.include(kelly, color);
        }
    });

    it("leads the added colors with those that stand apart from every color before them", () => {
        const colors = cardPalette(PALETTE_DESCRIPTORS);
        // Kelly's vivid green sits close to the six's green, so it comes after those that do not.
        assert.isBelow(colors.indexOf("#BE0032"), colors.indexOf("#008856"));
        assert.isAbove(colors.length, 20);
    });
});
